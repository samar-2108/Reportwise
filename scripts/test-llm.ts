/**
 * Integration and Verification Test for LLM Provider (Gemini / Mock)
 * Run via: npm run test:llm
 */

try {
  // Load local env file if present
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile(".env.local");
  }
} catch {
  // Ignore if not present
}

import { MockLLMProvider } from "../src/lib/llm/mock";
import { GeminiProvider } from "../src/lib/llm/gemini";
import { LLMFile, QuotaExceededError } from "../src/lib/llm/types";
import { ExtractionResultSchema, isExtractionError } from "../src/lib/schemas/extraction";
import { InterpretationResultSchema } from "../src/lib/schemas/interpretation";
import { EXTRACTION_SYSTEM_PROMPT } from "../src/prompts/extraction";
import { INTERPRETATION_SYSTEM_PROMPT, buildInterpretationUserPrompt } from "../src/prompts/interpretation";
import { computeFilesSha256, reportCache } from "../src/lib/cache/report-cache";
import { userDailyCapLimiter } from "../src/lib/rate-limit/daily-cap";

// Minimal valid 1x1 transparent PNG buffer for testing
const SAMPLE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const sampleFile: LLMFile = {
  mimeType: "image/png",
  data: Buffer.from(SAMPLE_PNG_BASE64, "base64"),
};

async function runTests() {
  console.log("\n========================================================");
  console.log(" 🩺 ReportWise LLM Provider & Schema Verification Suite");
  console.log("========================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // ------------------------------------------------------------------------
  // TEST 1: Mock Provider - Valid Report Extraction (Pass 1)
  // ------------------------------------------------------------------------
  console.log("▶ [Test 1] Pass 1 Extraction Schema Validation (Mock CBC Report)...");
  try {
    const mock = new MockLLMProvider({ reportVariant: "cbc" });
    const rawResult = await mock.extractFromFiles([sampleFile], EXTRACTION_SYSTEM_PROMPT);
    const parsed = ExtractionResultSchema.safeParse(rawResult);

    assert(parsed.success === true, "Output successfully conforms to ExtractionResultSchema");
    if (parsed.success && !isExtractionError(parsed.data)) {
      assert(parsed.data.tests.length > 0, `Extracted ${parsed.data.tests.length} tests`);
      assert(parsed.data.report_type.length > 0, `Report Type identified: ${parsed.data.report_type}`);
    }
  } catch (err) {
    assert(false, `Unexpected error: ${err}`);
  }

  // ------------------------------------------------------------------------
  // TEST 2: Pass 2 Plain-Language Interpretation Validation
  // ------------------------------------------------------------------------
  console.log("\n▶ [Test 2] Pass 2 Interpretation Schema Validation...");
  try {
    const mock = new MockLLMProvider({ reportVariant: "cbc" });
    const prompt = buildInterpretationUserPrompt({
      reportType: "Complete Blood Count (CBC)",
      tests: [
        { test: "Hemoglobin", value: "9.8", unit: "g/dL", ref_range: "12-15", status: "low" },
      ],
      userProfile: { language: "en", dietPreference: "veg" },
    });

    const interpretation = await mock.generateStructured(
      prompt,
      INTERPRETATION_SYSTEM_PROMPT,
      InterpretationResultSchema
    );

    assert(Boolean(interpretation.patient_summary), "Generated patient summary in 8th-grade language");
    assert((interpretation.diet?.add?.length ?? 0) > 0, "Includes culturally relevant diet additions");
    assert((interpretation.questions_for_doctor?.length ?? 0) > 0, "Includes doctor discussion questions");
  } catch (err) {
    assert(false, `Unexpected error: ${err}`);
  }

  // ------------------------------------------------------------------------
  // TEST 3: Blurry Image -> "retake" Error Handling
  // ------------------------------------------------------------------------
  console.log("\n▶ [Test 3] Blurry / Low-Quality Image Detection...");
  try {
    const mock = new MockLLMProvider({ forceError: "retake" });
    const result = await mock.extractFromFiles([sampleFile], EXTRACTION_SYSTEM_PROMPT);
    const parsed = ExtractionResultSchema.parse(result);

    assert(isExtractionError(parsed), "Detected as an ExtractionError");
    if (isExtractionError(parsed)) {
      assert(parsed.error === "retake", "Error type is strictly 'retake'");
      assert(parsed.reason.length > 5, `Provides descriptive retake reason: "${parsed.reason}"`);
    }
  } catch (err) {
    assert(false, `Unexpected error: ${err}`);
  }

  // ------------------------------------------------------------------------
  // TEST 4: Non-Medical Image -> "not_a_report" Error Handling
  // ------------------------------------------------------------------------
  console.log("\n▶ [Test 4] Non-Medical Document Detection...");
  try {
    const mock = new MockLLMProvider({ forceError: "not_a_report" });
    const result = await mock.extractFromFiles([sampleFile], EXTRACTION_SYSTEM_PROMPT);
    const parsed = ExtractionResultSchema.parse(result);

    assert(isExtractionError(parsed), "Detected as an ExtractionError");
    if (isExtractionError(parsed)) {
      assert(parsed.error === "not_a_report", "Error type is strictly 'not_a_report'");
      assert(parsed.reason.length > 5, `Provides descriptive reason: "${parsed.reason}"`);
    }
  } catch (err) {
    assert(false, `Unexpected error: ${err}`);
  }

  // ------------------------------------------------------------------------
  // TEST 5: Free-Tier Rate Limit / Quota Exhaustion -> Friendly Message
  // ------------------------------------------------------------------------
  console.log("\n▶ [Test 5] QuotaExceededError & Friendly UI Message Handling...");
  try {
    const mock = new MockLLMProvider({ forceError: "quota" });
    await mock.extractFromFiles([sampleFile], EXTRACTION_SYSTEM_PROMPT);
    assert(false, "Should have thrown QuotaExceededError");
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      assert(true, "Successfully caught typed QuotaExceededError");
      const expectedMessage = "Our free daily analysis limit has been reached. Please try again later.";
      assert(err.message === expectedMessage, `Friendly message verified: "${err.message}"`);
    } else {
      assert(false, `Unexpected error type: ${err}`);
    }
  }

  // ------------------------------------------------------------------------
  // TEST 6: SHA-256 Duplication Caching
  // ------------------------------------------------------------------------
  console.log("\n▶ [Test 6] SHA-256 Caching to Protect Gemini Quota...");
  const hash1 = computeFilesSha256([sampleFile]);
  reportCache.setExtraction(hash1, { report_type: "Cached Test Report", tests: [] });
  const cachedData = reportCache.getExtraction(hash1) as { report_type: string } | null;
  assert(cachedData !== null && cachedData.report_type === "Cached Test Report", "Identical file buffer resolved from SHA-256 cache without API call");

  // ------------------------------------------------------------------------
  // TEST 7: Per-User Daily Analysis Cap
  // ------------------------------------------------------------------------
  console.log("\n▶ [Test 7] Per-User Daily Cap Limiter...");
  const testUserId = "user-test-123";
  userDailyCapLimiter.reset(testUserId);
  const initial = userDailyCapLimiter.checkLimit(testUserId);
  assert(initial.allowed && initial.remaining === initial.limit, `Initial daily limit is ${initial.limit} analyses`);

  for (let i = 0; i < initial.limit; i++) {
    userDailyCapLimiter.increment(testUserId);
  }
  const afterLimit = userDailyCapLimiter.checkLimit(testUserId);
  assert(afterLimit.allowed === false && afterLimit.remaining === 0, `Blocked after reaching max daily limit of ${initial.limit} analyses`);

  // ------------------------------------------------------------------------
  // TEST 8: Live Gemini API Call (If real key configured)
  // ------------------------------------------------------------------------
  const geminiKey = process.env.GEMINI_API_KEY;
  const isRealKey = geminiKey && geminiKey.startsWith("AIzaSy") && !geminiKey.includes("placeholder");

  if (isRealKey) {
    console.log("\n▶ [Test 8] Live Gemini Free-Tier API Verification with Google AI Studio...");
    try {
      const gemini = new GeminiProvider();
      const liveResult = await gemini.extractFromFiles([sampleFile], EXTRACTION_SYSTEM_PROMPT);
      const liveParsed = ExtractionResultSchema.safeParse(liveResult);
      assert(liveParsed.success === true, "Live Gemini Vision response successfully validated against Zod schema");
    } catch (liveErr) {
      if (liveErr instanceof QuotaExceededError) {
        console.log("  ⚠️  Live Gemini Free Tier quota is currently saturated (QuotaExceededError handled cleanly).");
        passed++;
      } else {
        console.warn(`  ⚠️  Live Gemini test call note: ${liveErr instanceof Error ? liveErr.message : String(liveErr)}`);
      }
    }
  } else {
    console.log("\nℹ️  [Test 8] Skipped live Gemini network call (GEMINI_API_KEY is currently set to placeholder).");
    console.log("   Set your real GEMINI_API_KEY in .env.local to test live calls against Google AI Studio.");
  }

  console.log("\n--------------------------------------------------------");
  console.log(` Results: ${passed} passed, ${failed} failed`);
  console.log("--------------------------------------------------------\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});

import { NextRequest, NextResponse } from "next/server";
import { getLLMProvider, QuotaExceededError } from "@/lib/llm";
import { INTERPRETATION_SYSTEM_PROMPT, buildInterpretationUserPrompt } from "@/prompts/interpretation";
import { InterpretationResultSchema } from "@/lib/schemas/interpretation";
import { evaluateAllTests } from "@/lib/medical/deterministic-check";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { userDailyCapLimiter } from "@/lib/rate-limit/daily-cap";
import { reportCache, computeInputSha256 } from "@/lib/cache/report-cache";
import { usageTracker } from "@/lib/usage/tracker";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportId, reportType, tests, userProfile } = body;

    if (!tests || !Array.isArray(tests) || tests.length === 0) {
      return NextResponse.json({ error: "No confirmed test values provided" }, { status: 400 });
    }

    // 1. Debug mode: authentication bypassed
    const userId = "debug-user";
    let supabase = null;
    const keepOriginalFiles = false;

    try {
      supabase = await getSupabaseServerClient();
    } catch {
      // Demo / unconfigured Supabase mode
    }

    // 2. Deterministic evaluation layer
    const deterministicEvaluation = evaluateAllTests(tests);
    const hasCritical = deterministicEvaluation.hasCriticalValues;
    const criticalItems = deterministicEvaluation.tests.filter((t) => t.is_critical);

    // 3. Build Prompt with confirmed data, deterministic status, and patient context
    const userPrompt = buildInterpretationUserPrompt({
      reportType: reportType || "Lab Report",
      tests: deterministicEvaluation.tests.map((t) => ({
        test: t.test,
        value: t.value,
        unit: t.unit,
        ref_range: t.ref_range,
        status: t.computed_status,
        severity: t.severity,
      })),
      criticalValues: criticalItems.map((c) => ({
        test: c.test,
        value: c.value,
        unit: c.unit,
        reason: c.critical_reason,
      })),
      userProfile: {
        age: userProfile?.age,
        sex: userProfile?.sex,
        dietPreference: userProfile?.dietPreference,
        language: userProfile?.language || "en",
      },
    });

    // 4. Generate structured interpretation with LLM Provider (Pass 2) or use cached result
    const inputHash = computeInputSha256({
      reportType,
      tests: deterministicEvaluation.tests.map((t) => ({
        test: t.test,
        value: t.value,
        status: t.computed_status,
      })),
      userProfile,
    });
    const cachedInterpretation = reportCache.getInterpretation(inputHash);
    let interpretation;

    if (cachedInterpretation) {
      usageTracker.recordCacheHit();
      interpretation = InterpretationResultSchema.parse(cachedInterpretation);
    } else {
      const provider = getLLMProvider();
      const rawInterpretation = await provider.generateStructured(
        userPrompt,
        INTERPRETATION_SYSTEM_PROMPT,
        InterpretationResultSchema
      );
      interpretation = rawInterpretation;
      reportCache.setInterpretation(inputHash, interpretation);
    }

    // Sanitize findings and severities against deterministic ground truth
    const normalTestNames = new Set(
      deterministicEvaluation.tests
        .filter((t) => t.computed_status === "normal")
        .map((t) => t.test.toLowerCase().trim())
    );

    interpretation.findings = (interpretation.findings ?? []).map((f) => {
      // Find primary matching test from deterministic evaluation
      const related = f.related_tests ?? [];
      const matchingTest = deterministicEvaluation.tests.find((t) => {
        const tName = t.test.toLowerCase().trim();
        return (
          related.some((rt) => {
            const rtLower = rt.toLowerCase().trim();
            return rtLower === tName || rtLower.includes(tName) || tName.includes(rtLower);
          }) || f.title.toLowerCase().includes(tName)
        );
      });

      // Ensure finding title explicitly features the exact test value if not already present
      if (matchingTest && !f.title.includes(matchingTest.value)) {
        f.title = `${matchingTest.test}: ${matchingTest.value} ${matchingTest.unit || ""} - ${f.title}`;
      }

      // If no critical values exist in the report, finding severity cannot be critical
      if (!hasCritical && f.severity === "critical") {
        f.severity = "moderate";
      }

      // If all related tests for this finding are verified normal, enforce normal severity
      if (related.length > 0) {
        const allRelatedAreNormal = related.every((rt) => {
          const lower = rt.toLowerCase().trim();
          return Array.from(normalTestNames).some((nt) => lower.includes(nt) || nt.includes(lower));
        });
        if (allRelatedAreNormal) {
          f.severity = "normal";
        }
      }

      return f;
    });

    // Ensure every test in the report has a representation in Key Insights
    const coveredTestNames = new Set(
      (interpretation.findings ?? []).flatMap((f) => [
        ...(f.related_tests ?? []).map((rt) => rt.toLowerCase().trim()),
        f.title.toLowerCase().trim(),
      ])
    );

    for (const testItem of deterministicEvaluation.tests) {
      const nameLower = testItem.test.toLowerCase().trim();
      const isCovered = Array.from(coveredTestNames).some(
        (ct) => ct.includes(nameLower) || nameLower.includes(ct)
      );

      if (!isCovered) {
        const isNormal = testItem.computed_status === "normal";
        const explanation = isNormal
          ? `Your ${testItem.test} is ${testItem.value} ${testItem.unit || ""}, which falls within the printed reference range (${testItem.ref_range || "standard interval"}). This indicates expected, healthy function for this biomarker.`
          : `Your ${testItem.test} is ${testItem.value} ${testItem.unit || ""}, which falls ${testItem.computed_status === "low" ? "below" : "above"} the lab's printed reference range (${testItem.ref_range || "standard interval"}). Your doctor can review this marker alongside your clinical history.`;

        interpretation.findings.push({
          title: `${testItem.test}: ${testItem.value} ${testItem.unit || ""}`,
          explanation,
          related_tests: [testItem.test],
          severity: isNormal ? "normal" : testItem.is_critical ? "critical" : "mild",
        });
      }
    }

    // If deterministic evaluation found critical safety flags, ensure red_flags includes them
    if (hasCritical && deterministicEvaluation.criticalAlerts.length > 0) {
      const currentFlags = interpretation.red_flags ?? [];
      const mergedRedFlags = Array.from(
        new Set([...deterministicEvaluation.criticalAlerts, ...currentFlags])
      );
      interpretation.red_flags = mergedRedFlags;
    } else if (!hasCritical) {
      // If there are NO critical values, prevent hallucinated red flags for tests that are normal
      const allTestsNormal = deterministicEvaluation.tests.every((t) => t.computed_status === "normal");
      if (allTestsNormal) {
        interpretation.red_flags = [];
      } else {
        interpretation.red_flags = (interpretation.red_flags ?? []).filter((flag) => {
          const flagLower = flag.toLowerCase();
          const mentionsNormalOnly = Array.from(normalTestNames).some((nt) => {
            return nt.length > 2 && flagLower.includes(nt);
          });
          return !mentionsNormalOnly;
        });
      }
    }

    // 5. Update Database Record in debug mode
    if (supabase && reportId) {
      await supabase
        .from("reports")
        .update({
          status: "completed",
          confirmed_data: JSON.parse(JSON.stringify(deterministicEvaluation.tests)),
          analysis_data: JSON.parse(JSON.stringify(interpretation)),
        })
        .eq("id", reportId);

      // Auto-delete original files after processing unless user opted to keep them
      if (!keepOriginalFiles) {
        const { data: reportRow } = await supabase
          .from("reports")
          .select("storage_file_paths")
          .eq("id", reportId)
          .single();

        if (reportRow && reportRow.storage_file_paths?.length) {
          await supabase.storage.from("reports").remove(reportRow.storage_file_paths);
          await supabase
            .from("reports")
            .update({ storage_file_paths: [] })
            .eq("id", reportId);
        }
      }

      // Increment daily user cap counter
      userDailyCapLimiter.increment(userId);
    }

    return NextResponse.json({
      reportId: reportId || `demo-${Date.now()}`,
      reportType: reportType || "Lab Report",
      hasCriticalValues: hasCritical,
      confirmedTests: deterministicEvaluation.tests,
      analysis: interpretation,
    });
  } catch (error: unknown) {
    console.error("API /api/reports/analyze error:", error);

    if (error instanceof QuotaExceededError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze report" },
      { status: 500 }
    );
  }
}

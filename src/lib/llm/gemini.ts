import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ChatMessageInput, LLMFile, LLMProvider, QuotaExceededError } from "./types";
import { getServerEnv } from "@/lib/env";
import { computeFilesSha256, computeInputSha256, reportCache } from "@/lib/cache/report-cache";
import { usageTracker } from "@/lib/usage/tracker";
import { ExtractionResultSchema } from "@/lib/schemas/extraction";

/**
 * Defensive utility to strip markdown fences (```json ... ```) from model text
 */
export function cleanJsonOutput(raw: string): string {
  let cleaned = raw.trim();
  // Strip leading code fence
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
  // Strip trailing code fence
  cleaned = cleaned.replace(/\s*```$/, "");
  return cleaned.trim();
}

/**
 * Checks if an error is a rate limit, quota exhaustion, or temporary service outage (429 / 503 / RESOURCE_EXHAUSTED / transient network failure)
 */
function isQuotaOrTransientError(error: unknown): boolean {
  if (!error) return false;
  const errStr = String(error).toLowerCase();
  const causeStr = String((error as { cause?: unknown })?.cause || "").toLowerCase();
  const combined = `${errStr} ${causeStr}`;

  const status = (error as { status?: number; code?: number })?.status ||
                 (error as { status?: number; code?: number })?.code;

  return (
    status === 429 ||
    status === 503 ||
    status === 504 ||
    combined.includes("429") ||
    combined.includes("503") ||
    combined.includes("504") ||
    combined.includes("resource_exhausted") ||
    combined.includes("quota exceeded") ||
    combined.includes("rate limit") ||
    combined.includes("overloaded") ||
    combined.includes("fetch failed") ||
    combined.includes("econnreset") ||
    combined.includes("etimedout") ||
    combined.includes("socket hung up") ||
    combined.includes("network error")
  );
}

/**
 * Formats error into a descriptive message extracting underlying network cause if available
 */
function formatErrorMessage(err: unknown): string {
  if (!err) return "Unknown error";
  if (err instanceof Error) {
    const cause = (err as { cause?: Error | unknown })?.cause;
    const causeMsg = cause instanceof Error ? cause.message : cause ? String(cause) : null;
    if (causeMsg && causeMsg !== err.message) {
      return `${err.message} (${causeMsg})`;
    }
    return err.message;
  }
  return String(err);
}

/**
 * Sleep helper for backoff
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class GeminiProvider implements LLMProvider {
  private ai: GoogleGenAI;

  constructor() {
    const env = getServerEnv();
    this.ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }

  /**
   * Execute an API call with 60s timeout, exponential backoff with jitter on 429/503/transient network errors (max 4 retries),
   * and QuotaExceededError conversion.
   */
  private async executeWithRetry<T>(
    operationName: "extraction" | "interpretation",
    fn: () => Promise<T>
  ): Promise<T> {
    const maxRetries = 4;
    const baseDelay = 1500; // 1.5s base backoff

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Enforce 60s timeout using AbortSignal/Promise.race
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`${operationName} request timed out after 60s`)), 60000)
        );

        const result = await Promise.race([fn(), timeoutPromise]);
        usageTracker.recordCall(operationName);
        return result;
      } catch (error: unknown) {
        const isQuota = isQuotaOrTransientError(error);

        if (isQuota && attempt < maxRetries) {
          const jitter = Math.random() * 500;
          const delay = baseDelay * Math.pow(2, attempt) + jitter;
          console.warn(
            `Gemini API transient rate limit / network error encountered (${formatErrorMessage(error)}). Retrying attempt ${attempt + 1}/${maxRetries} in ${Math.round(delay)}ms...`
          );
          await sleep(delay);
          continue;
        }

        if (isQuota) {
          const errString = String(error).toLowerCase();
          if (errString.includes("429") || errString.includes("quota") || errString.includes("resource_exhausted")) {
            usageTracker.recordQuotaExceeded();
            throw new QuotaExceededError();
          }
        }

        // If fetch failed after all retries, format a clear, actionable message
        const formatted = formatErrorMessage(error);
        if (formatted.toLowerCase().includes("fetch failed")) {
          throw new Error(
            `Unable to connect to Google Gemini API (network error: ${formatted}). Please check your internet connection or verify your GEMINI_API_KEY in .env.local.`
          );
        }

        throw error;
      }
    }

    usageTracker.recordQuotaExceeded();
    throw new QuotaExceededError();
  }

  /**
   * PASS 1: Vision-based document extraction
   */
  async extractFromFiles(files: LLMFile[], systemPrompt: string): Promise<unknown> {
    if (files.length === 0) {
      throw new Error("No files provided for extraction");
    }

    // 1. Check SHA-256 cache to prevent duplicate analysis and preserve quota
    const fileHash = computeFilesSha256(files);
    const cached = reportCache.getExtraction(fileHash);
    if (cached) {
      usageTracker.recordCacheHit();
      return cached;
    }

    const env = getServerEnv();
    const model = env.GEMINI_MODEL_EXTRACT;

    // 2. Prepare inline base64 parts for JPG, PNG, WEBP, PDF
    // Multi-page documents or multiple images are provided as multiple inline parts
    const parts: Array<{ inlineData: { mimeType: string; data: string } } | string> = [];

    for (const file of files) {
      parts.push({
        inlineData: {
          mimeType: file.mimeType,
          data: file.data.toString("base64"),
        },
      });
    }

    parts.push("Please transcribe the printed lab test values from the attached report document.");

    // Convert Zod extraction schema to JSON Schema for responseJsonSchema
    const rawJsonSchema = zodToJsonSchema(ExtractionResultSchema) as Record<string, unknown>;
    delete rawJsonSchema["$schema"];

    // 3. Perform generation with retry & timeout
    const callModel = async (userPromptSuffix = "") => {
      const contents = [...parts];
      if (userPromptSuffix) {
        contents.push(userPromptSuffix);
      }

      const response = await this.ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.15, // Low temperature 0.1-0.2 for precise OCR
          responseMimeType: "application/json",
          responseJsonSchema: rawJsonSchema,
        },
      });

      const text = response.text || "";
      const cleaned = cleanJsonOutput(text);
      return JSON.parse(cleaned);
    };

    let parsedResult: unknown;
    try {
      parsedResult = await this.executeWithRetry("extraction", () => callModel());
    } catch (err: unknown) {
      if (err instanceof QuotaExceededError) throw err;
      // Retry once with a "return valid JSON only" reminder
      try {
        parsedResult = await this.executeWithRetry("extraction", () =>
          callModel("\nReminder: Return valid JSON matching the schema only. No markdown fences.")
        );
      } catch (retryErr) {
        if (retryErr instanceof QuotaExceededError) throw retryErr;
        throw new Error(
          `Failed to extract data from medical report: ${formatErrorMessage(retryErr || err)}`
        );
      }
    }

    // Validate with Zod
    const validated = ExtractionResultSchema.safeParse(parsedResult);
    if (!validated.success) {
      // Retry once on schema mismatch
      try {
        const retryResult = await this.executeWithRetry("extraction", () =>
          callModel(
            `\nValidation failed: ${validated.error.issues.map((i) => i.message).join(", ")}. Return valid JSON matching the schema exactly.`
          )
        );
        const secondValidation = ExtractionResultSchema.safeParse(retryResult);
        if (secondValidation.success) {
          reportCache.setExtraction(fileHash, secondValidation.data);
          return secondValidation.data;
        }
      } catch (retryErr) {
        if (retryErr instanceof QuotaExceededError) throw retryErr;
      }
      throw new Error(`Extraction response did not match expected schema: ${validated.error.message}`);
    }

    reportCache.setExtraction(fileHash, validated.data);
    return validated.data;
  }

  /**
   * PASS 2: Structured Plain-Language Interpretation
   */
  async generateStructured<T>(
    input: unknown,
    systemPrompt: string,
    schema: z.ZodType<T>
  ): Promise<T> {
    // 1. Check SHA-256 cache
    const inputHash = computeInputSha256(input);
    const cached = reportCache.getInterpretation<T>(inputHash);
    if (cached) {
      usageTracker.recordCacheHit();
      return cached;
    }

    const env = getServerEnv();
    const model = env.GEMINI_MODEL_INTERPRET;

    const rawJsonSchema = zodToJsonSchema(schema) as Record<string, unknown>;
    delete rawJsonSchema["$schema"];

    const promptText = typeof input === "string" ? input : JSON.stringify(input, null, 2);

    const callModel = async (suffix = "") => {
      const response = await this.ai.models.generateContent({
        model,
        contents: [promptText + (suffix ? `\n${suffix}` : "")],
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.3, // Temperature 0.3 for empathetic, clear interpretation
          responseMimeType: "application/json",
          responseJsonSchema: rawJsonSchema,
        },
      });

      const text = response.text || "";
      const cleaned = cleanJsonOutput(text);
      return JSON.parse(cleaned);
    };

    let parsedResult: unknown;
    try {
      parsedResult = await this.executeWithRetry("interpretation", () => callModel());
    } catch (err: unknown) {
      if (err instanceof QuotaExceededError) throw err;
      // Retry once with "return valid JSON only" reminder
      try {
        parsedResult = await this.executeWithRetry("interpretation", () =>
          callModel("Reminder: Return valid JSON matching the schema only. No markdown fences.")
        );
      } catch (retryErr) {
        if (retryErr instanceof QuotaExceededError) throw retryErr;
        throw new Error(
          `Failed to generate report interpretation: ${formatErrorMessage(retryErr || err)}`
        );
      }
    }

    // Validate with Zod
    const validated = schema.safeParse(parsedResult);
    if (!validated.success) {
      // Retry once on schema failure
      try {
        const retryResult = await this.executeWithRetry("interpretation", () =>
          callModel(
            `Validation error: ${validated.error.issues.map((i) => i.message).join(", ")}. Return valid JSON matching the schema only.`
          )
        );
        const secondValidation = schema.safeParse(retryResult);
        if (secondValidation.success) {
          reportCache.setInterpretation(inputHash, secondValidation.data);
          return secondValidation.data;
        }
      } catch (retryErr) {
        if (retryErr instanceof QuotaExceededError) throw retryErr;
      }
      throw new Error(`Interpretation response failed schema validation: ${validated.error.message}`);
    }

    reportCache.setInterpretation(inputHash, validated.data);
    return validated.data;
  }

  /**
   * CHAT: Conversational Healthcare Q&A
   */
  async generateChatResponse(
    messages: ChatMessageInput[],
    systemPrompt: string
  ): Promise<string> {
    const env = getServerEnv();
    const model = env.GEMINI_MODEL_INTERPRET;

    const contents = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    if (contents.length === 0) {
      return "Hello! How can I help you understand your medical reports or answer health questions today?";
    }

    const callModel = async () => {
      const response = await this.ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.3,
        },
      });

      return response.text?.trim() || "";
    };

    try {
      const text = await this.executeWithRetry("interpretation", () => callModel());
      return text;
    } catch (err: unknown) {
      if (err instanceof QuotaExceededError) throw err;
      throw new Error(`Failed to generate chat response: ${formatErrorMessage(err)}`);
    }
  }
}

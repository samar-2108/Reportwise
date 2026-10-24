import { z } from "zod";
import { LLMFile, LLMProvider, QuotaExceededError } from "./types";
import {
  MOCK_EXTRACTION_CBC,
  MOCK_EXTRACTION_CRITICAL,
  MOCK_EXTRACTION_ERROR_NOT_A_REPORT,
  MOCK_EXTRACTION_ERROR_RETAKE,
  MOCK_EXTRACTION_LIPID,
  MOCK_INTERPRETATION_CBC,
  MOCK_INTERPRETATION_CRITICAL,
} from "@/lib/fixtures/sample-reports";

export interface MockOptions {
  forceError?: "retake" | "not_a_report" | "quota" | null;
  reportVariant?: "cbc" | "lipid" | "critical";
}

export class MockLLMProvider implements LLMProvider {
  private options: MockOptions;

  constructor(options: MockOptions = {}) {
    this.options = options;
  }

  public setOptions(options: MockOptions): void {
    this.options = { ...this.options, ...options };
  }

  async extractFromFiles(files: LLMFile[], systemPrompt?: string): Promise<unknown> {
    void systemPrompt;
    if (this.options.forceError === "quota") {
      throw new QuotaExceededError();
    }
    if (this.options.forceError === "retake") {
      return MOCK_EXTRACTION_ERROR_RETAKE;
    }
    if (this.options.forceError === "not_a_report") {
      return MOCK_EXTRACTION_ERROR_NOT_A_REPORT;
    }

    // Inspect files or fallback to variant
    const firstFileName = files[0]?.mimeType || "";
    if (firstFileName.includes("pdf")) {
      return MOCK_EXTRACTION_LIPID;
    }

    if (this.options.reportVariant === "critical") {
      return MOCK_EXTRACTION_CRITICAL;
    }
    if (this.options.reportVariant === "lipid") {
      return MOCK_EXTRACTION_LIPID;
    }

    return MOCK_EXTRACTION_CBC;
  }

  async generateStructured<T>(
    input: unknown,
    _systemPrompt: string,
    schema: z.ZodType<T>
  ): Promise<T> {
    if (this.options.forceError === "quota") {
      throw new QuotaExceededError();
    }

    const inputStr = JSON.stringify(input);
    let mockResult: unknown = MOCK_INTERPRETATION_CBC;

    if (
      this.options.reportVariant === "critical" ||
      inputStr.includes("342") ||
      inputStr.includes("6.7") ||
      inputStr.toLowerCase().includes("glucose")
    ) {
      mockResult = MOCK_INTERPRETATION_CRITICAL;
    }

    const parsed = schema.safeParse(mockResult);
    if (!parsed.success) {
      throw new Error(`Mock interpretation failed schema validation: ${parsed.error.message}`);
    }
    return parsed.data;
  }
}

import { z } from "zod";

export const ExtractedItemSchema = z.object({
  test: z.string().min(1, "Test name is required"),
  value: z.string().min(1, "Value is required"),
  unit: z.string().nullable().default(null),
  ref_range: z.string().nullable().default(null),
  status: z.enum(["low", "normal", "high", "abnormal", "critical", "unknown"]).default("unknown"),
});

export const ExtractionSuccessSchema = z.object({
  report_type: z.string().min(1, "Report type is required"),
  tests: z.array(ExtractedItemSchema).min(1, "At least one test result must be extracted"),
});

export const ExtractionErrorSchema = z.object({
  error: z.enum(["retake", "not_a_report"]),
  reason: z.string().min(1, "Reason is required"),
});

export const ExtractionResultSchema = z.union([
  ExtractionSuccessSchema,
  ExtractionErrorSchema,
]);

export type ExtractedItem = z.infer<typeof ExtractedItemSchema>;
export type ExtractionSuccess = z.infer<typeof ExtractionSuccessSchema>;
export type ExtractionError = z.infer<typeof ExtractionErrorSchema>;
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

export function isExtractionError(
  result: ExtractionResult
): result is ExtractionError {
  return "error" in result;
}


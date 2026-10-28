import { z } from "zod";

/**
 * Strips dangerous ASCII and Unicode control characters that could be used
 * for terminal/log injection or prompt boundary evasion.
 */
export function sanitizeText(val: string): string {
  if (typeof val !== "string") return "";
  // Strip control characters (\u0000-\u0008, \u000B-\u001F, \u007F-\u009F)
  return val.replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, "").trim();
}

const sanitizedString = (min: number, max: number) =>
  z
    .string()
    .transform(sanitizeText)
    .pipe(z.string().min(min).max(max));

const optionalSanitizedString = (max: number) =>
  z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val ? sanitizeText(val) : ""))
    .pipe(z.string().max(max));

export const AnalyzeTestItemSchema = z.object({
  test: sanitizedString(1, 120),
  value: sanitizedString(1, 40),
  unit: optionalSanitizedString(30).default(""),
  ref_range: optionalSanitizedString(60).default(""),
  status: z
    .enum(["normal", "low", "high", "abnormal", "unknown", "critical"])
    .default("unknown"),
  confidence: z.number().min(0).max(1).optional(),
});

export const AnalyzeUserProfileSchema = z
  .object({
    age: z.number().int().min(0).max(125).optional().nullable(),
    sex: z.enum(["male", "female", "other"]).optional().nullable(),
    dietPreference: z.enum(["veg", "non-veg", "vegan"]).optional().nullable(),
    language: z.enum(["en", "hi"]).default("en"),
  })
  .optional()
  .nullable();

export const AnalyzeRequestSchema = z.object({
  reportId: z.string().uuid().optional().nullable(),
  reportType: sanitizedString(1, 100).optional().default("Lab Report"),
  tests: z
    .array(AnalyzeTestItemSchema)
    .min(1, "At least one confirmed laboratory test item is required")
    .max(150, "A maximum of 150 test items can be processed at once"),
  userProfile: AnalyzeUserProfileSchema,
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

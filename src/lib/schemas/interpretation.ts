import { z } from "zod";

export const FindingSeveritySchema = z.enum(["normal", "mild", "moderate", "critical"]);
export type FindingSeverity = z.infer<typeof FindingSeveritySchema>;

export const FindingSchema = z.object({
  title: z.string().min(1, "Finding title is required"),
  explanation: z.string().min(1, "Finding explanation is required"),
  related_tests: z.array(z.string()).default([]),
  severity: FindingSeveritySchema.default("normal"),
});

export const DietSchema = z.object({
  add: z.array(z.string()).default([]),
  limit_or_avoid: z.array(z.string()).default([]),
  sample_day: z.string().min(1, "Sample day meal plan is required"),
});

export const HabitsSchema = z.object({
  do: z.array(z.string()).default([]),
  avoid: z.array(z.string()).default([]),
});

export const InterpretationResultSchema = z.object({
  report_type: z.string().min(1, "Report type is required"),
  patient_summary: z.string().min(1, "Patient summary is required"),
  findings: z.array(FindingSchema).default([]),
  diet: DietSchema,
  habits: HabitsSchema,
  supplements_to_discuss_with_doctor: z.array(z.string()).default([]),
  red_flags: z.array(z.string()).default([]),
  questions_for_doctor: z.array(z.string()).default([]),
  recommended_followup_tests: z.array(z.string()).default([]),
  confidence_notes: z.string().default(""),
});

export type Finding = z.infer<typeof FindingSchema>;
export type Diet = z.infer<typeof DietSchema>;
export type Habits = z.infer<typeof HabitsSchema>;
export type InterpretationResult = z.infer<typeof InterpretationResultSchema>;


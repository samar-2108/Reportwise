import { ExtractedItem, ExtractionSuccess } from "@/lib/schemas/extraction";
import { InterpretationResult } from "@/lib/schemas/interpretation";
import { ReportRow } from "./database";
import { ClinicalSeverity } from "@/lib/clinical/classify";

export type ComputedStatus = "low" | "normal" | "high" | "critical-low" | "critical-high" | "unknown";

export interface ConfirmedItem extends ExtractedItem {
  id: string; // Client stable identifier for editing
  computed_status: ComputedStatus;
  severity?: ClinicalSeverity;
  is_critical: boolean;
  is_verify?: boolean;
  verify_message?: string;
  critical_reason?: string;
  notes?: string;
}

export interface ConfirmedReportData {
  report_type: string;
  report_date?: string;
  tests: ConfirmedItem[];
  has_critical_values: boolean;
}

export interface ReportWithDetails extends ReportRow {
  parsed_extracted?: ExtractionSuccess | null;
  parsed_confirmed?: ConfirmedReportData | null;
  parsed_analysis?: InterpretationResult | null;
}

export interface UserContext {
  age?: number | null;
  sex?: "male" | "female" | "other" | null;
  diet_preference?: "veg" | "non-veg" | "vegan" | null;
  language?: "en" | "hi";
}

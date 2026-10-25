import { ReportRow, ProfileRow } from "@/types/database";
import { ConfirmedItem } from "@/types/report";
import { InterpretationResult } from "@/lib/schemas/interpretation";

/**
 * Builds safe, PII-free clinical context from 1 to 3 user-attached reports.
 */
export function buildReportsContext(
  reports: ReportRow[],
  userProfile?: ProfileRow | null
): string {
  if (!reports || reports.length === 0) return "";

  // Sort chronologically ascending (oldest to newest) to display clear clinical progression
  const sortedReports = [...reports].sort((a, b) => {
    const dateA = a.report_date ? new Date(a.report_date).getTime() : new Date(a.created_at).getTime();
    const dateB = b.report_date ? new Date(b.report_date).getTime() : new Date(b.created_at).getTime();
    return dateA - dateB;
  });

  const sections: string[] = [];

  if (userProfile) {
    sections.push(`Patient Demographic Info (for context only):
- Age: ${userProfile.age ?? "Unknown"}
- Biological Sex: ${userProfile.sex ?? "Unknown"}
- Diet: ${userProfile.diet_preference ?? "Not specified"}`);
  }

  sortedReports.forEach((report, index) => {
    const reportNum = index + 1;
    const title = report.report_type || report.title || "Lab Report";
    const dateStr =
      report.report_date ||
      new Date(report.created_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

    let section = `### Report ${reportNum}: ${title} (Date: ${dateStr})\n`;

    // Confirmed numerical values
    const tests = (report.confirmed_data || (report.extracted_data as { tests?: ConfirmedItem[] })?.tests || []) as ConfirmedItem[];
    if (Array.isArray(tests) && tests.length > 0) {
      section += "Tests & Biomarkers:\n";
      tests.forEach((t) => {
        const flag = t.is_critical ? " [CRITICAL ALERT]" : t.severity ? ` [${t.severity.toUpperCase()}]` : "";
        const refRange = t.ref_range ? ` (Ref: ${t.ref_range})` : "";
        section += `- ${t.test}: ${t.value} ${t.unit || ""}${refRange} -> Status: ${t.status || "normal"}${flag}\n`;
      });
    }

    // Saved analysis
    const analysis = report.analysis_data as InterpretationResult | null;
    if (analysis) {
      if (analysis.patient_summary) {
        section += `\nClinical Summary:\n${analysis.patient_summary}\n`;
      }
      if (Array.isArray(analysis.findings) && analysis.findings.length > 0) {
        section += "\nKey Findings:\n";
        analysis.findings.forEach((f) => {
          section += `- ${f.title}: ${f.explanation}\n`;
        });
      }
      if (analysis.diet) {
        if (Array.isArray(analysis.diet.add) && analysis.diet.add.length > 0) {
          section += `\nBeneficial Foods to Add: ${analysis.diet.add.join(", ")}\n`;
        }
        if (Array.isArray(analysis.diet.limit_or_avoid) && analysis.diet.limit_or_avoid.length > 0) {
          section += `Foods to Limit: ${analysis.diet.limit_or_avoid.join(", ")}\n`;
        }
      }
      if (Array.isArray(analysis.questions_for_doctor) && analysis.questions_for_doctor.length > 0) {
        section += "\nRecommended Doctor Questions:\n";
        analysis.questions_for_doctor.forEach((q) => {
          section += `- ${q}\n`;
        });
      }
    }

    sections.push(section);
  });

  return sections.join("\n---\n\n");
}

/**
 * Natural language intent detection for auto-attaching a user's latest/recent report.
 */
export function resolveNaturalLanguageReport(
  query: string,
  userReports: ReportRow[]
): ReportRow | null {
  if (!query || !userReports || userReports.length === 0) return null;

  const q = query.toLowerCase();

  const patterns = [
    /\b(my\s+)?(latest|last|recent|newest)\s+(report|test|results?|blood\s*test|panel|cbc|lipid)\b/i,
    /\b(what\s+does|how\s+is)\s+my\s+(latest|last|recent)\s+(report|test)\b/i,
    /\bcheck\s+my\s+(latest|last|recent)\s+(report|test)\b/i,
    /\bmy\s+last\s+blood\s*test\b/i,
  ];

  const matches = patterns.some((p) => p.test(q));
  if (!matches) return null;

  // Sort descending to get the most recent report
  const sorted = [...userReports].sort((a, b) => {
    const dateA = a.report_date ? new Date(a.report_date).getTime() : new Date(a.created_at).getTime();
    const dateB = b.report_date ? new Date(b.report_date).getTime() : new Date(b.created_at).getTime();
    return dateB - dateA;
  });

  return sorted[0] || null;
}

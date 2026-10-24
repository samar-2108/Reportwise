import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { MOCK_EXTRACTION_CBC, MOCK_INTERPRETATION_CBC, MOCK_EXTRACTION_CRITICAL, MOCK_INTERPRETATION_CRITICAL } from "@/lib/fixtures/sample-reports";
import { evaluateAllTests } from "@/lib/medical/deterministic-check";

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();

    if (supabase) {
      const { data: reports, error } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase list reports error:", error);
      } else {
        return NextResponse.json({ reports: reports || [] });
      }
    }

    // Offline / Demo Mode: only used if Supabase client is not configured
    const cbcEvaluated = evaluateAllTests(MOCK_EXTRACTION_CBC.tests);
    const criticalEvaluated = evaluateAllTests(MOCK_EXTRACTION_CRITICAL.tests);

    const demoReports = [
      {
        id: "demo-report-cbc",
        user_id: "demo-user",
        title: "Complete Blood Count (CBC)",
        report_date: "14 Oct 2026",
        report_type: "Complete Blood Count (CBC)",
        status: "completed",
        storage_file_paths: [],
        extracted_data: MOCK_EXTRACTION_CBC,
        confirmed_data: cbcEvaluated.tests,
        analysis_data: MOCK_INTERPRETATION_CBC,
        error_message: null,
        created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 7 * 86400000).toISOString(),
      },
      {
        id: "demo-report-critical",
        user_id: "demo-user",
        title: "Comprehensive Metabolic & Glucose Panel",
        report_date: "21 Oct 2026",
        report_type: "Comprehensive Metabolic & Glucose Panel",
        status: "completed",
        storage_file_paths: [],
        extracted_data: MOCK_EXTRACTION_CRITICAL,
        confirmed_data: criticalEvaluated.tests,
        analysis_data: MOCK_INTERPRETATION_CRITICAL,
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    return NextResponse.json({ reports: demoReports });
  } catch (error: unknown) {
    console.error("List reports error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list reports" },
      { status: 500 }
    );
  }
}


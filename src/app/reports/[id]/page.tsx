"use client";

import { use, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { ResultsDashboard } from "@/components/results/results-dashboard";
import { ConfirmedItem } from "@/types/report";
import { InterpretationResult } from "@/lib/schemas/interpretation";
import { ArrowLeft, Loader2, FileQuestion } from "lucide-react";
import {
  MOCK_EXTRACTION_CBC,
  MOCK_INTERPRETATION_CBC,
  MOCK_EXTRACTION_CRITICAL,
  MOCK_INTERPRETATION_CRITICAL,
} from "@/lib/fixtures/sample-reports";
import { evaluateAllTests } from "@/lib/medical/deterministic-check";

interface PageProps {
  params: Promise<{ id: string }>;
}

function ReportDetailContent({ params }: PageProps) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<{
    id: string;
    reportType: string;
    reportDate: string;
    tests: ConfirmedItem[];
    analysis: InterpretationResult;
    hasCriticalValues: boolean;
  } | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadReport() {
      try {
        const res = await fetch(`/api/reports/list`);
        if (res.ok) {
          const data = await res.json();
          const found = (data.reports || []).find((r: { id: string }) => r.id === id);

          if (found && found.analysis_data && found.confirmed_data && !ignore) {
            const confirmed = found.confirmed_data as ConfirmedItem[];
            setReport({
              id: found.id,
              reportType: found.report_type || found.title || "Lab Report",
              reportDate:
                found.report_date || new Date(found.created_at).toLocaleDateString("en-IN"),
              tests: confirmed,
              analysis: found.analysis_data as InterpretationResult,
              hasCriticalValues: confirmed.some((c) => c.is_critical),
            });
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to load report from API:", err);
      }

      if (ignore) return;

      // Fallback for demo ID
      if (id.includes("critical")) {
        const evaluated = evaluateAllTests(MOCK_EXTRACTION_CRITICAL.tests);
        setReport({
          id,
          reportType: "Comprehensive Metabolic & Glucose Panel",
          reportDate: "21 Oct 2026",
          tests: evaluated.tests,
          analysis: MOCK_INTERPRETATION_CRITICAL,
          hasCriticalValues: true,
        });
      } else {
        const evaluated = evaluateAllTests(MOCK_EXTRACTION_CBC.tests);
        setReport({
          id,
          reportType: "Complete Blood Count (CBC)",
          reportDate: "14 Oct 2026",
          tests: evaluated.tests,
          analysis: MOCK_INTERPRETATION_CBC,
          hasCriticalValues: false,
        });
      }
      setLoading(false);
    }

    loadReport();

    return () => {
      ignore = true;
    };
  }, [id]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="print:hidden">
            <Link
              href="/history"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to History
            </Link>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
              Loading report details...
            </div>
          ) : !report ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500 space-y-3">
              <FileQuestion className="h-8 w-8 text-slate-400 mx-auto" />
              <h3 className="font-bold text-slate-900 text-sm">Report Not Found</h3>
              <p>The requested report ID could not be loaded or was deleted.</p>
              <Link
                href="/history"
                className="inline-flex items-center gap-1 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white"
              >
                Return to History
              </Link>
            </div>
          ) : (
            <ResultsDashboard
              reportId={report.id}
              reportType={report.reportType}
              reportDate={report.reportDate}
              tests={report.tests}
              analysis={report.analysis}
              hasCriticalValues={report.hasCriticalValues}
            />
          )}
        </div>
      </main>

      <DisclaimerBanner />
    </div>
  );
}

export default function ReportDetailPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-xs text-slate-500">
          Loading report...
        </div>
      }
    >
      <ReportDetailContent {...props} />
    </Suspense>
  );
}


"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { useLanguage } from "@/lib/i18n/context";
import {
  FileText,
  Trash2,
  AlertTriangle,
  ArrowRight,
  Plus,
  Loader2,
  Calendar,
} from "lucide-react";
import { ReportRow } from "@/types/database";
import { ConfirmedItem } from "@/types/report";
import { TrendChart, HistoricalTestPoint } from "@/components/results/trend-chart";
import { extractNumericValue } from "@/lib/medical/deterministic-check";

export default function HistoryPage() {
  const { t } = useLanguage();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Biomarker selected for global history trend
  const [trendBiomarker, setTrendBiomarker] = useState("Hemoglobin");

  useEffect(() => {
    let ignore = false;

    async function loadReports() {
      try {
        const res = await fetch("/api/reports/list");
        if (res.status === 401 && !ignore) {
          window.location.href = "/auth?next=/history";
          return;
        }
        if (res.ok && !ignore) {
          const data = await res.json();
          setReports(data.reports || []);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch reports:", err);
        if (!ignore) setLoading(false);
      }
    }

    loadReports();

    return () => {
      ignore = true;
    };
  }, []);

  const handleDeleteReport = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this report and its stored files?")) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/reports/${id}`, { method: "DELETE" });
      if (res.ok) {
        setReports((prev) => prev.filter((r) => r.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete report");
      }
    } catch (err) {
      console.error("Delete report error:", err);
    } finally {
      setDeletingId(null);
    }
  };

  // Compile trend points across all completed reports for the chosen biomarker
  const buildHistoricalTrendPoints = (): HistoricalTestPoint[] => {
    const points: HistoricalTestPoint[] = [];

    reports.forEach((rep) => {
      if (rep.status === "completed" && rep.confirmed_data) {
        const tests = rep.confirmed_data as unknown as ConfirmedItem[];
        if (Array.isArray(tests)) {
          const match = tests.find(
            (item) => item.test.toLowerCase().trim() === trendBiomarker.toLowerCase().trim()
          );
          if (match) {
            const num = extractNumericValue(match.value);
            if (num !== null) {
              points.push({
                date: rep.report_date || new Date(rep.created_at).toLocaleDateString(),
                value: num,
                unit: match.unit || undefined,
                refRange: match.ref_range || undefined,
                reportTitle: rep.title,
              });
            }
          }
        }
      }
    });

    return points;
  };

  const trendPoints = buildHistoricalTrendPoints();

  // Find all unique test names across reports
  const allTestNames: string[] = [];
  reports.forEach((rep) => {
    if (rep.confirmed_data && Array.isArray(rep.confirmed_data)) {
      const tests = rep.confirmed_data as unknown as ConfirmedItem[];
      tests.forEach((t) => {
        if (!allTestNames.includes(t.test)) {
          allTestNames.push(t.test);
        }
      });
    }
  });

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <FileText className="h-6 w-6 text-teal-600" />
                {t.nav.history}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Your past analyzed lab reports, findings, and longitudinal biomarker trends.
              </p>
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {t.nav.upload}
            </Link>
          </div>

          {/* Trend Chart across past reports if reports exist */}
          {reports.length > 0 && (
            <TrendChart
              currentTestName={trendBiomarker}
              availableTests={allTestNames.length ? allTestNames : ["Hemoglobin", "Glucose", "TSH"]}
              data={trendPoints}
              onSelectTest={(name) => setTrendBiomarker(name)}
            />
          )}

          {/* Reports List */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Recorded Reports ({reports.length})
            </h2>

            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                Loading your reports...
              </div>
            ) : reports.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center text-xs text-slate-500 space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 mx-auto">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">No Reports Saved Yet</h3>
                <p className="max-w-sm mx-auto text-slate-400">
                  Upload a photo or document of your lab report on the home screen to see your verified results and trend history here.
                </p>
                <div className="pt-2">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-700 transition-colors"
                  >
                    Upload Your First Report
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                {reports.map((rep) => {
                  const hasCritical =
                    rep.confirmed_data &&
                    Array.isArray(rep.confirmed_data) &&
                    (rep.confirmed_data as unknown as ConfirmedItem[]).some((i) => i.is_critical);

                  const dateFormatted = rep.report_date
                    ? rep.report_date
                    : new Date(rep.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      });

                  return (
                    <div
                      key={rep.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-5 hover:bg-slate-50/70 transition-colors gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {rep.title || "Lab Report"}
                          </span>
                          {hasCritical && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                              <AlertTriangle className="h-3 w-3" />
                              Critical Alert
                            </span>
                          )}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                              rep.status === "completed"
                                ? "bg-emerald-50 text-emerald-700"
                                : rep.status === "processing"
                                ? "bg-amber-50 text-amber-700 animate-pulse"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {rep.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {dateFormatted}
                          </span>
                          {rep.report_type && <span>• {rep.report_type}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/reports/${rep.id}`}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
                        >
                          View Report
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>

                        <button
                          onClick={() => handleDeleteReport(rep.id)}
                          disabled={deletingId === rep.id}
                          className="rounded-xl p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete report"
                        >
                          {deletingId === rep.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-rose-600" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
      <DisclaimerBanner />
    </div>
  );
}

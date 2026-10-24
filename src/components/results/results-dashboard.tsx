"use client";

import { useState, useEffect } from "react";
import { InterpretationResult } from "@/lib/schemas/interpretation";
import { ConfirmedItem } from "@/types/report";
import { useLanguage } from "@/lib/i18n/context";
import { TrendChart, HistoricalTestPoint } from "./trend-chart";
import { extractNumericValue } from "@/lib/medical/deterministic-check";
import { SeverityChip } from "@/components/clinical/severity-chip";
import {
  AlertTriangle,
  CheckCircle2,
  Printer,
  FileDown,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Activity,
  HeartPulse,
  Sparkles,
  Stethoscope,
  Salad,
  Apple,
} from "lucide-react";

interface ResultsDashboardProps {
  reportId?: string;
  reportType: string;
  reportDate?: string;
  tests: ConfirmedItem[];
  analysis: InterpretationResult;
  hasCriticalValues: boolean;
  onNewAnalysis?: () => void;
  historicalReports?: Array<{
    date: string;
    tests: ConfirmedItem[];
  }>;
}

export function ResultsDashboard({
  reportId,
  reportType,
  reportDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }),
  tests,
  analysis,
  hasCriticalValues,
  onNewAnalysis,
  historicalReports = [],
}: ResultsDashboardProps) {
  void reportId;
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<
    "values" | "findings" | "diet" | "habits" | "questions" | "trends"
  >("values");

  // Mode for whole report PDF printing
  const [isPrintingWhole, setIsPrintingWhole] = useState(false);

  // Critical Value safety rule: collapse diet/habits tabs if critical (overridden when whole PDF is requested)
  const [showLifestyleOverride, setShowLifestyleOverride] = useState(!hasCriticalValues);
  const [selectedTrendTest, setSelectedTrendTest] = useState(tests[0]?.test || "");

  // Listen to afterprint event to restore standard tab view
  useEffect(() => {
    const handleAfterPrint = () => {
      setIsPrintingWhole(false);
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  // Handler for printing only current selected tab
  const handlePrintCurrent = () => {
    setIsPrintingWhole(false);
    setTimeout(() => {
      window.print();
    }, 50);
  };

  // Handler for printing the whole report with all sections combined
  const handlePrintWhole = () => {
    setIsPrintingWhole(true);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Build trend data points for the selected biomarker
  const buildTrendData = (): HistoricalTestPoint[] => {
    const points: HistoricalTestPoint[] = [];

    // Prior reports
    historicalReports.forEach((rep) => {
      const match = rep.tests.find((t) => t.test.toLowerCase() === selectedTrendTest.toLowerCase());
      if (match) {
        const num = extractNumericValue(match.value);
        if (num !== null) {
          points.push({
            date: rep.date,
            value: num,
            unit: match.unit || undefined,
            refRange: match.ref_range || undefined,
          });
        }
      }
    });

    // Current report
    const currentMatch = tests.find((t) => t.test.toLowerCase() === selectedTrendTest.toLowerCase());
    if (currentMatch) {
      const num = extractNumericValue(currentMatch.value);
      if (num !== null) {
        points.push({
          date: reportDate,
          value: num,
          unit: currentMatch.unit || undefined,
          refRange: currentMatch.ref_range || undefined,
        });
      }
    }

    return points;
  };

  const trendData = buildTrendData();
  const availableTestNames = tests.map((t) => t.test);

  return (
    <div className="space-y-6 print:space-y-4 print:text-black">
      {/* Whole PDF Active Notice (with return button if print dialog closed) */}
      {isPrintingWhole && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 print:hidden shadow-xs">
          <div className="flex items-center gap-2">
            <FileDown className="h-4 w-4 text-teal-600 shrink-0" />
            <span className="font-semibold">
              Comprehensive Multi-Section View Active (Preparing Full PDF).
            </span>
          </div>
          <button
            onClick={() => setIsPrintingWhole(false)}
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-700 transition-colors shadow-2xs"
          >
            Return to Tabs
          </button>
        </div>
      )}

      {/* 1. CRITICAL BANNER AT TOP IF ANY VALUE IS FLAGGED CRITICAL */}
      {hasCriticalValues && (
        <div className="rounded-2xl border-2 border-rose-400 bg-rose-50/95 p-5 sm:p-6 text-rose-950 shadow-md animate-in fade-in space-y-3 avoid-page-break">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white shrink-0 shadow-sm shadow-rose-600/30">
              <AlertTriangle className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-rose-900 tracking-tight">
                {t.results.criticalBannerTitle}
              </h2>
              <p className="text-xs sm:text-sm text-rose-800 mt-0.5">
                {t.results.criticalBannerText}
              </p>
            </div>
          </div>

          {analysis.red_flags.length > 0 && (
            <div className="rounded-xl border border-rose-200 bg-white/90 p-4 text-xs space-y-2">
              <span className="font-bold text-rose-900 block">Critical Alerts & Red Flags:</span>
              <ul className="list-disc pl-4 space-y-1 text-rose-800">
                {analysis.red_flags.map((flag, idx) => (
                  <li key={idx} className="font-medium">
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 2. SUMMARY HEADER CARD */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4 avoid-page-break">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-semibold text-teal-600 tracking-wide uppercase">
              {reportType}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
              Verified Medical Lab Analysis
            </h1>
            <span className="text-xs text-slate-400 mt-1 block">
              Analyzed on {reportDate} • {tests.length} tests evaluated
            </span>
          </div>

          {/* Action Buttons: Current PDF, Whole PDF, New Report */}
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              onClick={handlePrintCurrent}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
              title="Convert current selected tab to PDF"
            >
              <Printer className="h-3.5 w-3.5 text-slate-500" />
              <span>{t.results.exportPdfCurrent}</span>
            </button>

            <button
              onClick={handlePrintWhole}
              className="inline-flex items-center gap-1.5 rounded-xl border border-teal-300 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800 hover:bg-teal-100 transition-colors shadow-2xs"
              title="Club all test values, findings, diet, habits, questions for doctor, and trend chart into one comprehensive PDF"
            >
              <FileDown className="h-3.5 w-3.5 text-teal-700" />
              <span>{t.results.exportPdfWhole}</span>
            </button>

            {onNewAnalysis && (
              <button
                onClick={onNewAnalysis}
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-700 transition-colors"
              >
                <Activity className="h-3.5 w-3.5" />
                <span>{t.results.newReport}</span>
              </button>
            )}
          </div>
        </div>

        {/* Patient Summary Card (8th Grade Level) */}
        <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-4 text-xs sm:text-sm text-slate-800 space-y-2">
          <div className="font-bold text-teal-950 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-teal-600" />
            {t.results.summaryTitle}
          </div>
          <p className="leading-relaxed text-slate-700">{analysis.patient_summary}</p>
        </div>
      </div>

      {/* 3. TABS NAVIGATION (Hidden in Whole-Report Print Mode) */}
      {!isPrintingWhole && (
        <div className="border-b border-slate-200 print:hidden overflow-x-auto">
          <nav className="flex space-x-2">
            <button
              onClick={() => setActiveTab("values")}
              className={`whitespace-nowrap py-2.5 px-3.5 text-xs font-bold border-b-2 transition-all ${
                activeTab === "values"
                  ? "border-teal-600 text-teal-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              📋 {t.results.tabs.values} ({tests.length})
            </button>

            <button
              onClick={() => setActiveTab("findings")}
              className={`whitespace-nowrap py-2.5 px-3.5 text-xs font-bold border-b-2 transition-all ${
                activeTab === "findings"
                  ? "border-teal-600 text-teal-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              🩺 {t.results.findingsTitle} ({analysis.findings.length})
            </button>

            <button
              onClick={() => setActiveTab("diet")}
              className={`whitespace-nowrap py-2.5 px-3.5 text-xs font-bold border-b-2 transition-all ${
                activeTab === "diet"
                  ? "border-teal-600 text-teal-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              🥗 {t.results.tabs.diet}
            </button>

            <button
              onClick={() => setActiveTab("habits")}
              className={`whitespace-nowrap py-2.5 px-3.5 text-xs font-bold border-b-2 transition-all ${
                activeTab === "habits"
                  ? "border-teal-600 text-teal-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              🏃 {t.results.tabs.habits}
            </button>

            <button
              onClick={() => setActiveTab("questions")}
              className={`whitespace-nowrap py-2.5 px-3.5 text-xs font-bold border-b-2 transition-all ${
                activeTab === "questions"
                  ? "border-teal-600 text-teal-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              💬 {t.results.tabs.questions} ({analysis.questions_for_doctor.length})
            </button>

            <button
              onClick={() => setActiveTab("trends")}
              className={`whitespace-nowrap py-2.5 px-3.5 text-xs font-bold border-b-2 transition-all ${
                activeTab === "trends"
                  ? "border-teal-600 text-teal-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              📈 {t.results.tabs.trends}
            </button>
          </nav>
        </div>
      )}

      {/* 4. CONTENT SECTIONS */}

      {/* SECTION 1: TEST VALUES TABLE */}
      {(isPrintingWhole || activeTab === "values") && (
        <div className="space-y-3 avoid-page-break">
          {isPrintingWhole && (
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pt-2 border-t border-slate-200">
              <span>1. Laboratory Test Values ({tests.length})</span>
            </h3>
          )}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Test Name</th>
                    <th className="py-3 px-4">Your Value</th>
                    <th className="py-3 px-4">Unit</th>
                    <th className="py-3 px-4">Printed Reference Range</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tests.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        item.is_critical ? "bg-rose-50/40" : ""
                      }`}
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900">{item.test}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{item.value}</td>
                      <td className="py-3 px-4 text-slate-500">{item.unit || "-"}</td>
                      <td className="py-3 px-4 text-slate-500">{item.ref_range || "-"}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <SeverityChip
                          severity={item.severity}
                          computedStatus={item.computed_status}
                          isCritical={item.is_critical}
                          isVerify={item.is_verify}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: KEY HEALTH FINDINGS & FOLLOW-UP TESTS */}
      {(isPrintingWhole || activeTab === "findings") && (
        <div className="space-y-4 avoid-page-break">
          {isPrintingWhole && (
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pt-2 border-t border-slate-200">
              <span>2. Key Health Findings & Insights ({analysis.findings.length})</span>
            </h3>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.findings.map((f, idx) => {
              // Find matching tests from the confirmed test values table
              const matchedTests = tests.filter((t) => {
                const tName = t.test.toLowerCase().trim();
                return (
                  f.related_tests.some((rt) => {
                    const rtLower = rt.toLowerCase().trim();
                    return rtLower === tName || rtLower.includes(tName) || tName.includes(rtLower);
                  }) || f.title.toLowerCase().includes(tName)
                );
              });

              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3.5 avoid-page-break hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900 leading-snug">{f.title}</h4>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                        f.severity === "critical"
                          ? "bg-rose-100 text-rose-800"
                          : f.severity === "moderate"
                          ? "bg-amber-100 text-amber-800"
                          : f.severity === "mild"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {f.severity}
                    </span>
                  </div>

                  {/* Exact Measured Test Values & Biomarker Status Badges */}
                  {matchedTests.length > 0 && (
                    <div className="space-y-1.5 pt-0.5">
                      {matchedTests.map((t) => (
                        <div
                          key={t.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-200/90 px-3 py-2 text-xs"
                        >
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-semibold text-slate-800">{t.test}:</span>
                            <span className="font-mono font-bold text-teal-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {t.value} {t.unit || ""}
                            </span>
                            {t.ref_range && (
                              <span className="text-slate-500 text-[11px]">
                                (Ref: {t.ref_range})
                              </span>
                            )}
                          </div>
                          <SeverityChip
                            severity={t.severity}
                            computedStatus={t.computed_status}
                            isCritical={t.is_critical}
                            isVerify={t.is_verify}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-slate-600 leading-relaxed">{f.explanation}</p>

                  {f.related_tests.length > 0 && matchedTests.length === 0 && (
                    <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                      Related tests:{" "}
                      <span className="font-semibold text-slate-600">
                        {f.related_tests.join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Follow-up tests card */}
          {analysis.recommended_followup_tests.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2 avoid-page-break">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <HeartPulse className="h-4 w-4 text-teal-600" />
                {t.results.tabs.followup}
              </h4>
              <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
                {analysis.recommended_followup_tests.map((test, idx) => (
                  <li key={idx}>{test}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: CULTURALLY RELEVANT DIET */}
      {(isPrintingWhole || activeTab === "diet") && (
        <div className="space-y-4 avoid-page-break">
          {isPrintingWhole && (
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pt-2 border-t border-slate-200">
              <span>3. Culturally Relevant Dietary Guidance (Indian Staples)</span>
            </h3>
          )}

          {hasCriticalValues && !showLifestyleOverride && !isPrintingWhole ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 mx-auto">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                {t.results.lifestyleToggleText}
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                {t.results.lifestyleToggleSubtext}
              </p>
              <button
                type="button"
                onClick={() => setShowLifestyleOverride(true)}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
              >
                <span>{t.results.showLifestyleButton}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {hasCriticalValues && !isPrintingWhole && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowLifestyleOverride(false)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                  >
                    <span>{t.results.hideLifestyleButton}</span>
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Foods to Add */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 avoid-page-break">
                  <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                    <Salad className="h-4 w-4 text-emerald-600" />
                    {t.results.diet.addTitle}
                  </div>
                  <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-600">
                    {analysis.diet.add.map((food, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {food}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Foods to Limit */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 avoid-page-break">
                  <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                    <Apple className="h-4 w-4 text-rose-500" />
                    {t.results.diet.limitTitle}
                  </div>
                  <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-600">
                    {analysis.diet.limit_or_avoid.map((food, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {food}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Sample Day Meal Plan */}
              <div className="rounded-2xl border border-teal-100 bg-teal-50/40 p-5 shadow-xs space-y-2 avoid-page-break">
                <div className="font-bold text-teal-950 text-xs flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-teal-600" />
                  {t.results.diet.sampleDayTitle}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {analysis.diet.sample_day}
                </p>
              </div>

              {/* Supplements with Doctor Disclaimer */}
              {analysis.supplements_to_discuss_with_doctor.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2 avoid-page-break">
                  <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Stethoscope className="h-4 w-4 text-teal-600" />
                    {t.results.supplementsTitle}
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-slate-600">
                    {analysis.supplements_to_discuss_with_doctor.map((sup, idx) => (
                      <li key={idx}>{sup}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: DAILY HABITS */}
      {(isPrintingWhole || activeTab === "habits") && (
        <div className="space-y-4 avoid-page-break">
          {isPrintingWhole && (
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pt-2 border-t border-slate-200">
              <span>4. Daily Lifestyle Habits & Wellness Practices</span>
            </h3>
          )}

          {hasCriticalValues && !showLifestyleOverride && !isPrintingWhole ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 mx-auto">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                {t.results.lifestyleToggleText}
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                {t.results.lifestyleToggleSubtext}
              </p>
              <button
                type="button"
                onClick={() => setShowLifestyleOverride(true)}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
              >
                <span>{t.results.showLifestyleButton}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 avoid-page-break">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {t.results.habits.doTitle}
                </div>
                <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-600">
                  {analysis.habits.do.map((habit, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {habit}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 avoid-page-break">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-500" />
                  {t.results.habits.avoidTitle}
                </div>
                <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-600">
                  {analysis.habits.avoid.map((habit, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {habit}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 5: QUESTIONS FOR YOUR DOCTOR */}
      {(isPrintingWhole || activeTab === "questions") && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4 avoid-page-break">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-teal-600" />
              <span>{isPrintingWhole ? "5. " : ""}{t.results.questionsTitle}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Show these directly to your doctor or healthcare professional during your appointment.
            </p>
          </div>

          <div className="space-y-3">
            {analysis.questions_for_doctor.map((q, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 avoid-page-break"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white text-xs font-bold">
                  {idx + 1}
                </div>
                <p className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed pt-0.5">
                  {q}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 6: TRENDS OVER TIME */}
      {(isPrintingWhole || activeTab === "trends") && (
        <div className="avoid-page-break space-y-2">
          {isPrintingWhole && (
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pt-2 border-t border-slate-200">
              <span>6. Biomarker Trend Visualization ({selectedTrendTest})</span>
            </h3>
          )}
          <TrendChart
            currentTestName={selectedTrendTest}
            availableTests={availableTestNames}
            data={trendData}
            onSelectTest={(name) => setSelectedTrendTest(name)}
          />
        </div>
      )}

      {/* Medical Disclaimer Footer */}
      <div className="text-center text-[11px] text-slate-400 py-3 border-t border-slate-100 avoid-page-break">
        ReportWise • Educational summary, not medical advice. Always discuss with your physician before making clinical decisions.
      </div>
    </div>
  );
}

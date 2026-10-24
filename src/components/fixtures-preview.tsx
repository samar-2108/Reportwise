"use client";

import { useState } from "react";
import {
  MOCK_EXTRACTION_CBC,
  MOCK_EXTRACTION_LIPID,
  MOCK_EXTRACTION_CRITICAL,
  MOCK_EXTRACTION_THYROID,
  MOCK_EXTRACTION_ERROR_RETAKE,
  MOCK_INTERPRETATION_CBC,
  MOCK_INTERPRETATION_CRITICAL,
} from "@/lib/fixtures/sample-reports";
import { CheckCircle2, AlertTriangle, FileText, Sparkles, RefreshCw } from "lucide-react";

export function FixturesPreview() {
  const [selectedTab, setSelectedTab] = useState<"cbc" | "lipid" | "critical" | "thyroid" | "retake">("cbc");
  const [viewMode, setViewMode] = useState<"pass1" | "pass2">("pass1");

  const getExtractionData = () => {
    switch (selectedTab) {
      case "cbc":
        return MOCK_EXTRACTION_CBC;
      case "lipid":
        return MOCK_EXTRACTION_LIPID;
      case "critical":
        return MOCK_EXTRACTION_CRITICAL;
      case "thyroid":
        return MOCK_EXTRACTION_THYROID;
      case "retake":
        return MOCK_EXTRACTION_ERROR_RETAKE;
    }
  };

  const getInterpretationData = () => {
    if (selectedTab === "critical") return MOCK_INTERPRETATION_CRITICAL;
    return MOCK_INTERPRETATION_CBC;
  };

  const currentData = getExtractionData();
  const isError = "error" in currentData;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-teal-600" />
            Verified Test Fixtures & Schemas
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Pre-configured sample data for testing Pass 1 (extraction) and Pass 2 (interpretation) without API calls.
          </p>
        </div>

        {/* View toggle */}
        <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs font-medium">
          <button
            onClick={() => setViewMode("pass1")}
            className={`rounded-md px-3 py-1.5 transition-all ${
              viewMode === "pass1"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Pass 1: Extracted JSON
          </button>
          <button
            onClick={() => setViewMode("pass2")}
            className={`rounded-md px-3 py-1.5 transition-all flex items-center gap-1 ${
              viewMode === "pass2"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="h-3 w-3 text-teal-600" />
            Pass 2: Interpretation
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedTab("cbc")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            selectedTab === "cbc"
              ? "bg-teal-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          CBC (Mild Anemia)
        </button>
        <button
          onClick={() => setSelectedTab("lipid")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            selectedTab === "lipid"
              ? "bg-teal-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Lipid Profile (High Cholesterol)
        </button>
        <button
          onClick={() => setSelectedTab("critical")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            selectedTab === "critical"
              ? "bg-rose-600 text-white"
              : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
          }`}
        >
          Critical Panel (High K+ & Glucose)
        </button>
        <button
          onClick={() => setSelectedTab("thyroid")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            selectedTab === "thyroid"
              ? "bg-teal-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Thyroid Panel
        </button>
        <button
          onClick={() => setSelectedTab("retake")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            selectedTab === "retake"
              ? "bg-amber-600 text-white"
              : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
          }`}
        >
          Blurry Image (Retake Error)
        </button>
      </div>

      {/* Content display */}
      <div className="mt-4">
        {viewMode === "pass1" ? (
          isError ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs">
              <div className="flex items-center gap-2 font-semibold text-amber-900 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Retake Detection Response (Zod Verified)
              </div>
              <p className="text-amber-800">
                <strong>Error Type:</strong> {currentData.error}
              </p>
              <p className="text-amber-800 mt-1">
                <strong>Reason given to user:</strong> {currentData.reason}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-xs font-semibold text-slate-700 flex justify-between items-center">
                <span>{currentData.report_type}</span>
                <span className="text-slate-600 font-normal">
                  {currentData.tests.length} tests extracted
                </span>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50/50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Test Name</th>
                    <th className="px-3 py-2 font-semibold">Printed Value</th>
                    <th className="px-3 py-2 font-semibold">Unit</th>
                    <th className="px-3 py-2 font-semibold">Printed Reference Range</th>
                    <th className="px-3 py-2 font-semibold">Report Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentData.tests.map((t, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="px-3 py-2 font-medium text-slate-900">{t.test}</td>
                      <td className="px-3 py-2 font-mono font-semibold text-slate-800">
                        {t.value}
                      </td>
                      <td className="px-3 py-2 text-slate-500">{t.unit || "-"}</td>
                      <td className="px-3 py-2 text-slate-500">{t.ref_range || "-"}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium capitalize ${
                            t.status === "normal"
                              ? "bg-emerald-50 text-emerald-700"
                              : t.status === "high" || t.status === "low"
                              ? "bg-amber-50 text-amber-700 font-semibold"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="space-y-3">
            {selectedTab === "critical" && (
              <div className="rounded-xl border border-rose-300 bg-rose-50 p-3.5 text-xs text-rose-900">
                <div className="flex items-center gap-1.5 font-bold text-rose-800 mb-1">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  CRITICAL ALERT TRIGGERED
                </div>
                Prompt and UI rule: Urgent safety notice is highlighted first, and routine lifestyle advice is placed behind a conscious toggle.
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 space-y-2">
              <div className="font-semibold text-slate-900 text-sm">
                Patient Summary (8th-Grade Language)
              </div>
              <p className="leading-relaxed">
                {getInterpretationData().patient_summary}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-slate-200 p-3.5 bg-white">
                <div className="font-semibold text-slate-900 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-teal-600" />
                  Culturally Relevant Indian Diet Suggestions
                </div>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  {getInterpretationData().diet.add.slice(0, 3).map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-slate-200 p-3.5 bg-white">
                <div className="font-semibold text-slate-900 mb-2 flex items-center gap-1.5">
                  <RefreshCw className="h-4 w-4 text-teal-600" />
                  Questions to Discuss with Your Doctor
                </div>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  {getInterpretationData().questions_for_doctor.slice(0, 3).map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


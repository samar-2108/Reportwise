"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { UploadZone } from "@/components/upload/upload-zone";
import { EditableConfirmationTable } from "@/components/upload/editable-confirmation-table";
import { ResultsDashboard } from "@/components/results/results-dashboard";
import { StepProgressLoader } from "@/components/ui/step-progress-loader";
import { PrivacyConsentModal } from "@/components/privacy-consent-modal";
import { useLanguage } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth/context";
import {
  ExtractionResult,
  ExtractionSuccess,
  isExtractionError,
} from "@/lib/schemas/extraction";
import { ConfirmedItem } from "@/types/report";
import { InterpretationResult } from "@/lib/schemas/interpretation";
import {
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ScanEye,
  Sliders,
  ShieldCheck,
  Loader2,
} from "lucide-react";

type FlowStage = "upload" | "extracting" | "confirming" | "analyzing" | "results";

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const { language, t } = useLanguage();
  const [stage, setStage] = useState<FlowStage>("upload");
  const [extractedData, setExtractedData] = useState<ExtractionSuccess | null>(null);
  const [reportId, setReportId] = useState<string | undefined>(undefined);
  const [analysisResult, setAnalysisResult] = useState<{
    reportType: string;
    tests: ConfirmedItem[];
    analysis: InterpretationResult;
    hasCriticalValues: boolean;
  } | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<"retake" | "not_a_report" | "general" | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);

  // Require authentication: redirect unauthenticated users to /auth immediately
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.replace("/auth");
    }
  }, [authLoading, user]);

  // Handlers
  const handleExtractionStart = () => {
    setErrorMessage(null);
    setErrorType(null);
    setStage("extracting");
  };

  const handleExtractionComplete = (result: ExtractionResult & { reportId?: string }) => {
    if (result.reportId) {
      setReportId(result.reportId);
    }

    if (isExtractionError(result)) {
      setErrorType(result.error);
      setErrorMessage(result.reason);
      setStage("upload");
      return;
    }

    setExtractedData(result);
    setStage("confirming");
  };

  const handleExtractionError = (msg: string) => {
    setErrorMessage(msg);
    setErrorType("general");
    setStage("upload");
  };

  const handleConfirmAndAnalyze = async (
    confirmedTests: ConfirmedItem[],
    confirmedReportType: string,
    hasCritical: boolean
  ) => {
    setStage("analyzing");
    setErrorMessage(null);

    try {
      const dietPref = localStorage.getItem("reportwise_diet") || "veg";

      const res = await fetch("/api/reports/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          reportType: confirmedReportType,
          tests: confirmedTests,
          userProfile: {
            language,
            dietPreference: dietPref,
          },
        }),
      });

      const data = await res.json();

      if (res.status === 401) {
        window.location.href = "/auth?next=/";
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze report");
      }

      setAnalysisResult({
        reportType: data.reportType || confirmedReportType,
        tests: data.confirmedTests || confirmedTests,
        analysis: data.analysis,
        hasCriticalValues: data.hasCriticalValues ?? hasCritical,
      });

      setStage("results");
    } catch (err: unknown) {
      console.error("Analysis error:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to generate plain-language explanation."
      );
      setStage("confirming");
    }
  };

  const handleReset = () => {
    setStage("upload");
    setExtractedData(null);
    setAnalysisResult(null);
    setErrorMessage(null);
    setErrorType(null);
    setReportId(undefined);
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-12">
          <div className="flex items-center gap-2.5 text-xs text-slate-500 font-medium">
            <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
            <span>Verifying session...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-8">
          {/* Privacy Alert Notice on Upload stage */}
          {stage === "upload" && (
            <div className="rounded-xl border border-amber-200/90 bg-amber-50/90 p-4 text-xs text-amber-900 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold flex items-center gap-1.5 text-amber-950">
                  <ShieldAlert className="h-4 w-4 text-amber-700" />
                  Privacy & Data Processing Notice
                </span>
                <button
                  onClick={() => setShowConsentModal(true)}
                  className="text-[11px] font-semibold text-amber-900 underline hover:text-amber-950"
                >
                  Review Consent Notice
                </button>
              </div>
              <p className="leading-relaxed text-amber-800">
                Your report is processed by a secure automated medical AI system. Do not upload reports containing information you are not comfortable sharing. Remove your name, phone number, and ID numbers where possible.
              </p>
            </div>
          )}

          {/* Error Banner (Blurry retake or non-medical or quota error) */}
          {errorMessage && (
            <div
              className={`rounded-2xl border p-4 sm:p-5 text-xs shadow-xs space-y-2 ${
                errorType === "retake"
                  ? "border-amber-300 bg-amber-50 text-amber-900"
                  : "border-rose-300 bg-rose-50 text-rose-900"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {errorType === "retake"
                    ? "Photo Retake Recommended"
                    : errorType === "not_a_report"
                    ? "Non-Medical Document Detected"
                    : "Processing Error"}
                </span>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="text-[11px] font-semibold underline"
                >
                  Dismiss
                </button>
              </div>
              <p className="leading-relaxed">{errorMessage}</p>
              {errorType === "retake" && (
                <div className="pt-1 text-[11px] font-medium text-amber-800">
                  💡 Tip: Lay the report completely flat on a table in bright indirect light. Avoid finger shadows and glare.
                </div>
              )}
            </div>
          )}

          {/* STAGE: UPLOAD */}
          {stage === "upload" && (
            <div className="space-y-8">
              {/* Hero */}
              <section className="text-center space-y-3 pt-2 sm:pt-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50/80 px-3.5 py-1 text-xs font-semibold text-teal-800">
                  <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                  <span>2-Pass Verified Medical AI Intelligence</span>
                </div>

                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
                  {t.tagline.split(" in Plain Language")[0]}{" "}
                  <span className="block text-teal-600">
                    {language === "en" ? "in Plain Language" : "सरल और स्पष्ट भाषा में"}
                  </span>
                </h1>

                <p className="mx-auto max-w-2xl text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Upload or photograph your medical lab report. ReportWise transcribes printed values, lets you verify them, and gives you culturally relevant health guidance at an 8th-grade reading level.
                </p>
              </section>

              {/* Upload Zone */}
              <UploadZone
                onExtractionStart={handleExtractionStart}
                onExtractionComplete={handleExtractionComplete}
                onError={handleExtractionError}
              />

              {/* Architecture Highlights */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700 mb-3">
                    <ScanEye className="h-5 w-5" />
                  </div>
                  <h2 className="font-semibold text-slate-900 text-sm">Pass 1: Vision Extraction</h2>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Transcribes printed numbers, filters personal identifiers, and automatically flags blurry images for retake.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 mb-3">
                    <Sliders className="h-5 w-5" />
                  </div>
                  <h2 className="font-semibold text-slate-900 text-sm">Deterministic Verifier</h2>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Interactive table allows correcting OCR mistakes. Deterministic code flags critical cutoffs like potassium and glucose.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 mb-3">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <h2 className="font-semibold text-slate-900 text-sm">Pass 2: Interpretation</h2>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Educates without diagnosing. Only runs after your confirmation. Features Indian diet staples and doctor discussion prompts.
                  </p>
                </div>
              </section>
            </div>
          )}

          {/* STAGE: EXTRACTING PROGRESS */}
          {stage === "extracting" && (
            <div className="py-12">
              <StepProgressLoader currentStage="extracting" />
            </div>
          )}

          {/* STAGE: CONFIRMING EDITABLE TABLE */}
          {stage === "confirming" && extractedData && (
            <EditableConfirmationTable
              initialData={extractedData}
              reportId={reportId}
              onBack={() => setStage("upload")}
              onConfirmed={handleConfirmAndAnalyze}
            />
          )}

          {/* STAGE: ANALYZING PROGRESS */}
          {stage === "analyzing" && (
            <div className="py-12">
              <StepProgressLoader currentStage="interpreting" />
            </div>
          )}

          {/* STAGE: RESULTS DASHBOARD */}
          {stage === "results" && analysisResult && (
            <div className="space-y-6">
              <div className="flex justify-end print:hidden">
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  <RotateCcw className="h-4 w-4" />
                  Analyze Another Report
                </button>
              </div>

              <ResultsDashboard
                reportId={reportId}
                reportType={analysisResult.reportType}
                tests={analysisResult.tests}
                analysis={analysisResult.analysis}
                hasCriticalValues={analysisResult.hasCriticalValues}
                onNewAnalysis={handleReset}
              />
            </div>
          )}
        </div>
      </main>

      {stage === "upload" && <Footer />}
      <DisclaimerBanner />

      <PrivacyConsentModal
        isOpen={showConsentModal}
        onConsent={() => setShowConsentModal(false)}
        onCancel={() => setShowConsentModal(false)}
      />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Sparkles, FileSearch, ShieldCheck } from "lucide-react";

interface StepProgressLoaderProps {
  currentStage?: "extracting" | "checking" | "interpreting";
}

export function StepProgressLoader({ currentStage = "extracting" }: StepProgressLoaderProps) {
  const [stepIndex, setStepIndex] = useState(() => {
    return currentStage === "interpreting" ? 2 : currentStage === "checking" ? 1 : 0;
  });

  useEffect(() => {
    if (currentStage === "interpreting" || currentStage === "checking") {
      return;
    }

    const timer = setInterval(() => {
      setStepIndex((prev) => (prev < 1 ? prev + 1 : prev));
    }, 2500);

    return () => clearInterval(timer);
  }, [currentStage]);

  const steps = [
    {
      title: "Reading report...",
      desc: "Transcribing exact test names, values, and printed reference intervals with high-precision optical analysis.",
      icon: FileSearch,
    },
    {
      title: "Checking values...",
      desc: "Deterministic safety engine comparing values against clinical critical thresholds.",
      icon: ShieldCheck,
    },
    {
      title: "Preparing insights...",
      desc: "Formulating plain-language explanations, culturally relevant Indian diet suggestions, and doctor questions.",
      icon: Sparkles,
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm max-w-xl mx-auto space-y-6">
      <div className="text-center space-y-1.5">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 mb-2">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Processing Your Lab Report</h3>
        <p className="text-xs text-slate-500">
          This usually takes 5 to 15 seconds. Please keep this tab open.
        </p>
      </div>

      <div className="space-y-4 pt-2">
        {steps.map((s, idx) => {
          const isDone = idx < stepIndex;
          const isCurrent = idx === stepIndex;
          const Icon = s.icon;

          return (
            <div
              key={idx}
              className={`flex items-start gap-3.5 p-3.5 rounded-xl border transition-all ${
                isCurrent
                  ? "border-teal-200 bg-teal-50/60 shadow-xs"
                  : isDone
                  ? "border-slate-200 bg-slate-50/70"
                  : "border-slate-100 opacity-40"
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  isDone
                    ? "bg-emerald-600 text-white"
                    : isCurrent
                    ? "bg-teal-600 text-white animate-pulse"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : isCurrent ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>

              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                  <span>{s.title}</span>
                  {isCurrent && (
                    <span className="text-[10px] font-medium text-teal-700 bg-teal-100 px-1.5 py-0.2 rounded-full">
                      In progress
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


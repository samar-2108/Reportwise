"use client";

import { AlertTriangle, HelpCircle } from "lucide-react";
import { ClinicalSeverity } from "@/lib/clinical/classify";
import { ComputedStatus } from "@/types/report";

interface SeverityChipProps {
  severity?: ClinicalSeverity;
  computedStatus?: ComputedStatus;
  isCritical?: boolean;
  isVerify?: boolean;
}

export function SeverityChip({
  severity = "normal",
  computedStatus,
  isCritical,
  isVerify,
}: SeverityChipProps) {
  // If explicitly flagged
  const effSeverity: ClinicalSeverity = isCritical
    ? "critical"
    : isVerify
    ? "verify"
    : severity;

  switch (effSeverity) {
    case "critical":
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-red-900 text-red-50 border border-red-950 shadow-xs">
          <AlertTriangle className="h-3 w-3 text-red-200 shrink-0" />
          <span>
            {computedStatus === "critical-low" || computedStatus === "low"
              ? "Critical Low"
              : computedStatus === "critical-high" || computedStatus === "high"
              ? "Critical High"
              : "Critical"}
          </span>
        </span>
      );

    case "severe":
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-red-50 text-red-800 border border-red-300">
          <span>
            {computedStatus === "low"
              ? "Severe Low"
              : computedStatus === "high"
              ? "Severe High"
              : "Severe"}
          </span>
        </span>
      );

    case "moderate":
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-orange-50 text-orange-800 border border-orange-300">
          <span>
            {computedStatus === "low"
              ? "Mod Low"
              : computedStatus === "high"
              ? "Mod High"
              : "Moderate"}
          </span>
        </span>
      );

    case "mild":
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
          <span>
            {computedStatus === "low"
              ? "Mild Low"
              : computedStatus === "high"
              ? "Mild High"
              : "Mild"}
          </span>
        </span>
      );

    case "verify":
      return (
        <span
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300 cursor-help"
          title="This value looks unusual, please double-check"
        >
          <HelpCircle className="h-3 w-3 text-slate-500 shrink-0" />
          <span>Verify</span>
        </span>
      );

    case "normal":
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span>Normal</span>
        </span>
      );

    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          <span>{computedStatus || "Pending"}</span>
        </span>
      );
  }
}


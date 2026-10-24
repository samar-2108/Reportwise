"use client";

import { useState } from "react";
import { ExtractionSuccess, ExtractedItem } from "@/lib/schemas/extraction";
import { ConfirmedItem } from "@/types/report";
import { evaluateAllTests, evaluateTestItem } from "@/lib/medical/deterministic-check";
import { SeverityChip } from "@/components/clinical/severity-chip";
import { useLanguage } from "@/lib/i18n/context";
import {
  Trash2,
  Plus,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Sliders,
  HelpCircle,
} from "lucide-react";

interface EditableConfirmationTableProps {
  initialData: ExtractionSuccess;
  reportId?: string;
  onConfirmed: (confirmedTests: ConfirmedItem[], reportType: string, hasCritical: boolean) => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

export function EditableConfirmationTable({
  initialData,
  reportId,
  onConfirmed,
  onBack,
  isSubmitting = false,
}: EditableConfirmationTableProps) {
  void reportId;
  const { t } = useLanguage();
  const [reportType, setReportType] = useState(initialData.report_type || "Lab Report");

  // Initialize tests with deterministic evaluation
  const [items, setItems] = useState<ConfirmedItem[]>(() => {
    return initialData.tests.map((item, idx) => evaluateTestItem(item, idx));
  });

  const handleFieldChange = (
    index: number,
    field: keyof ExtractedItem,
    value: string
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      const target = { ...updated[index], [field]: value };
      // Re-evaluate deterministically on edit
      updated[index] = evaluateTestItem(target, index);
      return updated;
    });
  };

  const handleDeleteRow = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddRow = () => {
    const newItem: ExtractedItem = {
      test: "",
      value: "",
      unit: "",
      ref_range: "",
      status: "unknown",
    };
    setItems((prev) => [...prev, evaluateTestItem(newItem, prev.length)]);
  };

  const handleConfirm = () => {
    const validItems = items.filter((item) => item.test.trim() && item.value.trim());
    if (validItems.length === 0) {
      alert("Please ensure at least one test with a name and value is present.");
      return;
    }

    const { tests, hasCriticalValues } = evaluateAllTests(validItems);
    onConfirmed(tests, reportType, hasCriticalValues);
  };

  const hasCritical = items.some((i) => i.is_critical);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="h-5 w-5 text-teal-600" />
              {t.confirm.title}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{t.confirm.subtitle}</p>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t.confirm.backToUpload}
          </button>
        </div>

        {/* Report Type Input */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
            Report Type / Panel:
          </label>
          <input
            type="text"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 font-medium focus:border-teal-500 focus:outline-none"
            placeholder="e.g. Complete Blood Count (CBC)"
          />
        </div>

        {hasCritical && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 p-3.5 text-xs text-rose-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-rose-800">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              Critical Value Flagged by Deterministic Verifier
            </div>
            <p className="text-rose-800 text-[11px] leading-relaxed">
              One or more extracted values exceed standard safety boundaries. You can verify the numbers below or proceed to view safety guidance.
            </p>
          </div>
        )}
      </div>

      {/* Editable Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
            <tr>
              <th className="py-3 px-3 min-w-[160px]">{t.confirm.testHeader}</th>
              <th className="py-3 px-3 min-w-[100px]">{t.confirm.valueHeader}</th>
              <th className="py-3 px-3 min-w-[90px]">{t.confirm.unitHeader}</th>
              <th className="py-3 px-3 min-w-[130px]">{t.confirm.refRangeHeader}</th>
              <th className="py-3 px-3 min-w-[110px]">{t.confirm.statusHeader}</th>
              <th className="py-3 px-2 text-center w-12">{t.confirm.actionsHeader}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item, idx) => (
              <tr
                key={item.id}
                className={`transition-colors hover:bg-slate-50/60 ${
                  item.is_critical
                    ? "bg-rose-50/40"
                    : item.is_verify
                    ? "bg-amber-50/30 border-l-4 border-l-amber-400"
                    : ""
                }`}
              >
                {/* Test Name */}
                <td className="p-2">
                  <input
                    type="text"
                    value={item.test}
                    onChange={(e) => handleFieldChange(idx, "test", e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-900 font-medium focus:border-teal-500 focus:outline-none"
                    placeholder="e.g. Hemoglobin"
                  />
                </td>

                {/* Value */}
                <td className="p-2">
                  <input
                    type="text"
                    value={item.value}
                    onChange={(e) => handleFieldChange(idx, "value", e.target.value)}
                    className={`w-full rounded-md border px-2 py-1 text-xs font-mono font-semibold focus:outline-none ${
                      item.is_critical
                        ? "border-rose-300 text-rose-700 bg-rose-50/80"
                        : item.is_verify
                        ? "border-amber-400 text-amber-900 bg-amber-50/50"
                        : "border-slate-200 text-slate-900 focus:border-teal-500"
                    }`}
                    placeholder="e.g. 13.5"
                  />
                  {item.is_verify && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-700 font-medium">
                      <HelpCircle className="h-3 w-3 shrink-0 text-amber-600" />
                      <span>This value looks unusual, please double-check</span>
                    </div>
                  )}
                </td>

                {/* Unit */}
                <td className="p-2">
                  <input
                    type="text"
                    value={item.unit || ""}
                    onChange={(e) => handleFieldChange(idx, "unit", e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 focus:border-teal-500 focus:outline-none"
                    placeholder="e.g. g/dL"
                  />
                </td>

                {/* Reference Range */}
                <td className="p-2">
                  <input
                    type="text"
                    value={item.ref_range || ""}
                    onChange={(e) => handleFieldChange(idx, "ref_range", e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 focus:border-teal-500 focus:outline-none"
                    placeholder="e.g. 12.0 - 15.5"
                  />
                </td>

                {/* Computed Status Chip */}
                <td className="p-2 whitespace-nowrap">
                  <SeverityChip
                    severity={item.severity}
                    computedStatus={item.computed_status}
                    isCritical={item.is_critical}
                    isVerify={item.is_verify}
                  />
                </td>

                {/* Delete */}
                <td className="p-2 text-center">
                  <button
                    type="button"
                    onClick={() => handleDeleteRow(idx)}
                    className="rounded p-1 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Delete row"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Add Row & Table Actions */}
        <div className="flex items-center justify-between p-3 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={handleAddRow}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5" />
            {t.confirm.addTest}
          </button>

          <span className="text-[11px] text-slate-500 font-medium">
            {items.length} tests ready for verification
          </span>
        </div>
      </div>

      {/* Confirm & Proceed Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          {t.confirm.backToUpload}
        </button>

        <button
          type="button"
          disabled={isSubmitting || items.length === 0}
          onClick={handleConfirm}
          className="rounded-xl bg-teal-600 px-6 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-teal-700 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <span>{isSubmitting ? t.confirm.analyzing : t.confirm.confirmButton}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { ShieldAlert, Scissors, Check, EyeOff, AlertTriangle } from "lucide-react";

interface PrivacyConsentModalProps {
  isOpen: boolean;
  onConsent: () => void;
  onCancel: () => void;
}

export function PrivacyConsentModal({ isOpen, onConsent, onCancel }: PrivacyConsentModalProps) {
  const [acknowledgedCrop, setAcknowledgedCrop] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 shrink-0">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Privacy Notice & Document Consent</h3>
            <p className="text-xs text-slate-500">Please review before processing your medical lab report</p>
          </div>
        </div>

        {/* Required Google Gemini Free-Tier Notice */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900 space-y-2">
          <p className="font-semibold flex items-center gap-1.5 text-amber-950">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
            AI Service Data Use Notice (Google Gemini):
          </p>
          <p className="leading-relaxed">
            Your report is processed by a third-party AI service (Google Gemini). Do not upload reports containing information you are not comfortable sharing. Remove your name, phone number, and ID numbers where possible.
          </p>
        </div>

        {/* Client-side header cropping reminder */}
        <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-4 text-xs text-slate-700 space-y-2">
          <div className="font-semibold text-teal-900 flex items-center gap-1.5">
            <Scissors className="h-4 w-4 text-teal-600" />
            Recommended Pre-Upload Anonymization Step:
          </div>
          <p className="text-slate-600 leading-relaxed">
            Before uploading, please crop out or cover the top header of the page containing your name, phone number, home address, hospital name, and patient ID numbers. ReportWise only needs the numerical test names and values.
          </p>
          <label className="flex items-center gap-2 pt-2 cursor-pointer font-medium text-slate-800">
            <input
              type="checkbox"
              checked={acknowledgedCrop}
              onChange={(e) => setAcknowledgedCrop(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span>I have cropped or obscured my personal identifier header (or understand and accept processing without cropping)</span>
          </label>
        </div>

        {/* Data Security Guarantees */}
        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <EyeOff className="h-3.5 w-3.5 text-slate-400" />
            <span>Zero server-log storage of reports</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-slate-400" />
            <span>Private isolated cloud storage</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConsent}
            className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-700 transition-colors"
          >
            I Agree & Proceed
          </button>
        </div>
      </div>
    </div>
  );
}


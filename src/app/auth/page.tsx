"use client";

import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { Activity, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function AuthPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 mb-2">
            <Activity className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Direct Access Enabled
            </h1>
            <p className="text-xs text-slate-500">
              All upload, extraction, analysis, and history features are directly accessible without signing in.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Full app access enabled without credentials</span>
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-teal-600 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-teal-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to ReportWise Home
          </Link>
        </div>
      </main>

      <DisclaimerBanner />
    </div>
  );
}

"use client";

import Link from "next/link";
import { Activity, Cpu, History, Settings, Languages } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

export function Navbar() {
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "hi" : "en");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm shadow-teal-700/20">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              Report<span className="text-teal-600">Wise</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs font-medium text-slate-500">
              Lab Intelligence
            </span>
          </div>
        </Link>

        {/* Navigation Items */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/history"
            className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <History className="h-3.5 w-3.5 text-teal-600" />
            <span>{t.nav.history}</span>
          </Link>

          <Link
            href="/settings"
            className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Settings className="h-3.5 w-3.5 text-teal-600" />
            <span>{t.nav.settings}</span>
          </Link>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 transition-colors"
            title="Toggle Language / भाषा बदलें"
          >
            <Languages className="h-3.5 w-3.5 text-teal-600" />
            <span>{language === "en" ? "हिंदी" : "English"}</span>
          </button>

          <Link
            href="/admin/usage"
            className="flex items-center gap-1 rounded-full bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors"
            title="View Free-Tier Gemini Usage"
          >
            <Cpu className="h-3.5 w-3.5 text-teal-600" />
            <span className="hidden md:inline">Quota</span>
          </Link>

          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
            No Auth (Debug)
          </span>
        </div>
      </div>
    </header>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Cpu,
  History,
  Settings,
  Languages,
  Menu,
  X,
  FileText,
  ChevronRight,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

export function Navbar() {
  const { language, setLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile drawer on route transition
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "hi" : "en");
  };

  const isHistoryActive = pathname.startsWith("/history") || pathname.startsWith("/reports");
  const isSettingsActive = pathname.startsWith("/settings");
  const isHomeActive = pathname === "/";
  const isQuotaActive = pathname.startsWith("/admin");

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-3 sm:px-6">
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
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Desktop Nav Links */}
          <Link
            href="/history"
            className={`hidden sm:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${
              isHistoryActive
                ? "bg-teal-50 text-teal-800 font-bold border border-teal-200/60"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <History className="h-3.5 w-3.5 text-teal-600" />
            <span>{t.nav.history}</span>
          </Link>

          <Link
            href="/settings"
            className={`hidden sm:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${
              isSettingsActive
                ? "bg-teal-50 text-teal-800 font-bold border border-teal-200/60"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Settings className="h-3.5 w-3.5 text-teal-600" />
            <span>{t.nav.settings}</span>
          </Link>

          {/* Mobile Quick-Access Icons */}
          <Link
            href="/history"
            className={`flex sm:hidden p-2 rounded-xl transition-colors ${
              isHistoryActive
                ? "bg-teal-100/70 text-teal-900"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title={t.nav.history}
            aria-label={t.nav.history}
          >
            <History className="h-4 w-4 text-teal-600" />
          </Link>

          <Link
            href="/settings"
            className={`flex sm:hidden p-2 rounded-xl transition-colors ${
              isSettingsActive
                ? "bg-teal-100/70 text-teal-900"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title={t.nav.settings}
            aria-label={t.nav.settings}
          >
            <Settings className="h-4 w-4 text-teal-600" />
          </Link>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 px-2.5 sm:px-3 py-1 text-xs font-bold text-slate-700 transition-colors"
            title="Toggle Language / भाषा बदलें"
          >
            <Languages className="h-3.5 w-3.5 text-teal-600" />
            <span>{language === "en" ? "हिंदी" : "English"}</span>
          </button>

          {/* System Quota (Desktop) */}
          <Link
            href="/admin/usage"
            className={`hidden sm:flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              isQuotaActive
                ? "bg-teal-50 text-teal-800 font-bold border border-teal-200/60"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
            title="View System Usage & Quota"
          >
            <Cpu className="h-3.5 w-3.5 text-teal-600" />
            <span className="hidden md:inline">Quota</span>
          </Link>

          {/* Mobile Hamburger Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="flex sm:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-Down Navigation Panel */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-slate-200 bg-white/98 px-4 py-3 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-1.5">
            <Link
              href="/"
              className={`flex items-center justify-between rounded-xl p-3 text-xs font-semibold transition-colors ${
                isHomeActive
                  ? "bg-teal-50 border border-teal-200/80 text-teal-950 font-bold"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100/70 text-teal-700">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-slate-900 font-bold text-xs">{t.nav.upload}</div>
                  <div className="text-[11px] text-slate-500 font-normal">
                    Upload or photograph medical lab report
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </Link>

            <Link
              href="/history"
              className={`flex items-center justify-between rounded-xl p-3 text-xs font-semibold transition-colors ${
                isHistoryActive
                  ? "bg-teal-50 border border-teal-200/80 text-teal-950 font-bold"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100/70 text-teal-700">
                  <History className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-slate-900 font-bold text-xs">{t.nav.history}</div>
                  <div className="text-[11px] text-slate-500 font-normal">
                    View past reports & biomarker trend charts
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </Link>

            <Link
              href="/settings"
              className={`flex items-center justify-between rounded-xl p-3 text-xs font-semibold transition-colors ${
                isSettingsActive
                  ? "bg-teal-50 border border-teal-200/80 text-teal-950 font-bold"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100/70 text-teal-700">
                  <Settings className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-slate-900 font-bold text-xs">{t.nav.settings}</div>
                  <div className="text-[11px] text-slate-500 font-normal">
                    Diet preference, auto-delete & data purge
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </Link>

            <Link
              href="/admin/usage"
              className={`flex items-center justify-between rounded-xl p-3 text-xs font-semibold transition-colors ${
                isQuotaActive
                  ? "bg-teal-50 border border-teal-200/80 text-teal-950 font-bold"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <Cpu className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-slate-900 font-bold text-xs">
                    {t.nav.admin || "System Quota"}
                  </div>
                  <div className="text-[11px] text-slate-500 font-normal">
                    Daily analyses limits & API monitor
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

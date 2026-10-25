"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  LogOut,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth/context";

function GoogleGIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.14C3.28 21.36 7.36 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.59H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.41l4.03-3.14z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.28 2.64 1.25 6.59l4.03 3.14c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

export function Navbar() {
  const { language, setLanguage, t } = useLanguage();
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close mobile drawer and dropdown on route navigation (popstate)
  useEffect(() => {
    const handlePopState = () => {
      setMobileMenuOpen(false);
      setProfileDropdownOpen(false);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const closeMenus = useCallback(() => {
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
  }, []);

  // Click outside listener for profile dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "hi" : "en");
  };

  const isHistoryActive = pathname.startsWith("/history") || pathname.startsWith("/reports");
  const isSettingsActive = pathname.startsWith("/settings");
  const isHomeActive = pathname === "/";
  const isQuotaActive = pathname.startsWith("/admin");

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "User";

  const avatarUrl =
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;

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
        <div className="flex items-center gap-1.5 sm:gap-2">
          {user && (
            <>
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
            </>
          )}

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
          {user && (
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
          )}

          {/* User Auth Section (Desktop) */}
          {!authLoading && (
            <div className="relative hidden sm:flex items-center gap-2" ref={dropdownRef}>
              {user ? (
                <>
                  <button
                    type="button"
                    onClick={() => setProfileDropdownOpen((prev) => !prev)}
                    className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 pr-2.5 hover:bg-slate-50 transition-colors"
                  >
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="h-7 w-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white uppercase">
                        {displayName.charAt(0)}
                      </div>
                    )}
                    <span className="text-xs font-medium text-slate-700 max-w-[100px] truncate">
                      {displayName}
                    </span>
                  </button>

                  {/* Direct Visible Sign Out Button on Desktop */}
                  <button
                    type="button"
                    onClick={() => signOut()}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors"
                    title="Sign Out of ReportWise"
                  >
                    <LogOut className="h-3.5 w-3.5 text-rose-600" />
                    <span>Sign Out</span>
                  </button>

                  {/* Profile Dropdown */}
                  {profileDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg z-50 animate-in fade-in-50 duration-150">
                      <div className="px-3 py-2 border-b border-slate-100 mb-1">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {displayName}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {user.email}
                        </div>
                      </div>

                      <Link
                        href="/history"
                        onClick={closeMenus}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <History className="h-3.5 w-3.5 text-teal-600" />
                        <span>{t.nav.history}</span>
                      </Link>

                      <Link
                        href="/settings"
                        onClick={closeMenus}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Settings className="h-3.5 w-3.5 text-teal-600" />
                        <span>{t.nav.settings}</span>
                      </Link>

                      <div className="border-t border-slate-100 my-1 pt-1">
                        <button
                          type="button"
                          onClick={() => signOut()}
                          className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 transition-colors"
                        >
                          <LogOut className="h-3.5 w-3.5 text-rose-600" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href="/auth"
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition-colors"
                >
                  <GoogleGIcon />
                  <span>Sign In</span>
                </Link>
              )}
            </div>
          )}

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
          {/* User Status Banner on Mobile */}
          {!authLoading && (
            <div className="mb-3 p-3 rounded-xl border border-slate-200 bg-slate-50/80">
              {user ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 truncate">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="h-8 w-8 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white shrink-0 uppercase">
                        {displayName.charAt(0)}
                      </div>
                    )}
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {displayName}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {user.email}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => signOut()}
                    className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-600">
                    <span className="font-semibold block text-slate-800">
                      Guest User
                    </span>
                    Sign in to sync reports
                  </div>
                  <Link
                    href="/auth"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-teal-700 transition-colors"
                  >
                    <GoogleGIcon />
                    <span>Sign In</span>
                  </Link>
                </div>
              )}
            </div>
          )}

          <nav className="flex flex-col space-y-1.5">
            <Link
              href="/"
              onClick={closeMenus}
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
              onClick={closeMenus}
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
              onClick={closeMenus}
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
              onClick={closeMenus}
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
            {user && (
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50/80 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors shadow-2xs"
                >
                  <LogOut className="h-4 w-4 text-rose-600" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

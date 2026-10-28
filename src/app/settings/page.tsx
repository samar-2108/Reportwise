"use client";

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { useLanguage } from "@/lib/i18n/context";
import {
  Settings,
  Shield,
  Trash2,
  CheckCircle2,
  Languages,
  Utensils,
  AlertTriangle,
  LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";

export default function SettingsPage() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const { user, profile, signOut } = useAuth();

  const [dietPreference, setDietPreference] = useState<"veg" | "non-veg" | "vegan">(() => {
    if (typeof window !== "undefined") {
      const savedDiet = localStorage.getItem("reportwise_diet") as "veg" | "non-veg" | "vegan" | null;
      if (savedDiet) return savedDiet;
    }
    return "veg";
  });

  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSavePreferences = () => {
    setSaving(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("reportwise_diet", dietPreference);
    }
    setTimeout(() => {
      setSaving(false);
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
    }, 400);
  };

  const handleDeleteAllData = async () => {
    if (
      !confirm(
        "CRITICAL: Are you absolutely sure you want to permanently delete ALL your uploaded reports, analysis results, and profile data? This action cannot be undone."
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch("/api/user/delete-all-data", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        if (typeof window !== "undefined") {
          localStorage.clear();
        }
        alert(data.message || "All personal data purged successfully.");
        router.push("/");
      } else {
        alert(data.error || "Failed to purge data");
      }
    } catch (err) {
      console.error("Purge error:", err);
      alert("Failed to delete all data");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-8">
          <div className="border-b border-slate-200 pb-4">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Settings className="h-6 w-6 text-teal-600" />
              {t.nav.settings}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage your language, dietary context, file retention, and privacy controls.
            </p>
          </div>

          {savedMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              Preferences saved successfully! Future analyses will adapt to these settings.
            </div>
          )}

          {/* Account Profile Card */}
          {user && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                {user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.user_metadata?.avatar_url || user.user_metadata?.picture}
                    alt="Profile"
                    className="h-12 w-12 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white uppercase">
                    {(profile?.full_name || user.email || "P").charAt(0)}
                  </div>
                )}
                <div>
                  <div className="font-bold text-slate-900 text-sm">
                    {profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || "Patient"}
                  </div>
                  <div className="text-xs text-slate-500">{user.email}</div>
                  <div className="text-[11px] text-teal-600 font-semibold mt-0.5 flex items-center gap-1">
                    <span>Google Authenticated</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => signOut()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 hover:border-rose-200 transition-colors shrink-0"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          )}

          {/* 1. Language & Cultural Settings */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Languages className="h-4 w-4 text-teal-600" />
              Language & Translation Output
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  language === "en"
                    ? "border-teal-500 bg-teal-50/60 ring-2 ring-teal-500/20"
                    : "border-slate-200 bg-slate-50/50 hover:bg-slate-100"
                }`}
              >
                <div className="font-bold text-slate-900">English (US/UK)</div>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  8th-grade clear reading level with plain-language explanations.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setLanguage("hi")}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  language === "hi"
                    ? "border-teal-500 bg-teal-50/60 ring-2 ring-teal-500/20"
                    : "border-slate-200 bg-slate-50/50 hover:bg-slate-100"
                }`}
              >
                <div className="font-bold text-slate-900">हिंदी (Hindi)</div>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  आसान और स्पष्ट हिंदी में रिपोर्ट का विश्लेषण व खानपान सलाह।
                </p>
              </button>
            </div>
          </div>

          {/* 2. Dietary Preferences */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Utensils className="h-4 w-4 text-teal-600" />
              Dietary Profile (Indian Nutritional Staples)
            </h2>
            <p className="text-xs text-slate-500">
              ReportWise tailors Pass 2 diet suggestions based on your personal eating pattern.
            </p>

            <div className="grid grid-cols-3 gap-3 text-xs">
              {(["veg", "non-veg", "vegan"] as const).map((diet) => (
                <button
                  key={diet}
                  type="button"
                  onClick={() => setDietPreference(diet)}
                  className={`p-3 rounded-xl border text-center font-bold capitalize transition-all ${
                    dietPreference === diet
                      ? "border-teal-500 bg-teal-50 text-teal-900 ring-2 ring-teal-500/20"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {diet === "veg" ? "🌱 Vegetarian" : diet === "non-veg" ? "🍗 Non-Veg" : "🥑 Vegan"}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Privacy & Storage Retention */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Shield className="h-4 w-4 text-teal-600" />
              Storage & Document Privacy Controls
            </h2>

            <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-teal-900 font-bold">
                <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
                <span>Zero File Retention Policy (Enforced)</span>
              </div>
              <p className="text-teal-800 leading-relaxed text-[11px]">
                For your privacy, ReportWise always deletes uploaded report files immediately after analysis. Only structured, anonymized numerical data is retained for your health history.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSavePreferences}
              disabled={saving}
              className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-700 transition-colors"
            >
              {saving ? "Saving..." : "Save Preferences"}
            </button>
          </div>

          {/* 4. Danger Zone: Delete All My Data */}
          <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 sm:p-6 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-rose-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              Danger Zone: Right to be Forgotten
            </h2>
            <p className="text-xs text-rose-700 leading-relaxed">
              Permanently purges your entire account profile, all uploaded report images, and all historical laboratory analysis records from Supabase database and private storage.
            </p>

            <button
              type="button"
              disabled={deleting}
              onClick={handleDeleteAllData}
              className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition-colors flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? "Purging..." : "Delete All My Data"}
            </button>
          </div>
        </div>
      </main>

      <DisclaimerBanner />
    </div>
  );
}


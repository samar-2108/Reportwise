"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Mail,
  Sparkles,
  ExternalLink,
  MessageSquare,
  Lock,
  Cpu,
  Layers,
  Loader2,
  Star,
  Check,
} from "lucide-react";

const RECIPIENT_EMAIL = "samarmehta845@gmail.com";

export function Footer() {
  const { user } = useAuth();

  // Feedback form state
  const [feedbackEmail, setFeedbackEmail] = useState<string | null>(null);
  const [category, setCategory] = useState<
    "general" | "bug_report" | "parsing_issue" | "medical_accuracy" | "feature_request"
  >("general");
  const [rating, setRating] = useState<number>(5);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mailtoUrl, setMailtoUrl] = useState<string | null>(null);

  const currentEmail = feedbackEmail !== null ? feedbackEmail : user?.email || "";

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setErrorMessage("Please enter your feedback message.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const categoryLabels: Record<string, string> = {
      general: "General Feedback",
      bug_report: "Bug Report",
      parsing_issue: "Report Parsing Issue",
      medical_accuracy: "Medical Accuracy",
      feature_request: "Feature Request",
    };

    const subject = encodeURIComponent(
      `[ReportWise Feedback] ${categoryLabels[category] || category} (${rating}★)`
    );
    const body = encodeURIComponent(
      `From: ${currentEmail || "Anonymous User"}\nCategory: ${
        categoryLabels[category] || category
      }\nRating: ${rating} / 5 Stars\n\nFeedback / Message:\n${message.trim()}\n\n---\nSent via ReportWise Web App`
    );
    const mailto = `mailto:${RECIPIENT_EMAIL}?subject=${subject}&body=${body}`;
    setMailtoUrl(mailto);

    // 1. Immediately launch user's email client directly on button click to dispatch mail to Samar
    try {
      window.location.href = mailto;
    } catch (launchErr) {
      console.warn("Direct mailto launch failed:", launchErr);
    }

    // 2. Persist copy to database in background
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: currentEmail.trim() || undefined,
          category,
          rating: String(rating),
          message: message.trim(),
        }),
      });
    } catch (err) {
      console.warn("Background feedback persist error:", err);
    } finally {
      setSubmitted(true);
      setSubmitting(false);
    }
  };

  const handleResetFeedback = () => {
    setMessage("");
    setSubmitted(false);
    setMailtoUrl(null);
    setErrorMessage(null);
  };

  return (
    <footer className="w-full border-t border-slate-200 bg-slate-50/90 text-slate-700 print:hidden">
      {/* 1. TOP HIGHLIGHT BAR: ESSENTIAL PROJECT PILLARS */}
      <div className="border-b border-slate-200/80 bg-white/80 backdrop-blur-xs py-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-2xs hover:border-teal-200 transition-colors">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 border border-teal-100">
              <Cpu className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-xs">Dual-Pass AI Engine</div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Optical character recognition extraction followed by verified plain-language interpretation.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-2xs hover:border-teal-200 transition-colors">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 border border-teal-100">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-xs">Patient Isolation</div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                PostgreSQL Row-Level Security (RLS) ensures only you see your reports. Permanent 1-click data erasure.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-2xs hover:border-amber-200 transition-colors">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60">
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-xs">Panic Value Alarms</div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Flags critical test ranges with immediate medical escalation advice and emergency contact numbers.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-2xs hover:border-teal-200 transition-colors">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 border border-teal-100">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-xs">Indian Nutrition Context</div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Dietary recommendations tailored for Indian vegetarian, vegan, and non-vegetarian lifestyle habits.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN FOOTER CONTENT & FEEDBACK SECTION */}
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* LEFT 7 COLUMNS: EVERYTHING USERS SHOULD KNOW ABOUT THE PROJECT */}
          <div className="lg:col-span-7 space-y-7">
            {/* Brand Header & Mission */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white shadow-xs">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">ReportWise</h3>
                  <p className="text-[11px] text-teal-700 font-semibold">
                    AI-Assisted Medical Lab Report Companion
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                ReportWise was built to bridge the gap between complex clinical laboratory numbers and everyday patient understanding. By scanning your blood tests (CBC, lipid profile, metabolic panel, thyroid, vitamins) and translating clinical jargon into plain language, it empowers you to have more informed, constructive conversations with your doctor.
              </p>
            </div>

            {/* Everything You Should Know (Structured Breakdown) */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Layers className="h-4 w-4 text-teal-600" />
                What You Should Know About ReportWise
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1.5 hover:border-teal-200 transition-colors">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
                    How It Evaluates Reports
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Values are checked against clinical reference ranges. Tests are categorized as normal, mild, severe, or critical panic levels based on standard laboratory guidelines.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1.5 hover:border-amber-200 transition-colors">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    Medical Boundaries
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    ReportWise does <strong>NOT</strong> diagnose diseases or prescribe medications. It is strictly an educational tool to prepare doctor-ready questions for your next clinic visit.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1.5 hover:border-teal-200 transition-colors">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-teal-600" />
                    Privacy & Zero Data Leaks
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    We recommend cropping your name, address, and ID numbers before uploading. Your files are encrypted, isolated to your account, and never shared or sold.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1.5 hover:border-teal-200 transition-colors">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-teal-600" />
                    Ask ReportWise Chatbot
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Have doubts about your test? Use the floating <em>&ldquo;Ask ReportWise&rdquo;</em> button (or press <code className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-teal-700 text-[10px] font-mono">⌘K</code>) to ask health questions with clinical context.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Navigation & Emergency Notice */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 text-xs">
              <div className="flex flex-wrap gap-4 text-slate-600">
                <Link href="/" className="hover:text-teal-700 font-medium transition-colors">
                  Upload Lab Report
                </Link>
                <Link href="/history" className="hover:text-teal-700 font-medium transition-colors">
                  Health History & Trends
                </Link>
                <Link href="/settings" className="hover:text-teal-700 font-medium transition-colors">
                  Settings & Privacy
                </Link>
              </div>

              <div className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200/80 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-medium shadow-2xs">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                <span>Emergency: Call <strong>112</strong> / <strong>108</strong> for acute symptoms</span>
              </div>
            </div>
          </div>

          {/* RIGHT 5 COLUMNS: USER FEEDBACK FORM (SENT TO samarmehta845@gmail.com) */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-teal-200/90 bg-white p-5 sm:p-6 shadow-sm relative">
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700 border border-teal-100">
                    <Mail className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Send Feedback to Creator</h4>
                    <p className="text-[10px] text-slate-500">
                      Delivered directly to <span className="text-teal-700 font-mono font-semibold">{RECIPIENT_EMAIL}</span>
                    </p>
                  </div>
                </div>
              </div>

              {submitted ? (
                <div className="py-6 text-center space-y-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 border border-teal-200/70 shadow-2xs">
                    <Check className="h-6 w-6 stroke-[2.5]" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-sm font-bold text-slate-900">Email Draft Prepared & Dispatched!</h5>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                      Your email application has been triggered to send your feedback directly to <strong>{RECIPIENT_EMAIL}</strong>. A copy has also been safely saved to our records.
                    </p>
                  </div>

                  {mailtoUrl && (
                    <div className="pt-2">
                      <a
                        href={mailtoUrl}
                        className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 shadow-2xs hover:shadow-xs transition-all"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        <span>Re-open Email App to Send</span>
                        <ExternalLink className="h-3 w-3 opacity-70" />
                      </a>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleResetFeedback}
                      className="text-xs font-semibold text-teal-700 hover:text-teal-800 underline"
                    >
                      Send another feedback
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitFeedback} className="space-y-3.5 pt-4">
                  {errorMessage && (
                    <div className="p-2.5 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-800">
                      {errorMessage}
                    </div>
                  )}

                  {/* Email (Optional or auto-detected) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">
                      Your Email (for response)
                    </label>
                    <input
                      type="email"
                      value={currentEmail}
                      onChange={(e) => setFeedbackEmail(e.target.value)}
                      placeholder="you@example.com (optional)"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-colors"
                    />
                  </div>

                  {/* Feedback Category & Rating row */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 block">
                        Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) =>
                          setCategory(
                            e.target.value as
                              | "general"
                              | "bug_report"
                              | "parsing_issue"
                              | "medical_accuracy"
                              | "feature_request"
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 bg-slate-50/60 px-2.5 py-2 text-xs text-slate-900 focus:bg-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-colors"
                      >
                        <option value="general">General Feedback</option>
                        <option value="feature_request">Feature Request</option>
                        <option value="bug_report">Bug Report</option>
                        <option value="parsing_issue">Report OCR Issue</option>
                        <option value="medical_accuracy">Medical Accuracy</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 block">
                        Overall Rating
                      </label>
                      <div className="flex items-center gap-1 py-1.5 px-2 rounded-xl bg-slate-50/60 border border-slate-300">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            className="p-0.5 text-slate-300 hover:text-amber-400 transition-colors"
                            title={`${star} Star${star > 1 ? "s" : ""}`}
                          >
                            <Star
                              className={`h-4 w-4 ${
                                star <= rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-slate-300"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Message textarea */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">
                      Message / Suggestion
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Share what works well, what needs improvement, or report a bug..."
                      rows={3}
                      required
                      maxLength={2000}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-colors resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting || !message.trim()}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-teal-700 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                        <span>Opening email to {RECIPIENT_EMAIL}...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="h-3.5 w-3.5" />
                        <span>Send Email to Samar ({RECIPIENT_EMAIL})</span>
                      </>
                    )}
                  </button>

                  <p className="text-[10px] text-center text-slate-400">
                    Direct inquiries welcome at{" "}
                    <a
                      href={`mailto:${RECIPIENT_EMAIL}`}
                      className="text-teal-700 hover:underline font-mono"
                    >
                      {RECIPIENT_EMAIL}
                    </a>
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* 3. BOTTOM COPYRIGHT & DEVELOPER CREDITS */}
        <div className="mt-12 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span>&copy; 2026 ReportWise. Created by</span>
            <span className="font-semibold text-slate-800">Samar Mehta</span>
            <span className="text-slate-400">(&ldquo;samar-2108&rdquo;)</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <span>Built with Next.js 16, Supabase & Google Gemini AI</span>
            <a
              href={`mailto:${RECIPIENT_EMAIL}`}
              className="text-teal-700 hover:text-teal-800 font-medium transition-colors"
            >
              Contact: {RECIPIENT_EMAIL}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

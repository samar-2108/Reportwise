"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { Activity, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/context";

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
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

function AuthContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const errorParam = searchParams.get("error");
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(
    errorParam ? "Failed to sign in with Google. Please try again." : null
  );

  const destination = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  // When user is authenticated, immediately hard-redirect to destination
  // Using window.location.replace completely flushes Next.js RSC client cache and guarantees fresh session
  useEffect(() => {
    if (!authLoading && user) {
      window.location.replace(destination);
    }
  }, [user, authLoading, destination]);

  const handleGoogleSignIn = async () => {
    try {
      setSigningIn(true);
      setAuthError(null);
      await signInWithGoogle(next);
    } catch (err) {
      console.error("Sign in error:", err);
      setAuthError(err instanceof Error ? err.message : "Unable to initiate Google sign-in.");
      setSigningIn(false);
    }
  };

  // If already logged in, show redirecting state with direct link fallback
  if (user) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm space-y-3">
        <Loader2 className="h-7 w-7 animate-spin text-teal-600 mx-auto" />
        <div className="space-y-0.5">
          <h2 className="text-sm font-bold text-slate-800">Redirecting to ReportWise...</h2>
          <p className="text-xs text-slate-500">Authenticated successfully</p>
        </div>
        <p className="text-[11px] text-slate-400 pt-1">
          Taking longer than usual?{" "}
          <a
            href={destination}
            className="text-teal-600 font-semibold underline hover:text-teal-700"
          >
            Click here to continue
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-sm shadow-teal-700/20 mb-3">
          <Activity className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Sign In to ReportWise
        </h1>
        <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
          Access your medical lab report explanations, longitudinal health trends, and tailored dietary advice.
        </p>
      </div>

      {/* Error Alert */}
      {authError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">{authError}</div>
        </div>
      )}

      {/* Google OAuth Button */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={signingIn}
          className="w-full inline-flex items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs font-semibold text-slate-800 shadow-xs hover:bg-slate-50 hover:border-slate-400 active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {signingIn ? (
            <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
          ) : (
            <GoogleIcon />
          )}
          <span>{signingIn ? "Connecting to Google..." : "Continue with Google"}</span>
        </button>

        <p className="text-[11px] text-center text-slate-400 leading-normal">
          One-click secure login with your existing Google account.
        </p>
      </div>

      {/* Features preview */}
      <div className="grid grid-cols-2 gap-2 text-left pt-1">
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <div className="font-semibold text-slate-800 text-[11px]">Instant Extraction</div>
          <div className="text-[10px] text-slate-500 mt-0.5 leading-normal">
            OCR scans CBC, lipid, metabolic, & hormone panels
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <div className="font-semibold text-slate-800 text-[11px]">Plain-Language</div>
          <div className="text-[10px] text-slate-500 mt-0.5 leading-normal">
            Understand your results & doctor-ready questions
          </div>
        </div>
      </div>

      {/* Privacy Guarantee Note */}
      <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-3.5 text-xs text-slate-600 space-y-1.5">
        <div className="flex items-center gap-1.5 font-semibold text-teal-900">
          <ShieldCheck className="h-4 w-4 text-teal-600 shrink-0" />
          <span>Patient Privacy & Isolation</span>
        </div>
        <p className="text-[11px] leading-relaxed text-teal-900/80">
          Your lab reports and medical history are encrypted and private to you. You can permanently delete all reports and data anytime from Settings.
        </p>
      </div>

      {/* Security note */}
      <div className="text-center pt-1">
        <p className="text-[11px] text-slate-400">
          ReportWise uses official Google OAuth for secure, passwordless authentication.
        </p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6">
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-8 text-xs text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            </div>
          }
        >
          <AuthContent />
        </Suspense>
      </main>

      <Footer />
      <DisclaimerBanner />
    </div>
  );
}

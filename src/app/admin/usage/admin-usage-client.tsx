"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldAlert, Cpu, ArrowLeft, CheckCircle2, RefreshCw } from "lucide-react";
import { DailyUsageStats } from "@/lib/usage/tracker";

interface UsageApiResponse {
  stats: DailyUsageStats;
  userCap?: {
    allowed: boolean;
    current: number;
    limit: number;
    remaining: number;
  };
  env: {
    provider: string;
    modelExtract: string;
    modelInterpret: string;
    maxPerUserPerDay: number;
  };
}

export default function AdminUsageClient() {
  const [data, setData] = useState<UsageApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const res = await fetch("/api/admin/usage");
        if (res.ok && !ignore) {
          const json = await res.json();
          setData(json);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch usage stats:", err);
        if (!ignore) setLoading(false);
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/usage");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to refresh usage stats:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleResetUserQuota = async () => {
    setResetting(true);
    try {
      const res = await fetch("/api/admin/usage", { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to reset quota:", err);
    } finally {
      setResetting(false);
    }
  };

  const stats = data?.stats || {
    date: "",
    extractionCalls: 0,
    interpretationCalls: 0,
    totalCalls: 0,
    cacheHits: 0,
    quotaErrors: 0,
    lastUpdated: "",
  };

  const estimatedDailyQuota = 1500;
  const percentUsed = Math.min(100, Math.round((stats.totalCalls / estimatedDailyQuota) * 100));

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 mb-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to ReportWise
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Cpu className="h-6 w-6 text-teal-600" />
              AI API Usage & Daily Quota Monitor
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Internal diagnostic dashboard tracking daily LLM consumption, caching efficiency, and rate limits.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Provider: {data?.env?.provider.toUpperCase() || "ACTIVE"}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500">
            Loading usage statistics...
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="text-xs font-medium text-slate-500">Total API Calls Today</div>
                <div className="mt-2 text-3xl font-extrabold text-slate-900">{stats.totalCalls}</div>
                <div className="mt-1 text-[11px] text-slate-400">Date: {stats.date}</div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="text-xs font-medium text-slate-500">Extraction Calls (Pass 1)</div>
                <div className="mt-2 text-3xl font-extrabold text-teal-600">{stats.extractionCalls}</div>
                <div className="mt-1 text-[11px] text-slate-400">Vision OCR transcriptions</div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="text-xs font-medium text-slate-500">Interpretation Calls (Pass 2)</div>
                <div className="mt-2 text-3xl font-extrabold text-cyan-600">{stats.interpretationCalls}</div>
                <div className="mt-1 text-[11px] text-slate-400">Plain-language analysis</div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="text-xs font-medium text-slate-500">SHA-256 Cache Hits</div>
                <div className="mt-2 text-3xl font-extrabold text-emerald-600">{stats.cacheHits}</div>
                <div className="mt-1 text-[11px] text-emerald-600 font-medium">Saved API quota calls</div>
              </div>
            </div>

            {/* Quota Gauge */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Estimated Daily Quota Baseline</h2>
                  <p className="text-xs text-slate-500">
                    Daily operational quota allowance (~1,500 requests per day)
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-700">
                  {stats.totalCalls} / {estimatedDailyQuota} calls ({percentUsed}%)
                </span>
              </div>

              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all ${
                    percentUsed > 80 ? "bg-rose-500" : percentUsed > 50 ? "bg-amber-500" : "bg-teal-600"
                  }`}
                  style={{ width: `${Math.max(2, percentUsed)}%` }}
                />
              </div>

              {stats.quotaErrors > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>
                    <strong>{stats.quotaErrors}</strong> QuotaExceededError event(s) recorded today.
                    UI displayed friendly limit notice to users.
                  </span>
                </div>
              )}
            </div>

            {/* User Quota Status & Reset */}
            <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-teal-950 flex items-center gap-2">
                  <span>🛠️ Active User Daily Limit</span>
                </h3>
                <p className="text-xs text-teal-800 mt-1">
                  Current usage: <strong>{data?.userCap?.current ?? 0}</strong> of <strong>{data?.userCap?.limit ?? data?.env?.maxPerUserPerDay ?? 20}</strong> analyses used today ({data?.userCap?.remaining ?? 20} remaining).
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetUserQuota}
                disabled={resetting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-teal-300 bg-white px-3.5 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-50 transition-colors shadow-xs shrink-0 disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${resetting ? "animate-spin" : ""}`} />
                {resetting ? "Resetting..." : "Reset Daily Counter to 0"}
              </button>
            </div>

            {/* Configuration Safeguards */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">Configured Environment Safeguards</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-500">Pass 1 Vision Model:</span>
                  <p className="font-mono font-medium text-slate-800 mt-0.5">
                    {data?.env?.modelExtract || "Vision Optical Model"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-500">Pass 2 Interpretation Model:</span>
                  <p className="font-mono font-medium text-slate-800 mt-0.5">
                    {data?.env?.modelInterpret || "Clinical Plain-Language Model"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-500">Per-User Daily Analysis Cap:</span>
                  <p className="font-mono font-medium text-slate-800 mt-0.5">
                    {data?.env?.maxPerUserPerDay ?? 20} analyses/day
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-500">SHA-256 Duplication Protection:</span>
                  <p className="font-medium text-emerald-700 mt-0.5">Active (Identical files cached for 24h)</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

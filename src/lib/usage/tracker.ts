/**
 * Lightweight server-side usage counter tracking Gemini API calls per calendar day.
 */

export interface DailyUsageStats {
  date: string; // YYYY-MM-DD
  extractionCalls: number;
  interpretationCalls: number;
  totalCalls: number;
  cacheHits: number;
  quotaErrors: number;
  lastUpdated: string;
}

class UsageTracker {
  private stats: DailyUsageStats;

  constructor() {
    this.stats = this.initTodayStats();
  }

  private getTodayString(): string {
    return new Date().toISOString().split("T")[0];
  }

  private initTodayStats(): DailyUsageStats {
    return {
      date: this.getTodayString(),
      extractionCalls: 0,
      interpretationCalls: 0,
      totalCalls: 0,
      cacheHits: 0,
      quotaErrors: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  private ensureCurrentDay(): void {
    const today = this.getTodayString();
    if (this.stats.date !== today) {
      this.stats = this.initTodayStats();
    }
  }

  public recordCall(type: "extraction" | "interpretation"): void {
    this.ensureCurrentDay();
    if (type === "extraction") {
      this.stats.extractionCalls += 1;
    } else {
      this.stats.interpretationCalls += 1;
    }
    this.stats.totalCalls += 1;
    this.stats.lastUpdated = new Date().toISOString();
  }

  public recordCacheHit(): void {
    this.ensureCurrentDay();
    this.stats.cacheHits += 1;
    this.stats.lastUpdated = new Date().toISOString();
  }

  public recordQuotaExceeded(): void {
    this.ensureCurrentDay();
    this.stats.quotaErrors += 1;
    this.stats.lastUpdated = new Date().toISOString();
  }

  public getStats(): DailyUsageStats {
    this.ensureCurrentDay();
    return { ...this.stats };
  }

  public resetStats(): void {
    this.stats = this.initTodayStats();
  }
}

// Global singleton across server invocations
const globalForUsage = global as unknown as { usageTrackerInstance?: UsageTracker };
export const usageTracker = globalForUsage.usageTrackerInstance || new UsageTracker();
if (process.env.NODE_ENV !== "production") {
  globalForUsage.usageTrackerInstance = usageTracker;
}


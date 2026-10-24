import crypto from "crypto";
import { LLMFile } from "@/lib/llm/types";

export function computeFilesSha256(files: LLMFile[]): string {
  const hash = crypto.createHash("sha256");
  for (const file of files) {
    hash.update(file.mimeType);
    hash.update(file.data);
  }
  return hash.digest("hex");
}

export function computeInputSha256(input: unknown): string {
  const hash = crypto.createHash("sha256");
  hash.update(JSON.stringify(input));
  return hash.digest("hex");
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// In-memory LRU/TTL cache for extraction and interpretation results
class ReportResultCache {
  private extractionCache = new Map<string, CacheEntry<unknown>>();
  private interpretationCache = new Map<string, CacheEntry<unknown>>();
  private readonly ttlMs = 24 * 60 * 60 * 1000; // 24 hours

  public getExtraction(hash: string): unknown | null {
    const entry = this.extractionCache.get(hash);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.extractionCache.delete(hash);
      return null;
    }
    return entry.data;
  }

  public setExtraction(hash: string, data: unknown): void {
    // Keep max 200 items in cache
    if (this.extractionCache.size >= 200) {
      const oldestKey = this.extractionCache.keys().next().value;
      if (oldestKey) this.extractionCache.delete(oldestKey);
    }
    this.extractionCache.set(hash, { data, timestamp: Date.now() });
  }

  public getInterpretation<T>(hash: string): T | null {
    const entry = this.interpretationCache.get(hash);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.interpretationCache.delete(hash);
      return null;
    }
    return entry.data as T;
  }

  public setInterpretation(hash: string, data: unknown): void {
    if (this.interpretationCache.size >= 200) {
      const oldestKey = this.interpretationCache.keys().next().value;
      if (oldestKey) this.interpretationCache.delete(oldestKey);
    }
    this.interpretationCache.set(hash, { data, timestamp: Date.now() });
  }

  public clear(): void {
    this.extractionCache.clear();
    this.interpretationCache.clear();
  }
}

const globalForCache = global as unknown as { reportCacheInstance?: ReportResultCache };
export const reportCache = globalForCache.reportCacheInstance || new ReportResultCache();
if (process.env.NODE_ENV !== "production") {
  globalForCache.reportCacheInstance = reportCache;
}


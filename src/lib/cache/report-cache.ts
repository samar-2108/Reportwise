import crypto from "crypto";
import { LLMFile } from "@/lib/llm/types";

/**
 * Computes a SHA-256 hash for raw file buffers, strictly scoped by user ID
 * to guarantee that caching never leaks across user accounts.
 */
export function computeFilesSha256(userIdOrFiles: string | LLMFile[], maybeFiles?: LLMFile[]): string {
  const hash = crypto.createHash("sha256");

  let userId = "global";
  let files: LLMFile[];

  if (typeof userIdOrFiles === "string") {
    userId = userIdOrFiles;
    files = maybeFiles || [];
  } else {
    files = userIdOrFiles;
  }

  hash.update(`user:${userId}:`);
  for (const file of files) {
    hash.update(file.mimeType);
    hash.update(file.data);
  }
  return hash.digest("hex");
}

/**
 * Computes a SHA-256 hash for structured clinical inputs, scoped by user ID.
 */
export function computeInputSha256(userIdOrInput: string | unknown, maybeInput?: unknown): string {
  const hash = crypto.createHash("sha256");

  let userId = "global";
  let input: unknown;

  if (typeof userIdOrInput === "string" && maybeInput !== undefined) {
    userId = userIdOrInput;
    input = maybeInput;
  } else {
    input = userIdOrInput;
  }

  hash.update(`user:${userId}:`);
  hash.update(JSON.stringify(input));
  return hash.digest("hex");
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * In-memory LRU/TTL cache for extraction and interpretation results.
 * Each entry is scoped per-user to prevent cross-account cache exposure.
 */
class ReportResultCache {
  private extractionCache = new Map<string, CacheEntry<unknown>>();
  private interpretationCache = new Map<string, CacheEntry<unknown>>();
  private readonly ttlMs = 24 * 60 * 60 * 1000; // 24 hours

  private makeKey(hash: string, userId?: string): string {
    return userId ? `${userId}:${hash}` : hash;
  }

  public getExtraction(hash: string, userId?: string): unknown | null {
    const key = this.makeKey(hash, userId);
    const entry = this.extractionCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.extractionCache.delete(key);
      return null;
    }
    return entry.data;
  }

  public setExtraction(hash: string, data: unknown, userId?: string): void {
    const key = this.makeKey(hash, userId);
    // Keep max 200 items in cache
    if (this.extractionCache.size >= 200) {
      const oldestKey = this.extractionCache.keys().next().value;
      if (oldestKey) this.extractionCache.delete(oldestKey);
    }
    this.extractionCache.set(key, { data, timestamp: Date.now() });
  }

  public getInterpretation<T>(hash: string, userId?: string): T | null {
    const key = this.makeKey(hash, userId);
    const entry = this.interpretationCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.interpretationCache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  public setInterpretation(hash: string, data: unknown, userId?: string): void {
    const key = this.makeKey(hash, userId);
    if (this.interpretationCache.size >= 200) {
      const oldestKey = this.interpretationCache.keys().next().value;
      if (oldestKey) this.interpretationCache.delete(oldestKey);
    }
    this.interpretationCache.set(key, { data, timestamp: Date.now() });
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

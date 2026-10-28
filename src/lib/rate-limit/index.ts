import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export interface RateLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  resetAt?: string;
}

interface InMemoryRecord {
  count: number;
  windowStart: number;
}

// In-memory fallback for local development and unit tests when Supabase is unconfigured
const inMemoryStore = new Map<string, InMemoryRecord>();

function consumeInMemory(
  key: string,
  bucket: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const compositeKey = `${key}:${bucket}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const record = inMemoryStore.get(compositeKey);

  if (!record || now >= record.windowStart + windowMs) {
    inMemoryStore.set(compositeKey, { count: 1, windowStart: now });
    return {
      allowed: true,
      current: 1,
      limit,
      remaining: Math.max(0, limit - 1),
      resetAt: new Date(now + windowMs).toISOString(),
    };
  }

  if (record.count < limit) {
    record.count += 1;
    return {
      allowed: true,
      current: record.count,
      limit,
      remaining: Math.max(0, limit - record.count),
      resetAt: new Date(record.windowStart + windowMs).toISOString(),
    };
  }

  return {
    allowed: false,
    current: record.count,
    limit,
    remaining: 0,
    resetAt: new Date(record.windowStart + windowMs).toISOString(),
  };
}

/**
 * Atomically consumes a rate limit counter using Supabase PostgreSQL RPC `consume_rate_limit`.
 * Falls back to an in-memory window during testing or development when Supabase is offline.
 * In production, fails closed if the database RPC is unreachable.
 *
 * @param key Unique identifier (e.g., userId or IP address)
 * @param bucket Specific rate limiting bucket (e.g. "analyses:daily", "extract:burst")
 * @param limit Maximum allowed events in the window
 * @param windowSeconds Window length in seconds
 */
export async function consumeRateLimit(
  key: string,
  bucket: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  // Service-role client required to execute SECURITY DEFINER rate limiting RPC across user keys without granting direct table writes to clients.
  const adminClient = getSupabaseAdminClient();

  if (!adminClient) {
    if (process.env.NODE_ENV === "production") {
      console.error("CRITICAL: Supabase admin client unavailable in production for rate limiting. Failing closed.");
      return { allowed: false, current: limit, limit, remaining: 0 };
    }
    return consumeInMemory(key, bucket, limit, windowSeconds);
  }

  try {
    const { data, error } = await adminClient.rpc("consume_rate_limit", {
      p_key: key,
      p_bucket: bucket,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });

    if (error || !data) {
      console.error("Rate limiting RPC error:", error);
      if (process.env.NODE_ENV === "production") {
        return { allowed: false, current: limit, limit, remaining: 0 };
      }
      return consumeInMemory(key, bucket, limit, windowSeconds);
    }

    const res = data as unknown as RateLimitResult;
    return {
      allowed: Boolean(res.allowed),
      current: Number(res.current),
      limit: Number(res.limit),
      remaining: Number(res.remaining),
      resetAt: res.resetAt,
    };
  } catch (rpcErr) {
    console.error("Rate limiting invocation failed:", rpcErr);
    if (process.env.NODE_ENV === "production") {
      return { allowed: false, current: limit, limit, remaining: 0 };
    }
    return consumeInMemory(key, bucket, limit, windowSeconds);
  }
}

/**
 * Resets rate limit counters for a given key and optional bucket.
 */
export async function resetRateLimit(key: string, bucket?: string): Promise<void> {
  // Clear in-memory entries matching key
  for (const storeKey of Array.from(inMemoryStore.keys())) {
    if (bucket ? storeKey === `${key}:${bucket}` : storeKey.startsWith(`${key}:`)) {
      inMemoryStore.delete(storeKey);
    }
  }

  // Service-role client required to execute SECURITY DEFINER reset_rate_limit across user keys.
  const adminClient = getSupabaseAdminClient();
  if (adminClient) {
    await adminClient.rpc("reset_rate_limit", {
      p_key: key,
      p_bucket: bucket ?? null,
    });
  }
}

import { getServerEnv } from "@/lib/env";

interface UserUsageRecord {
  count: number;
  day: string; // YYYY-MM-DD
}

class UserDailyCapLimiter {
  private userUsage = new Map<string, UserUsageRecord>();

  private getTodayString(): string {
    return new Date().toISOString().split("T")[0];
  }

  public checkLimit(userId: string): { allowed: boolean; current: number; limit: number; remaining: number } {
    const env = getServerEnv();
    const configuredLimit = env.MAX_ANALYSES_PER_USER_PER_DAY;
    // Permanently guarantee at least 20 analyses per day for seamless debugging
    const limit = Math.max(20, configuredLimit || 20);
    const today = this.getTodayString();

    const record = this.userUsage.get(userId);
    if (!record || record.day !== today) {
      return { allowed: true, current: 0, limit, remaining: limit };
    }

    const remaining = Math.max(0, limit - record.count);
    return {
      allowed: record.count < limit,
      current: record.count,
      limit,
      remaining,
    };
  }

  public increment(userId: string): void {
    const today = this.getTodayString();
    const record = this.userUsage.get(userId);
    if (!record || record.day !== today) {
      this.userUsage.set(userId, { count: 1, day: today });
    } else {
      record.count += 1;
    }
  }

  public reset(userId: string): void {
    this.userUsage.delete(userId);
  }
}

const globalForLimiter = global as unknown as { userDailyCapLimiter?: UserDailyCapLimiter };
export const userDailyCapLimiter =
  globalForLimiter.userDailyCapLimiter || new UserDailyCapLimiter();
if (process.env.NODE_ENV !== "production") {
  globalForLimiter.userDailyCapLimiter = userDailyCapLimiter;
}


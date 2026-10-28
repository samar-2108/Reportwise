import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { usageTracker } from "@/lib/usage/tracker";
import { getServerEnv } from "@/lib/env";
import { userDailyCapLimiter } from "@/lib/rate-limit/daily-cap";
import { requireAdmin } from "@/lib/auth/require-admin";
import { resetRateLimit } from "@/lib/rate-limit";

const ResetSchema = z.object({
  userId: z.string().uuid("Invalid user ID format").optional(),
});

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { user } = auth;
  const stats = usageTracker.getStats();
  const env = getServerEnv();
  const userCap = userDailyCapLimiter.checkLimit(user.id);

  return NextResponse.json({
    stats,
    userCap,
    env: {
      provider: env.LLM_PROVIDER,
      modelExtract: env.GEMINI_MODEL_EXTRACT,
      modelInterpret: env.GEMINI_MODEL_INTERPRET,
      maxPerUserPerDay: env.MAX_ANALYSES_PER_USER_PER_DAY,
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { user } = auth;

  // Validate optional target userId
  let targetUserId = user.id;
  try {
    const rawBody = await request.json().catch(() => ({}));
    const parsed = ResetSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }
    if (parsed.data.userId) {
      targetUserId = parsed.data.userId;
    }
  } catch {
    // If body empty or invalid JSON, default to the caller admin
  }

  // Reset in both in-memory limiter and persistent rate limits
  userDailyCapLimiter.reset(targetUserId);
  await resetRateLimit(targetUserId).catch((err) => {
    console.warn("Could not reset persistent rate limit:", err);
  });

  const stats = usageTracker.getStats();
  const env = getServerEnv();
  const userCap = userDailyCapLimiter.checkLimit(targetUserId);

  return NextResponse.json({
    message: "Daily quota counter reset successfully",
    targetUserId,
    userCap,
    stats,
    env: {
      provider: env.LLM_PROVIDER,
      modelExtract: env.GEMINI_MODEL_EXTRACT,
      modelInterpret: env.GEMINI_MODEL_INTERPRET,
      maxPerUserPerDay: env.MAX_ANALYSES_PER_USER_PER_DAY,
    },
  });
}

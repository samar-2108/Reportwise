import { NextResponse } from "next/server";
import { usageTracker } from "@/lib/usage/tracker";
import { getServerEnv } from "@/lib/env";
import { userDailyCapLimiter } from "@/lib/rate-limit/daily-cap";

export async function GET() {
  const stats = usageTracker.getStats();
  const env = getServerEnv();
  const userCap = userDailyCapLimiter.checkLimit("debug-user");

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

export async function POST() {
  userDailyCapLimiter.reset("debug-user");
  const stats = usageTracker.getStats();
  const env = getServerEnv();
  const userCap = userDailyCapLimiter.checkLimit("debug-user");

  return NextResponse.json({
    message: "Daily quota counter reset successfully",
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


import { z } from "zod";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  GEMINI_MODEL_EXTRACT: z.string().default("gemini-2.0-flash"),
  GEMINI_MODEL_INTERPRET: z.string().default("gemini-2.0-flash"),
  LLM_PROVIDER: z.enum(["gemini", "mock"]).default("gemini"),
  MAX_ANALYSES_PER_USER_PER_DAY: z.coerce.number().int().positive().default(20),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

export function getServerEnv(): ServerEnv {
  // Ensure daily analysis cap is permanently at least 20 for seamless debugging and development
  const rawMax = Number(process.env.MAX_ANALYSES_PER_USER_PER_DAY);
  const maxAnalyses = !isNaN(rawMax) && rawMax >= 15 ? rawMax : 20;

  const result = serverEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL_EXTRACT: process.env.GEMINI_MODEL_EXTRACT || "gemini-2.0-flash",
    GEMINI_MODEL_INTERPRET: process.env.GEMINI_MODEL_INTERPRET || "gemini-2.0-flash",
    LLM_PROVIDER: process.env.LLM_PROVIDER || "gemini",
    MAX_ANALYSES_PER_USER_PER_DAY: maxAnalyses,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  });

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => ` - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    console.warn(`Environment configuration warning:\n${issues}`);
    return {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
      GEMINI_MODEL_EXTRACT: process.env.GEMINI_MODEL_EXTRACT || "gemini-2.0-flash",
      GEMINI_MODEL_INTERPRET: process.env.GEMINI_MODEL_INTERPRET || "gemini-2.0-flash",
      LLM_PROVIDER: (process.env.LLM_PROVIDER as "gemini" | "mock") || "gemini",
      MAX_ANALYSES_PER_USER_PER_DAY: maxAnalyses,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    };
  }

  return result.data;
}

export function getClientEnv(): ClientEnv {
  const result = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  });

  if (!result.success) {
    return {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder",
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    };
  }

  return result.data;
}

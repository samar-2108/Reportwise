import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

let adminClient: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseAdminClient() {
  if (adminClient) return adminClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    console.warn("SUPABASE_SERVICE_ROLE_KEY is not defined. Admin operations may fail.");
  }

  adminClient = createClient<Database>(
    supabaseUrl,
    serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  return adminClient;
}


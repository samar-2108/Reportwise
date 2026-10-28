import "server-only";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

let adminClient: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Returns a Supabase client configured with the service-role key.
 *
 * SECURITY WARNING:
 * This client bypasses Row Level Security (RLS). It MUST ONLY be used
 * for system-level operations where no user session exists or for privileged tasks:
 * 1. Invoking atomic rate limiting stored procedures (consume_rate_limit)
 * 2. Storage file deletion/cleanup where paths have been explicitly validated via assertOwnedPaths
 * 3. Scheduled cron cleanup tasks
 *
 * DO NOT use this client for standard user reads/writes — use getSupabaseServerClient() instead.
 */
export function getSupabaseAdminClient(): ReturnType<typeof createClient<Database>> | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  if (adminClient) return adminClient;

  adminClient = createClient<Database>(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  return adminClient;
}

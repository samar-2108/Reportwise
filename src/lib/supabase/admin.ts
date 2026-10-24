import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

export const DEBUG_USER_ID = "d3b00000-0000-4000-a000-000000000000";

let adminClient: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
    return null;
  }

  if (adminClient) return adminClient;

  adminClient = createClient<Database>(
    supabaseUrl,
    serviceRoleKey || anonKey!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  return adminClient;
}

export async function ensureDebugUser(client: ReturnType<typeof createClient<Database>>) {
  try {
    await client.auth.admin.createUser({
      id: DEBUG_USER_ID,
      email: "debug@reportwise.local",
      password: "DebugPassword123!",
      email_confirm: true,
    });
  } catch {
    // Already created
  }
}


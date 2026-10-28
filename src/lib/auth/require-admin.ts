import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/**
 * Checks whether the currently authenticated user is an authorized admin.
 * Requires:
 * 1. Valid authenticated session
 * 2. Confirmed email address (email_confirmed_at)
 * 3. User's lowercased email exists in ADMIN_EMAILS env variable
 */
export async function checkIsAdmin(): Promise<{ isAdmin: boolean; user: User | null }> {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user || !user.email) {
      return { isAdmin: false, user: null };
    }

    // Require email verification / confirmation
    const isConfirmed = Boolean(user.email_confirmed_at || (user as { confirmed_at?: string }).confirmed_at);
    if (!isConfirmed) {
      return { isAdmin: false, user: null };
    }

    const adminEmailsRaw = process.env.ADMIN_EMAILS || "";
    const adminEmails = adminEmailsRaw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0);

    // If no admin emails are configured, default deny (nobody is admin)
    if (adminEmails.length === 0) {
      return { isAdmin: false, user: null };
    }

    const userEmail = user.email.trim().toLowerCase();
    const isAdmin = adminEmails.includes(userEmail);

    return { isAdmin, user: isAdmin ? user : null };
  } catch {
    return { isAdmin: false, user: null };
  }
}

/**
 * Guards API routes. Returns the authenticated admin user or a generic 404 response
 * (using 404 instead of 403 to prevent route enumeration/advertising).
 */
export async function requireAdmin(): Promise<{ user: User } | NextResponse> {
  const { isAdmin, user } = await checkIsAdmin();

  if (!isAdmin || !user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return { user };
}

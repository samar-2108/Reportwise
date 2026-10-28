import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { assertOwnedPaths } from "@/lib/security/assert-owned-paths";
import { resetRateLimit } from "@/lib/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error";

export async function POST() {
  try {
    const serverSupabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await serverSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const userId = user.id;

    // 1. Purge all user files and nested report subfolders from storage bucket
    // Service-role client required to list and purge user storage prefix upon account deletion.
    const adminClient = getSupabaseAdminClient();
    if (adminClient) {
      try {
        const pathsToDelete = new Set<string>();

        // Collect paths from user report records
        const { data: userReports } = await serverSupabase
          .from("reports")
          .select("storage_file_paths")
          .eq("user_id", userId);

        userReports?.forEach((r) => {
          if (Array.isArray(r.storage_file_paths)) {
            r.storage_file_paths.forEach((p: string) => pathsToDelete.add(p));
          }
        });

        // Also search user folder structure for any unlinked/orphaned uploads
        const { data: rootItems } = await adminClient.storage
          .from("reports")
          .list(userId, { limit: 100 });

        if (rootItems) {
          for (const item of rootItems) {
            // Check for nested report directory
            const { data: nestedFiles } = await adminClient.storage
              .from("reports")
              .list(`${userId}/${item.name}`, { limit: 100 });

            if (nestedFiles && nestedFiles.length > 0) {
              nestedFiles.forEach((f) => pathsToDelete.add(`${userId}/${item.name}/${f.name}`));
            } else {
              pathsToDelete.add(`${userId}/${item.name}`);
            }
          }
        }

        if (pathsToDelete.size > 0) {
          const safePaths = assertOwnedPaths(userId, Array.from(pathsToDelete));
          await adminClient.storage.from("reports").remove(safePaths);
        }
      } catch (storageErr) {
        console.warn("Storage purge error during account data deletion:", storageErr);
      }
    }

    // 2. Delete all reports scoped to user
    const { error: reportsError } = await serverSupabase
      .from("reports")
      .delete()
      .eq("user_id", userId);

    if (reportsError) {
      console.error("Delete reports error:", reportsError.message);
    }

    // 3. Delete all chat conversations & messages scoped to user
    try {
      await serverSupabase.from("chat_messages").delete().eq("user_id", userId);
      await serverSupabase.from("chat_conversations").delete().eq("user_id", userId);
    } catch (chatErr) {
      console.warn("Could not delete chat data:", chatErr);
    }

    // 4. Delete user profile
    const { error: profileError } = await serverSupabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileError) {
      console.error("Delete profile error:", profileError.message);
    }

    // 5. Reset all rate limiting counters for this user
    try {
      await resetRateLimit(userId);
    } catch (rlErr) {
      console.warn("Could not reset rate limits on data purge:", rlErr);
    }

    return NextResponse.json({
      success: true,
      message: "All personal reports, chat conversations, and profile data have been permanently deleted.",
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, "Failed to purge user data. Please try again.", 500);
  }
}

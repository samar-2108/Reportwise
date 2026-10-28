import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { assertOwnedPaths } from "@/lib/security/assert-owned-paths";
import { safeErrorResponse } from "@/lib/security/safe-error";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Handle demo reports deletion gracefully without failing
    if (id.startsWith("demo-")) {
      return NextResponse.json({ success: true, message: "Demo report removed" });
    }

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

    // 1. Fetch report row using user-scoped client (scoped by RLS and user_id)
    const { data: report, error: selectError } = await serverSupabase
      .from("reports")
      .select("id, storage_file_paths, user_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (selectError) {
      console.error("Select report error:", selectError.message);
      return NextResponse.json(
        { error: "Failed to locate report." },
        { status: 500 }
      );
    }

    if (!report) {
      return NextResponse.json(
        { error: "Report not found." },
        { status: 404 }
      );
    }

    // 2. Remove files from storage bucket if any exist
    if (report.storage_file_paths && report.storage_file_paths.length > 0) {
      try {
        const validatedPaths = assertOwnedPaths(user.id, report.storage_file_paths);
        // Service-role client required to purge storage objects from private storage bucket.
        const adminClient = getSupabaseAdminClient();
        if (adminClient) {
          await adminClient.storage.from("reports").remove(validatedPaths);
        }
      } catch (err) {
        console.warn("Storage deletion warning:", err);
      }
    }

    // 3. Delete report row using user-scoped client
    const { error: deleteError } = await serverSupabase
      .from("reports")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Delete report error in Supabase:", deleteError.message);
      return NextResponse.json(
        { error: "Failed to delete report record." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Report and files deleted successfully" });
  } catch (error: unknown) {
    return safeErrorResponse(error, "Failed to delete report.", 500);
  }
}

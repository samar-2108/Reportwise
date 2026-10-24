import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

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
    } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdminClient();

    if (!supabase) {
      return NextResponse.json({ success: true, message: "Report deleted (offline mode)" });
    }

    // 1. Fetch report to get storage files list (scoped to authenticated user)
    const { data: report } = await supabase
      .from("reports")
      .select("id, storage_file_paths, user_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!report) {
      return NextResponse.json({ success: true, message: "Report removed" });
    }

    // 2. Remove files from storage bucket if any exist
    if (report.storage_file_paths && report.storage_file_paths.length > 0) {
      try {
        await supabase.storage.from("reports").remove(report.storage_file_paths);
      } catch (err) {
        console.warn("Storage deletion warning:", err);
      }
    }

    // 3. Delete report row (scoped to authenticated user)
    const { error: deleteError } = await supabase
      .from("reports")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Delete report error in Supabase:", deleteError);
      throw deleteError;
    }

    return NextResponse.json({ success: true, message: "Report and files deleted successfully" });
  } catch (error: unknown) {
    console.error("Delete report error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete report" },
      { status: 500 }
    );
  }
}


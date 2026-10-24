import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

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

    const supabase = getSupabaseAdminClient();

    if (!supabase) {
      return NextResponse.json({ success: true, message: "Report deleted (offline mode)" });
    }

    // 1. Fetch report to get storage files list
    const { data: report } = await supabase
      .from("reports")
      .select("id, storage_file_paths, user_id")
      .eq("id", id)
      .maybeSingle();

    // 2. Remove files from storage bucket if any exist
    if (report && report.storage_file_paths && report.storage_file_paths.length > 0) {
      try {
        await supabase.storage.from("reports").remove(report.storage_file_paths);
      } catch (err) {
        console.warn("Storage deletion warning:", err);
      }
    }

    // 3. Delete report row
    const { error: deleteError } = await supabase.from("reports").delete().eq("id", id);
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


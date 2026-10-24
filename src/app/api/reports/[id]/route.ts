import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await getSupabaseServerClient();

    // 1. Fetch report to get storage files list (auth bypassed for debugging)
    const { data: report, error: fetchError } = await supabase
      .from("reports")
      .select("id, storage_file_paths, user_id")
      .eq("id", id)
      .single();

    if (fetchError || !report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // 2. Remove files from storage bucket if any exist
    if (report.storage_file_paths && report.storage_file_paths.length > 0) {
      await supabase.storage.from("reports").remove(report.storage_file_paths);
    }

    // 3. Delete report row (RLS ensures user can only delete own row)
    const { error: deleteError } = await supabase.from("reports").delete().eq("id", id);
    if (deleteError) {
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


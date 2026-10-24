import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  try {
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
    const userId = user.id;

    if (!supabase) {
      return NextResponse.json({
        success: true,
        message: "All data cleared (offline mode).",
      });
    }

    // 1. Find all reports and storage paths
    const { data: userReports } = await supabase
      .from("reports")
      .select("storage_file_paths")
      .eq("user_id", userId);

    const allPaths: string[] = [];
    userReports?.forEach((r) => {
      if (r.storage_file_paths) {
        allPaths.push(...r.storage_file_paths);
      }
    });

    // 2. Remove files from storage
    if (allPaths.length > 0) {
      await supabase.storage.from("reports").remove(allPaths);
    }

    // 3. Delete all reports
    await supabase.from("reports").delete().eq("user_id", userId);

    // 4. Delete profile data
    await supabase.from("profiles").delete().eq("id", userId);

    return NextResponse.json({
      success: true,
      message: "All personal reports and profile data have been permanently deleted.",
    });
  } catch (error: unknown) {
    console.error("Delete all data error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to purge user data" },
      { status: 500 }
    );
  }
}


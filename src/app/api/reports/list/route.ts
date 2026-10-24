import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest) {
  try {
    const serverSupabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in with Google to view past reports." },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdminClient();

    if (supabase) {
      const { data: reports, error } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase list reports error:", error);
      } else {
        return NextResponse.json({ reports: reports || [] });
      }
    }

    return NextResponse.json({ reports: [] });
  } catch (error: unknown) {
    // Allow Next.js internal prerender bailouts to propagate
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      (error as { digest: string }).digest === "HANGING_PROMISE_REJECTION"
    ) {
      throw error;
    }

    console.error("List reports error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list reports" },
      { status: 500 }
    );
  }
}


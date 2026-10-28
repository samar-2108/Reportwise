import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const serverSupabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await serverSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to view past reports." },
        { status: 401 }
      );
    }

    // Query user reports scoped via RLS and explicit user_id filter
    const { data: reports, error } = await serverSupabase
      .from("reports")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase list reports error:", error.message);
      return NextResponse.json(
        { error: "Failed to retrieve reports. Please try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json({ reports: reports || [] });
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
      { error: "An unexpected error occurred while listing reports." },
      { status: 500 }
    );
  }
}

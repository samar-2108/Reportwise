import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Database } from "@/types/database";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refreshes the session cookie if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isAuthRoute = pathname === "/auth" || pathname.startsWith("/auth/");
  const isApiRoute = pathname.startsWith("/api/");

  // Require authentication for the entire website: unauthenticated users MUST sign in first
  if (!user && !isAuthRoute && !isApiRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth";
    if (pathname !== "/") {
      redirectUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users visiting /auth to their destination or /
  if (user && pathname === "/auth") {
    const next = request.nextUrl.searchParams.get("next") || "/";
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = next;
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

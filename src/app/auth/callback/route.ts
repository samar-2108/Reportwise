import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { Database } from "@/types/database";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";

  // Determine origin, accounting for proxies/custom domains
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";
  let targetOrigin = requestUrl.origin;
  if (!isLocalEnv && forwardedHost) {
    targetOrigin = `https://${forwardedHost}`;
  }

  const destination = `${targetOrigin}${next.startsWith("/") ? next : "/"}`;

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      // Create response first so session cookies are written directly to it
      const response = NextResponse.redirect(destination);

      const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      });

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error && data?.user) {
        // Upsert user profile
        try {
          await supabase.from("profiles").upsert(
            {
              id: data.user.id,
              email: data.user.email ?? null,
              full_name:
                data.user.user_metadata?.full_name ||
                data.user.user_metadata?.name ||
                data.user.email?.split("@")[0] ||
                "Patient",
              language: "en",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );
        } catch (profileErr) {
          console.warn("Auth callback profile upsert warning:", profileErr);
        }

        return response;
      }

      console.error("Auth callback code exchange error:", error);
    }
  }

  return NextResponse.redirect(`${targetOrigin}/auth?error=auth_callback_failed`);
}

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { Database } from "@/types/database";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const rawNext = requestUrl.searchParams.get("next") ?? "/";

  // Sanitize redirect target to strictly relative local paths
  const safeNext =
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    !rawNext.includes("\\") &&
    !rawNext.includes(":")
      ? rawNext
      : "/";

  // Enforce origin restrictions in production against Host header poisoning
  let targetOrigin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (process.env.NODE_ENV !== "production") {
    const rawHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || requestUrl.host;
    const host = rawHost.split(",")[0].trim();
    const rawProto = request.headers.get("x-forwarded-proto");
    const proto = rawProto
      ? rawProto.split(",")[0].trim()
      : host.includes("localhost") || host.includes("127.0.0.1")
      ? "http"
      : "https";
    targetOrigin = `${proto}://${host}`;
  }

  const destination = `${targetOrigin}${safeNext}`;

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      // 303 See Other is standard for OAuth redirect
      const response = NextResponse.redirect(destination, { status: 303 });

      const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, {
                ...options,
                httpOnly: true,
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
              });
            });
          },
        },
      });

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error && data?.user) {
        // Upsert user profile non-blockingly with tight timeout
        try {
          await Promise.race([
            supabase.from("profiles").upsert(
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
            ),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("profile upsert timeout")), 600)
            ),
          ]);
        } catch (profileErr) {
          console.warn("Auth callback profile upsert warning (non-fatal):", profileErr);
        }

        return response;
      }

      console.error("Auth callback code exchange error:", error?.message);
    }
  }

  return NextResponse.redirect(`${targetOrigin}/auth?error=auth_callback_failed`, { status: 303 });
}

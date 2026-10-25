import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { Database } from "@/types/database";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";

  // Robust origin determination across local dev, LAN IP (e.g. Wi-Fi testing), reverse proxies, and production domains
  const rawHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || requestUrl.host;
  const host = rawHost.split(",")[0].trim();
  const rawProto = request.headers.get("x-forwarded-proto");
  const proto = rawProto
    ? rawProto.split(",")[0].trim()
    : host.includes("localhost") || host.includes("127.0.0.1")
    ? "http"
    : "https";

  const targetOrigin = `${proto}://${host}`;
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const destination = `${targetOrigin}${safeNext}`;

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      // Create response first (303 See Other is standard for OAuth redirect)
      const response = NextResponse.redirect(destination, { status: 303 });

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
        // Upsert user profile non-blockingly with tight timeout (max 600ms)
        // so the HTTP redirect response is NEVER stalled or buffering in the browser
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

      console.error("Auth callback code exchange error:", error);
    }
  }

  return NextResponse.redirect(`${targetOrigin}/auth?error=auth_callback_failed`, { status: 303 });
}

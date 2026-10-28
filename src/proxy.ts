import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { validateCsrfOrigin } from "@/lib/security/csrf";

export async function proxy(request: NextRequest) {
  // CSRF protection on state-changing API routes (excluding cron endpoint with Bearer auth)
  if (
    ["POST", "PUT", "PATCH", "DELETE"].includes(request.method) &&
    request.nextUrl.pathname.startsWith("/api/") &&
    !request.nextUrl.pathname.startsWith("/api/cron/")
  ) {
    if (!validateCsrfOrigin(request)) {
      return NextResponse.json(
        { error: "Forbidden: cross-origin request rejected (CSRF protection)" },
        { status: 403 }
      );
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

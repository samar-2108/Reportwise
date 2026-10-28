import { NextRequest } from "next/server";

/**
 * Validates Origin and Referer headers on state-changing requests
 * to guard against Cross-Site Request Forgery (CSRF).
 */
export function validateCsrfOrigin(request: NextRequest): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    return true;
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");

  // If neither Origin nor Referer is present (e.g. non-browser API client)
  if (!origin && !referer) {
    return true;
  }

  const allowedOrigins = new Set<string>();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      allowedOrigins.add(new URL(appUrl).origin.toLowerCase());
    } catch {}
  }

  if (host) {
    const rawHost = host.split(",")[0].trim().toLowerCase();
    allowedOrigins.add(`http://${rawHost}`);
    allowedOrigins.add(`https://${rawHost}`);
  }

  if (process.env.NODE_ENV !== "production") {
    allowedOrigins.add("http://localhost:3000");
    allowedOrigins.add("http://127.0.0.1:3000");
  }

  if (origin) {
    return allowedOrigins.has(origin.toLowerCase().trim());
  }

  if (referer) {
    try {
      const refOrigin = new URL(referer).origin.toLowerCase();
      return allowedOrigins.has(refOrigin);
    } catch {
      return false;
    }
  }

  return true;
}

import { NextResponse } from "next/server";
import { QuotaExceededError } from "@/lib/llm/types";
import { UploadValidationError } from "@/lib/security/upload-validation";

/**
 * Returns a sanitized generic error response for client consumption,
 * preventing stack traces, tokens, medical report contents, or internal database
 * errors from leaking to the browser.
 */
export function safeErrorResponse(
  error: unknown,
  fallbackMessage = "An unexpected error occurred. Please try again later.",
  status = 500
): NextResponse {
  // Client-safe errors with friendly user-facing messages
  if (error instanceof UploadValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (error instanceof QuotaExceededError) {
    return NextResponse.json({ error: error.message }, { status: 429 });
  }

  // Server-side logging without sensitive report data or tokens
  const logMessage =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";

  // Redact potential bearer tokens, api keys, or email patterns from console logs
  const sanitizedLog = String(logMessage)
    .replace(/(AIzaSy[A-Za-z0-9_-]{33})/g, "[REDACTED_API_KEY]")
    .replace(/(Bearer\s+[A-Za-z0-9._-]+)/gi, "[REDACTED_AUTH_TOKEN]")
    .replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, "[REDACTED_EMAIL]");

  console.error(`[Server Error ${status}]:`, sanitizedLog);

  return NextResponse.json(
    { error: fallbackMessage },
    { status }
  );
}

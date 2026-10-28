# ReportWise Security Hardening Report

**Completed Date:** October 2026  
**Status:** All Security Review Recommendations Implemented & Verified  
**Target Environment:** Next.js 16 (App Router) + Supabase (Auth, Postgres, Storage) + Google Gemini API + Zod

---

## 🛡️ Executive Summary

A comprehensive, defense-in-depth security audit and hardening was performed on ReportWise to safeguard sensitive patient laboratory data, prevent resource exhaustion, mitigate prompt injection, eliminate IDOR/authorization vulnerabilities, and enforce zero-retention medical document privacy.

All phases were executed in strict accordance with the security review specification without breaking existing features or altering the deterministic clinical safety verification engine (`src/lib/clinical/*`).

---

## 📋 Itemized Summary of Changes

### Phase 1: Critical Vulnerabilities Fixed

1. **Admin Lockdown & Route Concealment (`/api/admin/usage` & `/admin/usage`)**
   - **Created:** `src/lib/auth/require-admin.ts` implementing `requireAdmin()` and `checkIsAdmin()`.
   - **Enforcement:** Requires a valid Supabase session, email confirmation (`user.email_confirmed_at`), and membership in the lowercased `ADMIN_EMAILS` environment variable.
   - **Route Concealment:** Unauthorized or non-admin requests receive a generic `404 Not Found` response (rather than 403) to prevent route advertising and enumeration.
   - **Server Component Gating:** `/admin/usage/page.tsx` gates server-side via `notFound()`.
   - **Debug User Cleanup:** Removed hardcoded `"debug-user"` quota reset; `POST /api/admin/usage` accepts a validated `userId` UUID or resets the calling admin.

2. **Report Hijacking & IDOR Elimination (`/api/reports/analyze`)**
   - **Root Cause Fixed:** The previous implementation used the service-role client to upsert `reports` rows using client-supplied `reportId` values, allowing arbitrary report overwriting.
   - **Ownership Verification:** Before updating, `/api/reports/analyze` queries the record scoped to the authenticated user. If a record exists and belongs to another user, a generic 404 is returned. If no record exists, a fresh server-side UUID is generated (`crypto.randomUUID()`).
   - **Client Scoping:** Replaced admin client writes with `getSupabaseServerClient()` using `.update(...).eq("id", id).eq("user_id", user.id)` and `.insert(...)`.

3. **Service-Role Admin Client De-escalation**
   - **Ordinary User Operations:** Removed `getSupabaseAdminClient()` from `/api/reports/list`, `/api/reports/[id]`, `/api/reports/extract`, `/api/reports/analyze`, and `/api/user/delete-all-data`. All user database operations now run through `getSupabaseServerClient()` under Row Level Security.
   - **Client Hardening (`src/lib/supabase/admin.ts`):** Added `import "server-only";`. Removed hardcoded `DEBUG_USER_ID` and `ensureDebugUser` with hardcoded credentials (`"DebugPassword123!"`). Removed fallback to `anonKey` (missing service key returns `null` and fails loudly).
   - **Path Traversal Defense:** Added `assertOwnedPaths(userId, paths)` in `src/lib/security/assert-owned-paths.ts`.

4. **Atomic Shared Rate Limiting**
   - **Database RPC & Table:** Added `public.rate_limits` table and `public.consume_rate_limit` stored procedure with row-level locks (`SELECT ... FOR UPDATE`) in `supabase/schema.sql` (Section 10).
   - **Implementation:** Created `src/lib/rate-limit/index.ts` supporting atomic increments and time-window rollbacks. Fails closed in production if the RPC is unreachable.
   - **Applied Rate Caps:**
     - Report Extraction: 5 uploads/min (burst) + daily analyses cap (`MAX_ANALYSES_PER_USER_PER_DAY`).
     - Report Analysis: 10 requests/min (burst) + daily analyses cap.
     - Health Chatbot: 10 messages/min (burst) + 50 messages/day.
     - Feedback: 5 submissions/hour per user or IP.
   - **Env Hardening:** Removed hardcoded `>= 15`/`20` floor on `MAX_ANALYSES_PER_USER_PER_DAY` in `src/lib/env.ts`.

---

### Phase 2: High Priority Hardening

1. **Upload Validation & Magic-Byte Sniffing (`src/lib/security/upload-validation.ts`)**
   - Inspects the raw binary file headers:
     - JPEG: `FF D8 FF`
     - PNG: `89 50 4E 47 0D 0A 1A 0A`
     - WebP: `RIFF....WEBP`
     - PDF: `%PDF`
     - HEIC: `ftyp` (brands: `heic`, `mif1`, `msf1`, `heix`, `heim`, `hevc`)
   - Rejects non-medical and executable files (`.exe`, `.sh`, `.php`, `.js`, etc.) with HTTP 400.
   - Enforces max 5 pages, 10MB per file, and 30MB total payload per request.
   - Replaces client-supplied filenames with server-generated paths: `${userId}/${reportId}/page-${index}.${extension}`.

2. **Analyze Request Validation & Prompt Injection Defense**
   - **Created:** `src/lib/schemas/analyze-request.ts` with bounded string lengths and max 150 test items.
   - **Payload Cap:** Requests exceeding 200KB body size receive HTTP 413 Payload Too Large.
   - **Control Character Stripping:** Sanitizes `\u0000-\u0008`, `\u000B-\u001F`, and `\u007F-\u009F`.
   - **Prompt Delimiters:** User clinical data in `src/prompts/interpretation.ts` and `src/prompts/extraction.ts` is enclosed in `<report_data>` and `<patient_context>` XML tags. System prompts instruct the LLM that text within these tags is untrusted clinical data, not instructions.

3. **Medical File Zero Retention & Scheduled Cleanup**
   - **Auto-Deletion on Completion:** Original report images/PDFs are deleted from storage immediately after analysis.
   - **Auto-Deletion on Error:** If extraction fails, uploaded files are immediately cleaned up.
   - **UI Toggle Removed:** In `src/app/settings/page.tsx`, removed the "keep original files" option and replaced it with an enforced zero-retention privacy badge.
   - **Cleanup Cron Route:** Created `/api/cron/cleanup` protected by `Authorization: Bearer <CRON_SECRET>`. Purges abandoned uploads older than 1 hour and prunes `rate_limits` older than 3 days.

4. **Database RLS Policy Tightening (`supabase/schema.sql`)**
   - Added `WITH CHECK (auth.uid() = id)` to `profiles` update policy.
   - Added `WITH CHECK (auth.uid() = user_id)` to `reports` and `chat_conversations` update policies.
   - Hardened `chat_messages` insert policy to verify the message belongs to a conversation owned by the authenticated user.
   - Restricted `feedback` inserts to ensure authenticated users cannot submit feedback under another user's ID. Denied update/delete on feedback (append-only).

5. **Security Headers & Content Security Policy (`next.config.ts`)**
   - Configured Content Security Policy (CSP):
     - `default-src 'self'`
     - `script-src 'self' 'unsafe-eval' 'unsafe-inline'`
     - `style-src 'self' 'unsafe-inline'`
     - `img-src 'self' data: blob: https://*.googleusercontent.com https://*.supabase.co`
     - `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com https://accounts.google.com`
     - `frame-ancestors 'none'`
     - `form-action 'self'`
     - `base-uri 'self'`
   - Added `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and HSTS (`max-age=63072000; includeSubDomains; preload`).

---

### Phase 3: Medium Priority & Hygiene

1. **Auth Callback Origin Hardening (`src/app/auth/callback/route.ts`)**
   - In production, enforces that redirect targets match `NEXT_PUBLIC_APP_URL` to protect against Host header poisoning.
   - Sanitizes `next` query parameter to relative paths (rejecting `//`, `javascript:`, backslashes).
   - Enforces cookie security flags: `httpOnly: true`, `sameSite: "lax"`, and `secure: true` in production.

2. **Generic Error Masking (`src/lib/security/safe-error.ts`)**
   - Redacts API keys, bearer tokens, and email addresses from server-side logs.
   - Returns generic, safe error messages to clients without leaking stack traces or report data.

3. **In-Memory Cache Scoping (`src/lib/cache/report-cache.ts`)**
   - `computeFilesSha256(userId, files)` and `computeInputSha256(userId, input)` scope all cache hashes by user ID.
   - Prevents cross-account cache poisoning or data exposure between users uploading identical documents.

4. **Storage Purge on Account Deletion (`src/app/api/user/delete-all-data/route.ts`)**
   - Recursively lists the user's storage directory (`${userId}/`) to delete all report files, subfolders, and orphaned uploads.
   - Clears all reports, chat messages, conversations, profile rows, and reset user rate limits.

5. **CSRF Protection (`src/lib/security/csrf.ts` & `src/proxy.ts`)**
   - Validates `Origin` and `Referer` headers on all state-changing API requests (`POST`, `PUT`, `PATCH`, `DELETE`).

6. **Continuous Integration & Secrets Auditing**
   - Added `.github/dependabot.yml` for automated dependency security updates.
   - Added `.github/workflows/ci.yml` running lint, test, typecheck, and secrets scanning.
   - Created `scripts/check-secrets.sh` (run via `npm run check:secrets`) to detect leaked API keys or credentials.

---

## 🧪 Verification & Test Results

The test suite was expanded with 24 dedicated security test assertions covering magic-byte sniffing, IDOR path traversal, rate limiting rollover, schema validation, cache isolation, safe error redaction, and CSRF Origin checks.

```bash
# 1. Secret Scanning
$ npm run check:secrets
🔍 Scanning git repository for leaked credentials and API secrets...
✅ Secret scan passed: No hardcoded secrets, credentials, or private keys detected.

# 2. Type Checking
$ npx tsc --noEmit
# 0 errors

# 3. Linter
$ npm run lint
# 0 errors

# 4. Unit & Security Test Suite
$ npm test
ℹ tests 46
ℹ suites 9
ℹ pass 46
ℹ fail 0

# 5. Production Build
$ npm run build
✓ Compiled successfully in 764ms
✓ Generating static pages (19/19)
```

---

## 🔍 Manual Verification Checklist for Owner

Use the curl commands below against your local or staging server to manually test security boundaries:

### 1. Test Admin Endpoint Stealth (404 Not Found)
```bash
# Unauthenticated GET: Must return 404 (not 401 or 403)
curl -i http://localhost:3000/api/admin/usage
# Expected: HTTP/1.1 404 Not Found

# Unauthenticated POST: Must return 404
curl -i -X POST http://localhost:3000/api/admin/usage
# Expected: HTTP/1.1 404 Not Found
```

### 2. Test Cron Cleanup Endpoint
```bash
# Missing token: Must return 401
curl -i http://localhost:3000/api/cron/cleanup
# Expected: HTTP/1.1 401 Unauthorized

# Invalid token: Must return 401
curl -i -H "Authorization: Bearer invalid-token" http://localhost:3000/api/cron/cleanup
# Expected: HTTP/1.1 401 Unauthorized

# Valid token (set CRON_SECRET=testsecret in .env.local):
curl -i -H "Authorization: Bearer testsecret" http://localhost:3000/api/cron/cleanup
# Expected: HTTP/1.1 200 OK {"success":true,"purgedFilesCount":0,"purgedRateLimitsCount":0,...}
```

### 3. Test File Sniffing & Executable Rejection
```bash
# Attempt to upload a bash script disguised as a JPG:
echo '#!/bin/bash echo hacked' > /tmp/malicious.jpg
curl -i -X POST http://localhost:3000/api/reports/extract \
  -H "Origin: http://localhost:3000" \
  -F "files=@/tmp/malicious.jpg;type=image/jpeg"
# Expected: HTTP/1.1 400 Bad Request
# {"error":"Unsupported or corrupted file format for \"malicious.jpg\". Please upload JPEG, PNG, WebP, HEIC, or PDF."}
```

### 4. Test CSRF Protection
```bash
# Cross-origin POST with foreign origin:
curl -i -X POST http://localhost:3000/api/reports/analyze \
  -H "Origin: https://evil-site.com" \
  -H "Content-Type: application/json" \
  -d '{"reportId":"00000000-0000-0000-0000-000000000000","tests":[]}'
# Expected: HTTP/1.1 403 Forbidden
# {"error":"Forbidden: cross-origin request rejected (CSRF protection)"}
```

### 5. Test Payload Size Cap
```bash
# Body exceeding 200KB:
python3 -c "import urllib.request; data = '{\"tests\":[' + ','.join(['{\"test\":\"A\",\"value\":\"1\"}'] * 10000) + ']}'; req = urllib.request.Request('http://localhost:3000/api/reports/analyze', data=data.encode(), headers={'Content-Type':'application/json','Origin':'http://localhost:3000'}, method='POST'); print(urllib.request.urlopen(req).status)"
# Expected: HTTP 413 Payload Too Large
```

---

## 📌 Remaining Risks & Owner Action Items

1. **Deploy Migration SQL in Supabase Dashboard:**
   - Open Supabase SQL Editor and execute the additions from [`supabase/schema.sql`](./supabase/schema.sql) (specifically Section 10 for `rate_limits`, `consume_rate_limit`, and the updated RLS policies).
2. **Configure Production Environment Variables:**
   - In your production host (e.g., Vercel, Supabase), set:
     - `ADMIN_EMAILS=your-verified-google-email@gmail.com`
     - `CRON_SECRET=<generate a secure 32+ character random string>`
     - `FEEDBACK_RECIPIENT_EMAIL=samarmehta845@gmail.com`
     - `NEXT_PUBLIC_APP_URL=https://your-production-domain.com`
3. **Set Up Scheduled Cleanup Cron:**
   - Configure a recurring hourly task (e.g., Vercel Cron or GitHub Actions) triggering `GET /api/cron/cleanup` with `Bearer <CRON_SECRET>`.
4. **Gemini Production API Tier:**
   - For real patient use, transition from Google AI Studio free tier to Google Cloud Vertex AI / Gemini API paid tier with zero-data-retention and HIPAA BAA terms.

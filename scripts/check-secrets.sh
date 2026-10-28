#!/usr/bin/env bash
set -euo pipefail

echo "🔍 Scanning git repository for leaked credentials and API secrets..."

FAILED=0

# Exclude patterns/files that legitimately contain template or documentation values
EXCLUDE_ARGS=(
  ":!.env.example"
  ":!scripts/check-secrets.sh"
  ":!README.md"
  ":!SECURITY_CHANGES.md"
  ":!package-lock.json"
)

# 1. Check for Google Gemini API Keys (AIzaSy...)
if git grep -E -I "AIzaSy[A-Za-z0-9_-]{33}" -- . "${EXCLUDE_ARGS[@]}" 2>/dev/null; then
  echo "❌ CRITICAL: Potential Google Gemini API Key found in tracked files!"
  FAILED=1
fi

# 2. Check for private cryptographic keys
if git grep -E -I "-----BEGIN (RSA |EC |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY" -- . "${EXCLUDE_ARGS[@]}" 2>/dev/null; then
  echo "❌ CRITICAL: Private cryptographic key found in tracked files!"
  FAILED=1
fi

# 3. Check for raw Supabase Service Role JWTs (eyJh...)
if git grep -E -I "eyJh[A-Za-z0-9_-]{20,}\.eyJh[A-Za-z0-9_-]{20,}" -- . "${EXCLUDE_ARGS[@]}" 2>/dev/null; then
  echo "❌ CRITICAL: Potential Supabase service role JWT found in tracked files!"
  FAILED=1
fi

# 4. Check for hardcoded debug passwords
if git grep -E -I "(DebugPassword|password\s*=\s*['\"][^'\"]{8,}['\"])" -- . "${EXCLUDE_ARGS[@]}" 2>/dev/null; then
  echo "❌ CRITICAL: Hardcoded password detected in tracked source code!"
  FAILED=1
fi

if [ "$FAILED" -eq 1 ]; then
  echo "🚨 Secret scan FAILED. Secrets must be removed from tracked code and rotated immediately."
  exit 1
fi

echo "✅ Secret scan passed: No hardcoded secrets, credentials, or private keys detected."
exit 0

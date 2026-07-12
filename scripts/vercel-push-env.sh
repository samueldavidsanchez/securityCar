#!/usr/bin/env bash
#
# Pushes environment variables to the linked Vercel project.
#
# Usage:
#   1. vercel login        (once)
#   2. vercel link         (from repo root; set Root Directory = apps/web)
#   3. Create scripts/.env.vercel with the REAL values (see keys below).
#   4. bash scripts/vercel-push-env.sh [production|preview|development]
#
# scripts/.env.vercel is gitignored. Never commit real secrets.

set -euo pipefail

TARGET="${1:-production}"
ENV_FILE="$(dirname "$0")/.env.vercel"

if [ ! -f "$ENV_FILE" ]; then
  cat >&2 <<EOF
Missing $ENV_FILE. Create it with your real values:

  NEXT_PUBLIC_SUPABASE_URL=...
  NEXT_PUBLIC_SUPABASE_ANON_KEY=...
  SUPABASE_SERVICE_ROLE_KEY=...
  FLESPI_TOKEN=...
  FLESPI_WEBHOOK_SECRET=...
  NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
EOF
  exit 1
fi

echo "Pushing env vars to Vercel ($TARGET)…"
while IFS='=' read -r key value; do
  [[ "$key" =~ ^[[:space:]]*# || -z "${key// }" ]] && continue
  # Remove the var first so re-runs don't error on duplicates.
  vercel env rm "$key" "$TARGET" --yes >/dev/null 2>&1 || true
  printf '%s' "$value" | vercel env add "$key" "$TARGET" >/dev/null
  echo "  ✓ $key"
done < "$ENV_FILE"

echo "Done. Redeploy for changes to take effect:  vercel deploy --prod"

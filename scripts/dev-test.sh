#!/usr/bin/env bash
# ============================================================================
# One-command local test sandbox for Spice & Slice.
#
#   bash scripts/dev-test.sh           # start everything
#   bash scripts/dev-test.sh --reset   # also wipe + re-seed the local DB first
#
# Brings up, against the LOCAL Supabase stack only (never prod):
#   1. Supabase stack   (db / api / storage)            http://127.0.0.1:54321
#   2. Edge functions   (served with supabase/functions/.env.test)
#   3. Vite dev server  (--mode test → reads .env.test)  http://localhost:5173
#
# NOTE: checkout completion is frontend-driven (the success page calls
# complete-stripe-order with the session id), so NO `stripe listen` webhook
# forwarding is required — just a Stripe TEST secret key in the functions env.
#
# Ctrl-C tears the functions + vite processes down cleanly. The Supabase stack
# is left running (stop it with `npx supabase stop`).
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

FN_ENV="supabase/functions/.env.test"
FE_ENV=".env.test"

red()  { printf '\033[31m%s\033[0m\n' "$*"; }
grn()  { printf '\033[32m%s\033[0m\n' "$*"; }
ylw()  { printf '\033[33m%s\033[0m\n' "$*"; }

# --- preflight -------------------------------------------------------------
command -v docker >/dev/null      || { red "Docker not found — install Docker Desktop."; exit 1; }
docker info >/dev/null 2>&1        || { red "Docker daemon not running — start Docker Desktop."; exit 1; }
[ -f "$FN_ENV" ]                   || { red "Missing $FN_ENV (copy from $FN_ENV.example and fill it)."; exit 1; }
[ -f "$FE_ENV" ]                   || { red "Missing $FE_ENV (copy from $FE_ENV.example and fill it)."; exit 1; }

if ! grep -q 'STRIPE_SECRET_KEY=sk_test_' "$FN_ENV" 2>/dev/null; then
  ylw "⚠  STRIPE_SECRET_KEY is not a sk_test_ key in $FN_ENV — card-checkout tests will fail."
fi

# --- 1. Supabase stack -----------------------------------------------------
if npx supabase status >/dev/null 2>&1; then
  grn "✓ Supabase stack already running"
else
  grn "▶ Starting Supabase stack…"
  npx supabase start
fi

if [ "${1:-}" = "--reset" ]; then
  ylw "▶ Resetting local DB (baseline + seed)…"
  npx supabase db reset
fi

# --- cleanup trap ----------------------------------------------------------
PIDS=()
cleanup() {
  echo
  ylw "Shutting down functions + vite…"
  for pid in "${PIDS[@]:-}"; do kill "$pid" 2>/dev/null || true; done
  ylw "Supabase stack left running — stop it with: npx supabase stop"
}
trap cleanup EXIT INT TERM

# --- 2. Edge functions -----------------------------------------------------
grn "▶ Serving edge functions (env: $FN_ENV)…"
npx supabase functions serve --env-file "$FN_ENV" &
PIDS+=($!)

# --- 3. Vite dev (test mode) ----------------------------------------------
grn "▶ Starting Vite dev server in test mode → http://localhost:5173"
npm run dev:test &
PIDS+=($!)

grn "
Sandbox up:
  App        → http://localhost:5173
  Supabase   → http://127.0.0.1:54321   (Studio: http://127.0.0.1:54323)
  Functions  → http://127.0.0.1:54321/functions/v1/<name>
Press Ctrl-C to stop functions + vite.
"
wait

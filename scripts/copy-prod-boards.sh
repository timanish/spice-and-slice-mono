#!/usr/bin/env bash
# ============================================================================
# Copy the production tv_menu_boards into the LOCAL stack (read-only on prod).
# Useful after `supabase db reset`, which re-seeds and wipes local boards.
#
#   SUPABASE_DB_PASSWORD='...' bash scripts/copy-prod-boards.sh
#
# DB password: Supabase Dashboard → Project Settings → Database. The board
# `config` holds absolute storage URLs, so the menu images load locally too.
# The seeded local "main" demo board is preserved.
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

: "${SUPABASE_DB_PASSWORD:?Set SUPABASE_DB_PASSWORD (Dashboard → Settings → Database)}"
REF="isexlpmxnhuezhkmbuyu"
PROD="postgresql://postgres.${REF}:${SUPABASE_DB_PASSWORD}@aws-0-us-west-2.pooler.supabase.com:5432/postgres"
CONTAINER="supabase_db_spice-and-slice-bazaar"

docker ps --format '{{.Names}}' | grep -q "$CONTAINER" || {
  echo "Local stack not running — start it with: npx supabase start"; exit 1;
}

echo "▶ Dumping prod tv_menu_boards…"
docker exec "$CONTAINER" pg_dump "$PROD" --data-only --table=public.tv_menu_boards \
  --column-inserts --no-owner --no-privileges > /tmp/prod-boards.sql

# Replace just the prod-sourced boards locally (keep the seeded 'main' demo).
SLUGS=$(docker exec "$CONTAINER" psql "$PROD" -tAc \
  "select string_agg(quote_literal(slug), ',') from tv_menu_boards where slug is not null;")
if [ -n "$SLUGS" ]; then
  docker exec "$CONTAINER" psql -U postgres -d postgres -q \
    -c "delete from public.tv_menu_boards where slug in ($SLUGS);"
fi
cat /tmp/prod-boards.sql | docker exec -i "$CONTAINER" psql -U postgres -d postgres -q -v ON_ERROR_STOP=1
rm -f /tmp/prod-boards.sql

echo "✓ Local tv_menu_boards now:"
docker exec "$CONTAINER" psql -U postgres -d postgres -tAF'|' \
  -c "select name, slug, config->>'layout' from tv_menu_boards order by name;"

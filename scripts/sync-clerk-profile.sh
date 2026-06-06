#!/usr/bin/env bash
# ============================================================================
# Sync a Clerk DEV user into the LOCAL Supabase `profiles` table (+ optional
# admin role + empty cart). Needed because the clerk-webhook that normally
# creates profiles in prod does not fire against localhost.
#
#   bash scripts/sync-clerk-profile.sh you@example.com           # customer
#   bash scripts/sync-clerk-profile.sh you@example.com --admin   # + admin role
#
# Run it once after signing into the local app (http://localhost:5173) with
# that Clerk account, so carts/checkout work for you.
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

EMAIL="${1:-}"
ADMIN="${2:-}"
[ -z "$EMAIL" ] && { echo "usage: $0 <email> [--admin]"; exit 1; }

DB="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
CONTAINER="supabase_db_spice-and-slice-bazaar"

# Resolve Clerk user id + name from the dev instance.
# (Plain command substitution — avoids bash-only process substitution and the
#  readonly `UID` shell variable.)
RESOLVED=$(clerk users list --json 2>/dev/null | python3 -c "
import sys, json
email = '$EMAIL'.lower()
d = json.load(sys.stdin)
users = d if isinstance(d, list) else d.get('data', [])
for u in users:
    for e in (u.get('email_addresses') or []):
        if (e.get('email_address') or '').lower() == email:
            name = ' '.join(filter(None, [u.get('first_name'), u.get('last_name')])) or email
            print(u['id'] + '\t' + name)
            sys.exit(0)
sys.exit(1)
")
[ -z "$RESOLVED" ] && { echo "No Clerk dev user found for $EMAIL"; exit 1; }

CLERK_UID=$(printf '%s' "$RESOLVED" | cut -f1)
NAME=$(printf '%s' "$RESOLVED" | cut -f2-)
echo "Clerk user: $CLERK_UID  ($NAME)"

SQL="
insert into public.profiles (id, email, full_name, profile_completed, onboarding_shown)
values ('$CLERK_UID', '$EMAIL', '$NAME', true, true)
on conflict (id) do update set email = excluded.email, full_name = excluded.full_name;

insert into public.carts (user_id)
select '$CLERK_UID' where not exists (select 1 from public.carts where user_id = '$CLERK_UID');
"
# get-user-role uses .single() on user_roles, so a user must have AT MOST ONE
# row. Replace any existing roles with the desired single role.
if [ "$ADMIN" = "--admin" ]; then
  SQL="$SQL
delete from public.user_roles where user_id = '$CLERK_UID';
insert into public.user_roles (user_id, role) values ('$CLERK_UID', 'admin');
"
else
  # Plain customer: no admin row (get-user-role defaults to 'user' when none).
  SQL="$SQL
delete from public.user_roles where user_id = '$CLERK_UID';
"
fi

printf '%s' "$SQL" | docker exec -i "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1
echo "✓ Synced $EMAIL into local profiles${ADMIN:+ (admin)}."

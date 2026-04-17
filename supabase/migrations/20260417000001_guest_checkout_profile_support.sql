-- Guest checkout support: extend profiles to represent no-login customers,
-- and add a rate-limit table for guest order creation.

-- 1. Add guest flag + claim tracking to profiles.
--    Guest profiles reuse the existing email / full_name / phone_number columns.
--    When a guest later creates a Clerk account, claim-guest-profile edge
--    function migrates their orders onto the new Clerk profile row and marks
--    the guest row as claimed.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS claimed_clerk_id TEXT;

COMMENT ON COLUMN public.profiles.is_guest IS
  'TRUE if this profile was created via guest checkout (no Clerk account).';
COMMENT ON COLUMN public.profiles.claimed_clerk_id IS
  'Clerk user ID that claimed this guest profile post-checkout. NULL until claimed.';
COMMENT ON COLUMN public.profiles.claimed_at IS
  'Timestamp when a Clerk user claimed this guest profile.';

-- Partial index for the guest-lookup path: find an unclaimed guest profile
-- by email so repeat guest checkouts from the same email reuse the same row.
CREATE INDEX IF NOT EXISTS idx_profiles_unclaimed_guest_email
  ON public.profiles (email)
  WHERE is_guest = TRUE AND claimed_clerk_id IS NULL;

-- 2. Rate-limit table for create-guest-pending-order.
--    Edge function increments on each attempt and rejects if over threshold
--    within a rolling window. Stateless edge functions can't rely on memory.
CREATE TABLE IF NOT EXISTS public.guest_order_rate_limits (
  ip TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 1,
  first_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.guest_order_rate_limits DISABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.guest_order_rate_limits IS
  'RLS DISABLED - Edge-function only. Rolling-window rate limits for guest checkout per IP.';

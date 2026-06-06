-- claim_guest_profile(real_user_id, clerk_email)
--
-- Atomically reparents a guest profile's orders and addresses onto a real
-- Clerk profile row, then marks the guest profile as claimed.
--
-- Safe to call multiple times: matches only unclaimed guest rows, and the
-- profiles.email UNIQUE constraint is respected by clearing email on the
-- guest row before the real row adopts the data.
--
-- Returns the number of orders reparented (0 if no matching guest profile).
CREATE OR REPLACE FUNCTION public.claim_guest_profile(
  _real_user_id TEXT,
  _clerk_email  TEXT
) RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  guest_row     public.profiles%ROWTYPE;
  orders_moved  INTEGER := 0;
  moved_this    INTEGER;
BEGIN
  IF _real_user_id IS NULL OR _clerk_email IS NULL THEN
    RAISE EXCEPTION 'real_user_id and clerk_email are required';
  END IF;

  -- The target Clerk profile must already exist (created via clerk-webhook
  -- or at first authenticated request). Fail fast if it does not.
  PERFORM 1 FROM public.profiles WHERE id = _real_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target profile % does not exist', _real_user_id;
  END IF;

  -- Iterate over any unclaimed guest profiles matching the email. Normally
  -- at most one, but the loop makes the function resilient to duplicates.
  FOR guest_row IN
    SELECT *
    FROM public.profiles
    WHERE is_guest = TRUE
      AND claimed_clerk_id IS NULL
      AND email = _clerk_email
      AND id <> _real_user_id
  LOOP
    UPDATE public.orders
    SET user_id = _real_user_id
    WHERE user_id = guest_row.id;
    GET DIAGNOSTICS moved_this = ROW_COUNT;
    orders_moved := orders_moved + moved_this;

    UPDATE public.user_addresses
    SET user_id = _real_user_id
    WHERE user_id = guest_row.id;

    -- Clear the guest row's email so the real profile keeps its uniqueness,
    -- then flag the row as claimed. We keep the guest row as an audit trail
    -- rather than deleting it (ON DELETE CASCADE on orders would void history).
    UPDATE public.profiles
    SET email             = NULL,
        is_guest          = FALSE,
        claimed_clerk_id  = _real_user_id,
        claimed_at        = NOW(),
        updated_at        = NOW()
    WHERE id = guest_row.id;
  END LOOP;

  RETURN orders_moved;
END;
$$;

COMMENT ON FUNCTION public.claim_guest_profile(TEXT, TEXT) IS
  'Atomically reparents guest orders/addresses onto a Clerk profile and marks the guest row claimed. Called by claim-guest-profile edge function.';

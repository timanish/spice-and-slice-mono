-- Fix ordering in claim_guest_profile.
--
-- Previous version reparented orders before guaranteeing the target profile
-- row existed, which tripped orders_user_id_fkey when the caller signed up
-- and the autoCreateProfile insert had been silently swallowed by the
-- UNIQUE(email) collision against the guest row.
--
-- New order per guest match:
--   1. NULL the guest email (frees UNIQUE so the real profile can take it)
--   2. UPSERT the real profile with the email
--   3. Reparent orders and addresses onto the real profile id
--   4. Mark guest row claimed (audit trail, keeps order history referenceable)

CREATE OR REPLACE FUNCTION public.claim_guest_profile(
  _real_user_id TEXT,
  _clerk_email  TEXT
) RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  guest_row         public.profiles%ROWTYPE;
  orders_moved      INTEGER := 0;
  moved_this        INTEGER;
  normalized_email  TEXT;
BEGIN
  IF _real_user_id IS NULL OR _clerk_email IS NULL OR _clerk_email = '' THEN
    RAISE EXCEPTION 'real_user_id and clerk_email are required';
  END IF;

  normalized_email := LOWER(TRIM(_clerk_email));

  FOR guest_row IN
    SELECT *
    FROM public.profiles
    WHERE is_guest = TRUE
      AND claimed_clerk_id IS NULL
      AND LOWER(email) = normalized_email
      AND id <> _real_user_id
  LOOP
    UPDATE public.profiles
    SET email = NULL, updated_at = NOW()
    WHERE id = guest_row.id;

    INSERT INTO public.profiles (id, email, is_guest, onboarding_shown)
    VALUES (_real_user_id, normalized_email, FALSE, FALSE)
    ON CONFLICT (id) DO UPDATE
      SET email      = EXCLUDED.email,
          updated_at = NOW();

    UPDATE public.orders
    SET user_id = _real_user_id
    WHERE user_id = guest_row.id;
    GET DIAGNOSTICS moved_this = ROW_COUNT;
    orders_moved := orders_moved + moved_this;

    UPDATE public.user_addresses
    SET user_id = _real_user_id
    WHERE user_id = guest_row.id;

    UPDATE public.profiles
    SET is_guest         = FALSE,
        claimed_clerk_id = _real_user_id,
        claimed_at       = NOW(),
        updated_at       = NOW()
    WHERE id = guest_row.id;
  END LOOP;

  -- Safety net for callers with no guest match: make sure the real profile
  -- still exists. Handles rare cases where autoCreateProfile failed for
  -- reasons unrelated to a guest email collision.
  INSERT INTO public.profiles (id, email, is_guest, onboarding_shown)
  VALUES (_real_user_id, normalized_email, FALSE, FALSE)
  ON CONFLICT (id) DO NOTHING;

  RETURN orders_moved;
END;
$$;

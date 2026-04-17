-- Replace claim_guest_profile with a self-healing version.
--
-- Edge case: when a guest's email matches the email a user later signs up
-- with in Clerk, autoCreateProfile (supabase/functions/_shared/clerk-auth.ts)
-- silently swallows the 23505 UNIQUE(email) collision and the real profile
-- row never gets created. This RPC is the single place that reconciles the
-- two — it clears the guest row's email first (freeing the UNIQUE slot) and
-- then either updates or inserts the real profile row before reparenting.

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
  real_exists       BOOLEAN;
BEGIN
  IF _real_user_id IS NULL OR _clerk_email IS NULL OR _clerk_email = '' THEN
    RAISE EXCEPTION 'real_user_id and clerk_email are required';
  END IF;

  normalized_email := LOWER(TRIM(_clerk_email));

  -- Reparent every unclaimed guest profile matching this email. Clearing
  -- the email on the guest row frees the UNIQUE constraint so the real
  -- profile can adopt it in the next step.
  FOR guest_row IN
    SELECT *
    FROM public.profiles
    WHERE is_guest = TRUE
      AND claimed_clerk_id IS NULL
      AND LOWER(email) = normalized_email
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

    UPDATE public.profiles
    SET email             = NULL,
        is_guest          = FALSE,
        claimed_clerk_id  = _real_user_id,
        claimed_at        = NOW(),
        updated_at        = NOW()
    WHERE id = guest_row.id;
  END LOOP;

  -- Ensure the real Clerk profile row exists with the correct email.
  -- Create it if missing (autoCreateProfile may have failed earlier), or
  -- patch the email if the row exists but lacks it for any reason.
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _real_user_id)
  INTO real_exists;

  IF real_exists THEN
    UPDATE public.profiles
    SET email      = normalized_email,
        updated_at = NOW()
    WHERE id = _real_user_id
      AND (email IS NULL OR LOWER(email) <> normalized_email);
  ELSE
    INSERT INTO public.profiles (id, email, is_guest, onboarding_shown)
    VALUES (_real_user_id, normalized_email, FALSE, FALSE);
  END IF;

  RETURN orders_moved;
END;
$$;

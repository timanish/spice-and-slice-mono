-- Enforce one-profile-per-email.
--
-- The base migration (20251110000000_create_base_tables.sql) declared
-- `email TEXT UNIQUE`, but it used CREATE TABLE IF NOT EXISTS against a
-- pre-existing schema and was a no-op in production — the UNIQUE constraint
-- never landed. That let autoCreateProfile silently create a second
-- profile row for emails that already had a guest profile, breaking
-- findOrCreateGuestProfile.
--
-- Partial index (WHERE email IS NOT NULL) lets claimed guest rows keep
-- email=NULL for audit history without competing with the real profile
-- row that now owns the email. PostgreSQL's default UNIQUE already treats
-- NULLs as distinct, but the partial form is more explicit about intent.

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique
  ON public.profiles (LOWER(email))
  WHERE email IS NOT NULL;

COMMENT ON INDEX public.idx_profiles_email_unique IS
  'Enforces case-insensitive uniqueness of non-NULL emails across all profile rows (guest and Clerk).';

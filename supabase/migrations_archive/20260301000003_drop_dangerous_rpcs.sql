-- =============================================================================
-- Drop dangerous RPC functions that bypass RLS via SECURITY DEFINER
-- =============================================================================
-- These functions accept arbitrary user IDs and can probe sensitive data.
-- All access now goes through authenticated edge functions.
-- REVOKE didn't work (possibly due to default privileges or schema cache),
-- so we drop them entirely.

DROP FUNCTION IF EXISTS public.has_role(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.validate_profile_access(TEXT, TEXT);

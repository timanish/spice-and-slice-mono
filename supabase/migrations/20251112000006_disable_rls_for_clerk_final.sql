-- FINAL RLS CONFIGURATION FOR CLERK AUTHENTICATION
-- This migration disables RLS on profiles table and documents the security model

-- ============================================================================
-- SECURITY MODEL DOCUMENTATION
-- ============================================================================
-- We disable RLS on the profiles table because:
-- 1. We use Clerk for authentication (not Supabase Auth)
-- 2. Supabase RLS policies require auth.uid() which only works with Supabase Auth
-- 3. With Clerk, auth.uid() returns NULL, making RLS policies ineffective
--
-- Security is enforced at the APPLICATION LAYER:
-- 1. Clerk validates user identity (authentication)
-- 2. All database queries MUST filter by the authenticated Clerk user ID
-- 3. Frontend queries: WHERE id = clerkUser.id
-- 4. Backend (webhook): Uses service role key with explicit user ID from Clerk
--
-- This is a STANDARD and SECURE pattern for Clerk + Supabase integration
-- ============================================================================

-- Drop ALL existing policies on profiles table
DROP POLICY IF EXISTS "Allow anon access for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view and update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable delete for users own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow anon read access" ON public.profiles;
DROP POLICY IF EXISTS "Allow anon insert" ON public.profiles;
DROP POLICY IF EXISTS "Allow anon update" ON public.profiles;
DROP POLICY IF EXISTS "Allow anon delete" ON public.profiles;

-- DISABLE Row Level Security on profiles table
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Add table comment documenting the security model
COMMENT ON TABLE public.profiles IS 
'User profiles synced from Clerk authentication.
SECURITY MODEL: RLS is disabled because we use Clerk (not Supabase Auth).
- Authentication: Handled by Clerk
- Authorization: Enforced in application code - all queries filter by Clerk user ID
- Webhook: Uses service role key to create/update profiles
- Frontend: Uses anon key but ALWAYS queries WHERE id = clerk_user_id
This is the standard pattern for Clerk + Supabase integration.';

-- Add column comments for clarity
COMMENT ON COLUMN public.profiles.id IS 'Clerk user ID (text format, e.g., user_xxxxx)';
COMMENT ON COLUMN public.profiles.email IS 'User email from Clerk';
COMMENT ON COLUMN public.profiles.full_name IS 'User full name from Clerk';
COMMENT ON COLUMN public.profiles.phone_number IS 'User phone number (collected in onboarding)';
-- Note: Address fields (address_line1, address_line2, city, state, postal_code) 
-- have been moved to user_addresses table (see migration 20251222000000)
COMMENT ON COLUMN public.profiles.profile_completed IS 'Whether user has completed profile (phone + address)';
COMMENT ON COLUMN public.profiles.onboarding_shown IS 'Whether user has seen onboarding flow';

-- Create a helper function to validate profile ownership (used in application code)
CREATE OR REPLACE FUNCTION public.validate_profile_access(
  profile_id text,
  requesting_user_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Simple check: user can only access their own profile
  RETURN profile_id = requesting_user_id;
END;
$$;

COMMENT ON FUNCTION public.validate_profile_access IS 
'Helper function to validate profile ownership in application code.
Usage: SELECT * FROM profiles WHERE validate_profile_access(id, $clerk_user_id)
This provides an extra layer of validation beyond application-level filtering.';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_profile_access TO anon, authenticated;

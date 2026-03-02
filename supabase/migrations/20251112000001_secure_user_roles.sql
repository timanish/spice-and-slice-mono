-- Secure the user_roles table
-- Remove public read access and allow users to only see their own role

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_roles;

-- Since we're using Clerk (not Supabase Auth), we can't use auth.uid()
-- Instead, we rely on application-level security where the app only queries
-- for the current user's role using their Clerk ID

-- Option 1: Complete lockdown - only service role can access
-- This is the most secure but requires all user role checks to go through Edge Functions
CREATE POLICY "No direct access - use service role" ON public.user_roles
  FOR SELECT USING (false);

-- This means:
-- 1. Webhooks work fine (service role bypasses RLS)
-- 2. Frontend cannot directly query user_roles
-- 3. You need to create an Edge Function to check user roles securely

-- For INSERT/UPDATE/DELETE, only service role
CREATE POLICY "Service role only for modifications" ON public.user_roles
  FOR INSERT WITH CHECK (false);

CREATE POLICY "Service role only for updates" ON public.user_roles
  FOR UPDATE USING (false);

CREATE POLICY "Service role only for deletes" ON public.user_roles
  FOR DELETE USING (false);

-- Add a comment explaining the security model
COMMENT ON TABLE public.user_roles IS 'RLS enabled with strict policies. All access restricted to service role. Frontend should use Edge Functions to check user roles securely.';


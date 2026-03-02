-- Fix profiles table RLS policies to prevent public data exposure
-- This assumes Clerk JWTs are configured in Supabase to make auth.uid() available

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable delete for users own profile" ON public.profiles;

-- Create secure policies that restrict access to own profile only
-- Users can only view their own profile
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid()::text = id);

-- Users can only insert their own profile
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid()::text = id);

-- Users can only update their own profile
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid()::text = id);

-- Users can only delete their own profile
CREATE POLICY "Users can delete their own profile" ON public.profiles
  FOR DELETE
  USING (auth.uid()::text = id);

-- Add comment explaining the security model
COMMENT ON TABLE public.profiles IS 'RLS enabled with user-scoped policies. Requires Clerk JWT validation configured in Supabase Auth settings for auth.uid() to work properly.';
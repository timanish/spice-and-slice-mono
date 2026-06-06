-- Drop the overly permissive policy that allows anyone to read all user roles
DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_roles;

-- Create a restrictive policy that only allows users to see their own role
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id::text = auth.uid()::text);
-- Drop the old UUID-based has_role function with CASCADE to remove dependent policies
-- These policies were created for the old UUID-based auth system
DROP FUNCTION IF EXISTS has_role(uuid, app_role) CASCADE;
DROP FUNCTION IF EXISTS has_role(uuid, text) CASCADE;

-- Create has_role function for checking user roles with TEXT user_id (for Clerk)
-- This function checks if a user has a specific role in the user_roles table
CREATE OR REPLACE FUNCTION has_role(_user_id TEXT, _role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = _user_id 
    AND role = _role
  );
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION has_role(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION has_role(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION has_role(TEXT, TEXT) TO service_role;

-- Add comment
COMMENT ON FUNCTION has_role(TEXT, TEXT) IS 'Check if a user has a specific role. Uses TEXT user_id for Clerk compatibility. Used by application to verify admin access.';

-- Note: The policies that depended on the old has_role function have been dropped.
-- These tables have RLS disabled for Clerk compatibility, so policies are not needed:
-- - products
-- - promo_codes
-- - menu_items
-- - orders
-- - order_items
-- - hero_slides

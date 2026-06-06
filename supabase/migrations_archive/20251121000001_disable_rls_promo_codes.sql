-- Disable RLS on promo_codes table for Clerk compatibility
-- Similar to profiles, orders, and other tables that use Clerk auth

-- Drop any existing policies
DROP POLICY IF EXISTS "Admins can manage promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Everyone can view active promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Public read access to promo codes" ON public.promo_codes;

-- Disable Row Level Security
ALTER TABLE public.promo_codes DISABLE ROW LEVEL SECURITY;

-- Add table comment documenting the security model
COMMENT ON TABLE public.promo_codes IS 
'Promotional discount codes for orders.
SECURITY MODEL: RLS is disabled because we use Clerk (not Supabase Auth).
- Authentication: Handled by Clerk
- Authorization: Admin-only operations enforced in application code via AdminGuard
- Frontend: Uses anon key but admin routes protected by Clerk role checks
- Backend functions: Use service role key with validation
This follows the same pattern as other admin-managed tables in the Clerk + Supabase integration.';

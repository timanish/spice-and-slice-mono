-- Disable RLS on products table for Clerk compatibility
-- Similar to profiles, promo_codes, and other tables that use Clerk auth

-- Drop any existing policies
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Everyone can view active products" ON public.products;
DROP POLICY IF EXISTS "Public read access to products" ON public.products;
DROP POLICY IF EXISTS "Allow public read access" ON public.products;
DROP POLICY IF EXISTS "Allow admin full access" ON public.products;

-- Disable Row Level Security
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;

-- Add table comment documenting the security model
COMMENT ON TABLE public.products IS 
'Product catalog for the store.
SECURITY MODEL: RLS is disabled because we use Clerk (not Supabase Auth).
- Authentication: Handled by Clerk
- Authorization: Admin-only operations enforced in application code via AdminGuard
- Frontend: Uses anon key but admin routes protected by Clerk role checks
- Public read access: All users can view products (no auth required)
- Admin write access: Protected by AdminGuard component in application layer
This follows the same pattern as other admin-managed tables in the Clerk + Supabase integration.';

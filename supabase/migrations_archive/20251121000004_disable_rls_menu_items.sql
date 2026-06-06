-- Disable RLS on menu_items table for Clerk compatibility
-- Similar to profiles, promo_codes, products, and other tables that use Clerk auth

-- Drop any existing policies
DROP POLICY IF EXISTS "Admins can manage menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Everyone can view menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Public read access to menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Allow public read access" ON public.menu_items;
DROP POLICY IF EXISTS "Allow admin full access" ON public.menu_items;

-- Disable Row Level Security
ALTER TABLE public.menu_items DISABLE ROW LEVEL SECURITY;

-- Add table comment documenting the security model
COMMENT ON TABLE public.menu_items IS 
'Menu items for catering and restaurant services.
SECURITY MODEL: RLS is disabled because we use Clerk (not Supabase Auth).
- Authentication: Handled by Clerk
- Authorization: Admin-only operations enforced in application code via AdminGuard
- Frontend: Uses anon key but admin routes protected by Clerk role checks
- Public read access: All users can view menu items (no auth required)
- Admin write access: Protected by AdminGuard component in application layer
This follows the same pattern as other admin-managed tables in the Clerk + Supabase integration.';

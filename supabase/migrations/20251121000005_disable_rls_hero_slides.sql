-- Disable RLS on hero_slides table for Clerk compatibility
-- Similar to profiles, promo_codes, products, menu_items, and other tables that use Clerk auth

-- Drop any existing policies
DROP POLICY IF EXISTS "Admins can manage all hero slides" ON public.hero_slides;
DROP POLICY IF EXISTS "Everyone can view active hero slides" ON public.hero_slides;
DROP POLICY IF EXISTS "Public read access to hero slides" ON public.hero_slides;
DROP POLICY IF EXISTS "Allow public read access" ON public.hero_slides;
DROP POLICY IF EXISTS "Allow admin full access" ON public.hero_slides;

-- Disable Row Level Security
ALTER TABLE public.hero_slides DISABLE ROW LEVEL SECURITY;

-- Add table comment documenting the security model
COMMENT ON TABLE public.hero_slides IS 
'Hero carousel slides for the home page.
SECURITY MODEL: RLS is disabled because we use Clerk (not Supabase Auth).
- Authentication: Handled by Clerk
- Authorization: Admin-only operations enforced in application code via AdminGuard
- Frontend: Uses anon key but admin routes protected by Clerk role checks
- Public read access: All users can view active slides (no auth required)
- Admin write access: Protected by AdminGuard component in application layer
This follows the same pattern as other admin-managed tables in the Clerk + Supabase integration.';

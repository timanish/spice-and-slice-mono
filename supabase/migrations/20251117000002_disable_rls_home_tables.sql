-- Disable RLS on home page related tables for Clerk compatibility
-- These tables are managed by admin users only, authentication handled at application layer

-- Disable RLS on collections table
ALTER TABLE public.collections DISABLE ROW LEVEL SECURITY;

-- Disable RLS on festivals table
ALTER TABLE public.festivals DISABLE ROW LEVEL SECURITY;

-- Disable RLS on festival_products table
ALTER TABLE public.festival_products DISABLE ROW LEVEL SECURITY;

-- Disable RLS on featured_products table
ALTER TABLE public.featured_products DISABLE ROW LEVEL SECURITY;

-- Disable RLS on testimonials table
ALTER TABLE public.testimonials DISABLE ROW LEVEL SECURITY;

-- Disable RLS on recipes table
ALTER TABLE public.recipes DISABLE ROW LEVEL SECURITY;

-- Disable RLS on recipe_products table
ALTER TABLE public.recipe_products DISABLE ROW LEVEL SECURITY;

-- Disable RLS on flash_deals table
ALTER TABLE public.flash_deals DISABLE ROW LEVEL SECURITY;

-- Add comments
COMMENT ON TABLE public.collections IS 'RLS disabled. Admin-only table. Authentication and authorization handled by Clerk at application layer.';
COMMENT ON TABLE public.festivals IS 'RLS disabled. Admin-only table. Authentication and authorization handled by Clerk at application layer.';
COMMENT ON TABLE public.festival_products IS 'RLS disabled. Admin-only table. Authentication and authorization handled by Clerk at application layer.';
COMMENT ON TABLE public.featured_products IS 'RLS disabled. Admin-only table. Authentication and authorization handled by Clerk at application layer.';
COMMENT ON TABLE public.testimonials IS 'RLS disabled. Admin-only table. Authentication and authorization handled by Clerk at application layer.';
COMMENT ON TABLE public.recipes IS 'RLS disabled. Admin-only table. Authentication and authorization handled by Clerk at application layer.';
COMMENT ON TABLE public.recipe_products IS 'RLS disabled. Admin-only table. Authentication and authorization handled by Clerk at application layer.';
COMMENT ON TABLE public.flash_deals IS 'RLS disabled. Admin-only table. Authentication and authorization handled by Clerk at application layer.';

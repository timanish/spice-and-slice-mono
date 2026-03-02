-- Ensure RLS is completely disabled on menu_items table
-- This fixes any RLS violation errors when admins try to insert/update menu items

-- First, disable RLS
ALTER TABLE public.menu_items DISABLE ROW LEVEL SECURITY;

-- Then drop ALL policies (order matters - disable first, then drop)
DROP POLICY IF EXISTS "Admins can manage menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Everyone can view menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Public read access to menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Allow public read access" ON public.menu_items;
DROP POLICY IF EXISTS "Allow admin full access" ON public.menu_items;
DROP POLICY IF EXISTS "Users can view menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Admins can insert menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Admins can update menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Admins can delete menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.menu_items;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.menu_items;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.menu_items;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.menu_items;


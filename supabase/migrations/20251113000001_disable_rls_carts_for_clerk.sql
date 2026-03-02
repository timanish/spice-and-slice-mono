-- Disable RLS on carts and cart_items tables for Clerk authentication
-- 
-- SECURITY MODEL:
-- With Clerk authentication, we cannot use auth.uid() in RLS policies because
-- Clerk users are not Supabase Auth users. Instead:
-- 
-- 1. Authentication: Handled by Clerk (validates who the user is)
-- 2. Authorization: Handled at application layer (all queries filter by user ID)
-- 3. Data Access: Application code MUST always filter queries by user ID
-- 
-- Example secure query pattern:
--   const { data } = await supabase
--     .from('carts')
--     .select('*')
--     .eq('user_id', clerkUser.id);  // REQUIRED: Filter by Clerk user ID
-- 
-- This is the standard pattern for Clerk + Supabase integration.

-- Drop all existing RLS policies on carts
DROP POLICY IF EXISTS "Users can view their own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can create their own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can update their own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can delete their own cart" ON public.carts;
DROP POLICY IF EXISTS "Enable all operations for carts" ON public.carts;

-- Drop all existing RLS policies on cart_items
DROP POLICY IF EXISTS "Users can view their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can create their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can update their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can delete their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Enable all operations for cart items" ON public.cart_items;

-- Disable RLS on carts table
ALTER TABLE public.carts DISABLE ROW LEVEL SECURITY;

-- Disable RLS on cart_items table
ALTER TABLE public.cart_items DISABLE ROW LEVEL SECURITY;

-- Add comments documenting the security model
COMMENT ON TABLE public.carts IS 
'RLS DISABLED: Using Clerk authentication with application-layer authorization. 
All queries MUST filter by user_id matching the Clerk user ID.
Security is enforced by:
1. Clerk validates user identity
2. Application code filters all queries by authenticated user ID
3. Webhook (service role) creates user records on signup';

COMMENT ON TABLE public.cart_items IS 
'RLS DISABLED: Using Clerk authentication with application-layer authorization.
Cart items are secured by joining with carts table and filtering by user_id.
All cart operations MUST filter by the authenticated user''s cart ID.';

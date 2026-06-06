-- Migration to update orders table user_id from UUID to TEXT for Clerk compatibility
-- This migration:
-- 1. Drops all RLS policies on orders and related tables
-- 2. Converts user_id column from UUID to TEXT
-- 3. Disables RLS (using application-layer security with Clerk)

-- Drop all existing RLS policies on order_items table (has policies that depend on orders.user_id)
DROP POLICY IF EXISTS "Order items are viewable by order owners" ON order_items;
DROP POLICY IF EXISTS "Order items are viewable by admins" ON order_items;
DROP POLICY IF EXISTS "Users can view their own order items" ON order_items;
DROP POLICY IF EXISTS "Admins can view all order items" ON order_items;

-- Drop all existing RLS policies on orders table
DROP POLICY IF EXISTS "Orders are creatable by authenticated users" ON orders;
DROP POLICY IF EXISTS "Orders are viewable by their owners" ON orders;
DROP POLICY IF EXISTS "Orders are viewable by admins" ON orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Admins can update orders" ON orders;

-- Drop foreign key constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

-- Delete any existing orders that reference old UUID user_ids
-- These are orders created before Clerk migration and won't match new TEXT user_ids
DELETE FROM order_items WHERE order_id IN (
  SELECT id FROM orders WHERE user_id IS NOT NULL
);
DELETE FROM orders WHERE user_id IS NOT NULL;

-- Alter user_id column to TEXT type
ALTER TABLE orders 
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Re-add foreign key to profiles
ALTER TABLE orders 
  ADD CONSTRAINT orders_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE;

-- Disable RLS on orders table
-- Security Model: Application-layer enforcement
-- - Clerk validates user authentication
-- - Application code filters all queries by userId
-- - Edge functions use service role to bypass RLS
-- - Frontend passes authenticated userId to edge functions
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- Disable RLS on order_items table as well
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;

-- Update promo_code_usage table if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'promo_code_usage'
  ) THEN
    -- Drop ALL possible policies on promo_code_usage first
    DROP POLICY IF EXISTS "Users can view their own promo code usage" ON promo_code_usage;
    DROP POLICY IF EXISTS "Users can create their own promo code usage" ON promo_code_usage;
    DROP POLICY IF EXISTS "Users can view their usage" ON promo_code_usage;
    DROP POLICY IF EXISTS "Users can create usage records" ON promo_code_usage;
    
    -- Drop foreign key
    EXECUTE 'ALTER TABLE promo_code_usage DROP CONSTRAINT IF EXISTS promo_code_usage_user_id_fkey';
    
    -- Alter column
    EXECUTE 'ALTER TABLE promo_code_usage ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT';
    
    -- Re-add foreign key
    EXECUTE 'ALTER TABLE promo_code_usage ADD CONSTRAINT promo_code_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE';
    
    -- Disable RLS
    EXECUTE 'ALTER TABLE promo_code_usage DISABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Update user_roles table if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_roles'
  ) THEN
    -- Drop ALL possible policies on user_roles first
    DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
    DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
    DROP POLICY IF EXISTS "Only admins can modify user roles" ON user_roles;
    DROP POLICY IF EXISTS "Admins can manage user roles" ON user_roles;
    DROP POLICY IF EXISTS "Service role can manage user roles" ON user_roles;
    
    -- Drop foreign key
    EXECUTE 'ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey';
    
    -- Alter column
    EXECUTE 'ALTER TABLE user_roles ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT';
    
    -- Re-add foreign key
    EXECUTE 'ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE';
    
    -- Disable RLS
    EXECUTE 'ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Add comments documenting the change
COMMENT ON COLUMN orders.user_id IS 'User ID from Clerk authentication (text format: user_xxxxx)';

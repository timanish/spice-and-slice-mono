-- Migration to update orders table user_id from UUID to TEXT for Clerk compatibility
-- This allows us to store Clerk user IDs which are text-based (e.g., user_xxxxx)

-- Step 1: Drop the foreign key constraint if it exists
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

-- Step 2: Change the user_id column type from UUID to TEXT
ALTER TABLE orders ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Step 3: Re-add the foreign key constraint to profiles table
-- Note: profiles.id is already TEXT after previous migration
ALTER TABLE orders 
  ADD CONSTRAINT orders_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE;

-- Add comment documenting the change
COMMENT ON COLUMN orders.user_id IS 'User ID from Clerk authentication (text format: user_xxxxx)';

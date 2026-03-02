-- Fix duplicate carts issue by adding unique constraint on user_id
-- This migration:
-- 1. Removes duplicate cart_items
-- 2. Removes duplicate carts, keeping only the oldest one per user
-- 3. Adds unique constraint to prevent future duplicates

-- Step 1: Remove cart_items from duplicate carts (keeping oldest cart by created_at)
DELETE FROM public.cart_items
WHERE cart_id IN (
  SELECT c.id
  FROM public.carts c
  INNER JOIN (
    SELECT user_id, MIN(created_at) as oldest_created_at
    FROM public.carts
    GROUP BY user_id
  ) oldest ON c.user_id = oldest.user_id
  WHERE c.created_at > oldest.oldest_created_at
);

-- Step 2: Remove duplicate carts, keeping only the oldest one per user (by created_at)
DELETE FROM public.carts
WHERE id IN (
  SELECT c.id
  FROM public.carts c
  INNER JOIN (
    SELECT user_id, MIN(created_at) as oldest_created_at
    FROM public.carts
    GROUP BY user_id
  ) oldest ON c.user_id = oldest.user_id
  WHERE c.created_at > oldest.oldest_created_at
);

-- Step 3: Add unique constraint to prevent future duplicates
ALTER TABLE public.carts 
ADD CONSTRAINT carts_user_id_unique UNIQUE (user_id);

-- Add comment for documentation
COMMENT ON CONSTRAINT carts_user_id_unique ON public.carts IS 
'Ensures each user has exactly one cart. Prevents duplicate cart creation issues.';

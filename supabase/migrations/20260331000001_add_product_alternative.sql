-- Add product alternative support for admin order review flow
-- Allows admin to suggest product substitutions when items are out of stock

BEGIN;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS original_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_product_name TEXT;

COMMENT ON COLUMN public.order_items.original_product_id IS
  'Product ID as originally ordered by customer; admin may substitute during order review';
COMMENT ON COLUMN public.order_items.original_product_name IS
  'Name snapshot of original product (prevents join queries in confirmation email)';

COMMIT;

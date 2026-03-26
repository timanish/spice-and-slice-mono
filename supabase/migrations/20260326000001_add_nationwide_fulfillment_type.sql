-- Add 'nationwide' as a valid fulfillment_type for orders
-- This supports nationwide shipping for products marked as shippable_nationwide

-- Drop the existing CHECK constraint and recreate with 'nationwide' included
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_fulfillment_type_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_fulfillment_type_check
  CHECK (fulfillment_type IN ('delivery', 'pickup', 'nationwide'));

-- Add index for nationwide orders
CREATE INDEX IF NOT EXISTS idx_orders_nationwide_delivery_date
  ON orders(delivery_date) WHERE fulfillment_type = 'nationwide';

-- Update column comment
COMMENT ON COLUMN orders.fulfillment_type IS 'Whether order is for delivery, pickup, or nationwide shipping';

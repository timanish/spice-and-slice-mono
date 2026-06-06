-- Add admin review workflow: pending_review and awaiting_customer_confirmation statuses
-- Allows admin to review and adjust orders before customer payment

BEGIN;

-- 1. Drop the existing check constraint on fulfillment_status
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS fulfillment_status_check;

-- 2. Add the two new status values by recreating the constraint
ALTER TABLE public.orders
  ADD CONSTRAINT fulfillment_status_check
  CHECK (fulfillment_status IN (
    'pending',
    'pending_review',
    'awaiting_customer_confirmation',
    'confirmed',
    'preparing',
    'out_for_delivery',
    'delivered',
    'cancelled'
  ));

-- 3. Add confirmation token columns for secure order confirmation via email
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS confirmation_token TEXT,
  ADD COLUMN IF NOT EXISTS confirmation_token_expires_at TIMESTAMPTZ;

-- 4. Create unique index for token lookups (used by confirm-customer-order function)
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_confirmation_token
  ON public.orders(confirmation_token)
  WHERE confirmation_token IS NOT NULL;

-- 5. Add comments for clarity
COMMENT ON COLUMN public.orders.confirmation_token IS
  'Single-use random hex token sent to customer via email for order confirmation before payment';
COMMENT ON COLUMN public.orders.confirmation_token_expires_at IS
  '48-hour expiry window for the confirmation token; after this timestamp, the token is invalid';

-- 6. Add original_quantity to order_items to track admin adjustments
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS original_quantity DECIMAL(10,3);

COMMENT ON COLUMN public.order_items.original_quantity IS
  'Quantity as originally placed by customer; admin may adjust quantity column during order review';

COMMIT;

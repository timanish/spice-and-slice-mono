-- Phase 11: Customer modification support
-- Allows customers to send back notes/modifications during the order confirmation phase

BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_notes TEXT;

COMMENT ON COLUMN public.orders.customer_notes IS
  'Optional notes from customer submitted when they modify an order back to pending_review status during confirmation';

COMMIT;

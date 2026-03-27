-- Fix card orders stuck in pending status
-- These orders were created with Stripe payment (payment_method = 'card')
-- but had a bug where fulfillment_status was never set from the default 'pending'

BEGIN;

-- Update card orders that are still pending
-- These should have been 'confirmed' since they were paid via Stripe
UPDATE public.orders
SET fulfillment_status = 'confirmed'
WHERE
  payment_method = 'card'
  AND fulfillment_status = 'pending'
  AND created_at >= NOW() - INTERVAL '7 days';  -- Only recent orders likely affected by the bug

-- Log which orders were fixed
DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fixed_count
  FROM public.orders
  WHERE
    payment_method = 'card'
    AND fulfillment_status = 'confirmed'
    AND created_at >= NOW() - INTERVAL '7 days'
    AND updated_at >= NOW() - INTERVAL '1 minute';  -- Records we just updated

  RAISE NOTICE 'Fixed % card orders from pending to confirmed', fixed_count;
END $$;

COMMIT;

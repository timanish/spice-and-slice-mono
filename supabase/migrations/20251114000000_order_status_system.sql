-- Add new status columns to orders table
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS fulfillment_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Add constraints for valid status values
ALTER TABLE orders 
  ADD CONSTRAINT payment_status_check 
  CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded'));

ALTER TABLE orders 
  ADD CONSTRAINT fulfillment_status_check 
  CHECK (fulfillment_status IN ('pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'));

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_status ON orders(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id ON orders(stripe_session_id) WHERE stripe_session_id IS NOT NULL;

-- Update existing orders to have default statuses
UPDATE orders 
SET 
  payment_status = CASE 
    WHEN payment_method = 'cash' THEN 'pending'
    ELSE 'completed'
  END,
  fulfillment_status = 'pending'
WHERE payment_status IS NULL;

-- Add comments
COMMENT ON COLUMN orders.payment_status IS 'Payment status: pending, completed, failed, refunded';
COMMENT ON COLUMN orders.fulfillment_status IS 'Order fulfillment status: pending, confirmed, preparing, out_for_delivery, delivered, cancelled';
COMMENT ON COLUMN orders.stripe_session_id IS 'Stripe checkout session ID for tracking payment';
COMMENT ON COLUMN orders.cancelled_at IS 'Timestamp when order was cancelled';

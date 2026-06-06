-- Add pickup reminder tracking fields to orders table
ALTER TABLE orders
ADD COLUMN pickup_reminder_sent_at TIMESTAMPTZ,
ADD COLUMN pickup_reminder_scheduled_for TIMESTAMPTZ;

-- Create index for efficient querying of orders needing reminders
CREATE INDEX idx_orders_pickup_reminder 
ON orders(pickup_reminder_scheduled_for, pickup_reminder_sent_at) 
WHERE fulfillment_type = 'pickup' AND pickup_reminder_sent_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN orders.pickup_reminder_sent_at IS 'Timestamp when pickup reminder email was sent';
COMMENT ON COLUMN orders.pickup_reminder_scheduled_for IS 'Timestamp when pickup reminder should be sent (1 hour before pickup window start)';

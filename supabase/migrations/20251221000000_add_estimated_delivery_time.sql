-- Add estimated_delivery_time to orders table for better delivery tracking
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS estimated_delivery_time TIMESTAMPTZ;

-- Add delivery time buffer to pickup_settings for configurable estimates
ALTER TABLE pickup_settings 
ADD COLUMN IF NOT EXISTS delivery_time_buffer_minutes INTEGER DEFAULT 30;

-- Add comment for documentation
COMMENT ON COLUMN orders.estimated_delivery_time IS 'Estimated time when the order will be delivered/ready for pickup';
COMMENT ON COLUMN pickup_settings.delivery_time_buffer_minutes IS 'Buffer time in minutes to add to estimated delivery times';

-- Create index for better query performance on fulfillment_status
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_status ON orders(fulfillment_status);

-- Note: Delivery and pickup date/time columns are added in 20251221000001_add_pickup_scheduling.sql
-- This migration adds estimated_delivery_time for tracking estimated completion times

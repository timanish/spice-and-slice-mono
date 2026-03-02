-- Add pickup and delivery scheduling fields to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS pickup_date DATE,
ADD COLUMN IF NOT EXISTS pickup_time TEXT,
ADD COLUMN IF NOT EXISTS delivery_date DATE,
ADD COLUMN IF NOT EXISTS delivery_time TEXT;

-- Create pickup_slots table (similar to delivery_slots)
CREATE TABLE IF NOT EXISTS pickup_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  start_hour INTEGER NOT NULL CHECK (start_hour >= 0 AND start_hour < 24),
  start_minute INTEGER NOT NULL CHECK (start_minute >= 0 AND start_minute < 60),
  end_hour INTEGER NOT NULL CHECK (end_hour >= 0 AND end_hour < 24),
  end_minute INTEGER NOT NULL CHECK (end_minute >= 0 AND end_minute < 60),
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  max_orders_per_slot INTEGER DEFAULT 10 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add scheduling configuration to pickup_settings
ALTER TABLE pickup_settings
ADD COLUMN IF NOT EXISTS min_advance_hours INTEGER DEFAULT 2 NOT NULL,
ADD COLUMN IF NOT EXISTS max_days_advance INTEGER DEFAULT 7 NOT NULL,
ADD COLUMN IF NOT EXISTS use_delivery_slots BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS default_max_orders_per_slot INTEGER DEFAULT 10 NOT NULL;

-- Create indexes for pickup and delivery scheduling queries
CREATE INDEX IF NOT EXISTS idx_orders_pickup_date ON orders(pickup_date) WHERE fulfillment_type = 'pickup';
CREATE INDEX IF NOT EXISTS idx_orders_pickup_time ON orders(pickup_time) WHERE fulfillment_type = 'pickup';
CREATE INDEX IF NOT EXISTS idx_orders_pickup_date_time ON orders(pickup_date, pickup_time) WHERE fulfillment_type = 'pickup';
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date) WHERE fulfillment_type = 'delivery';
CREATE INDEX IF NOT EXISTS idx_orders_delivery_time ON orders(delivery_time) WHERE fulfillment_type = 'delivery';
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date_time ON orders(delivery_date, delivery_time) WHERE fulfillment_type = 'delivery';
CREATE INDEX IF NOT EXISTS idx_pickup_slots_active ON pickup_slots(is_active);

-- Disable RLS for pickup_slots (admin-managed configuration)
ALTER TABLE pickup_slots DISABLE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON COLUMN orders.pickup_date IS 'Scheduled pickup date (when customer will pick up the order)';
COMMENT ON COLUMN orders.pickup_time IS 'Scheduled pickup time slot label (e.g., "2:00 PM - 4:00 PM")';
COMMENT ON COLUMN orders.delivery_date IS 'Scheduled delivery date (when order will be delivered)';
COMMENT ON COLUMN orders.delivery_time IS 'Scheduled delivery time slot label (e.g., "2:00 PM - 4:00 PM")';
COMMENT ON COLUMN pickup_settings.min_advance_hours IS 'Minimum hours in advance required for pickup scheduling';
COMMENT ON COLUMN pickup_settings.max_days_advance IS 'Maximum days in advance customers can schedule pickups';
COMMENT ON COLUMN pickup_settings.use_delivery_slots IS 'If true, use delivery_slots table; if false, use pickup_slots table';
COMMENT ON COLUMN pickup_settings.default_max_orders_per_slot IS 'Default maximum orders per time slot when using delivery slots';
COMMENT ON TABLE pickup_slots IS 'Custom time slots for pickup orders (used when use_delivery_slots = false)';
COMMENT ON COLUMN pickup_slots.max_orders_per_slot IS 'Maximum number of pickup orders allowed in this time slot';

-- Insert default pickup slots (common pickup hours)
INSERT INTO pickup_slots (label, start_hour, start_minute, end_hour, end_minute, is_active, max_orders_per_slot)
VALUES
  ('10:00 AM - 12:00 PM', 10, 0, 12, 0, true, 15),
  ('12:00 PM - 2:00 PM', 12, 0, 14, 0, true, 15),
  ('2:00 PM - 4:00 PM', 14, 0, 16, 0, true, 15),
  ('4:00 PM - 6:00 PM', 16, 0, 18, 0, true, 15),
  ('6:00 PM - 8:00 PM', 18, 0, 20, 0, true, 15),
  ('8:00 PM - 10:00 PM', 20, 0, 22, 0, true, 10)
ON CONFLICT DO NOTHING;

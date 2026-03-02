-- Create pickup_settings table
CREATE TABLE IF NOT EXISTS pickup_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preparation_time_minutes INTEGER DEFAULT 60 NOT NULL,
  store_address_line1 TEXT NOT NULL,
  store_address_line2 TEXT,
  store_city TEXT NOT NULL,
  store_state TEXT NOT NULL,
  store_postal_code TEXT NOT NULL,
  store_phone TEXT,
  opening_time TIME DEFAULT '10:00:00' NOT NULL,
  closing_time TIME DEFAULT '22:00:00' NOT NULL,
  last_order_cutoff_minutes INTEGER DEFAULT 60 NOT NULL,
  is_pickup_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  timezone TEXT DEFAULT 'America/Chicago' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add fulfillment type and pickup fields to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS fulfillment_type TEXT DEFAULT 'delivery' CHECK (fulfillment_type IN ('delivery', 'pickup')),
  ADD COLUMN IF NOT EXISTS pickup_ready_at TIMESTAMPTZ;

-- Create index for fulfillment type queries
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_type ON orders(fulfillment_type);

-- Disable RLS for pickup_settings (read-only config table)
ALTER TABLE pickup_settings DISABLE ROW LEVEL SECURITY;

-- Insert default pickup settings with Fort Worth store address
INSERT INTO pickup_settings (
  preparation_time_minutes,
  store_address_line1,
  store_address_line2,
  store_city,
  store_state,
  store_postal_code,
  store_phone,
  opening_time,
  closing_time,
  last_order_cutoff_minutes,
  is_pickup_enabled,
  timezone
) VALUES (
  60,
  '7451 N Beach St',
  '#172',
  'Fort Worth',
  'TX',
  '76137',
  NULL,
  '00:00:00',
  '23:59:59',
  60,
  TRUE,
  'America/Chicago'
);

-- Add comments
COMMENT ON TABLE pickup_settings IS 'Configuration for store pickup functionality';
COMMENT ON COLUMN pickup_settings.preparation_time_minutes IS 'Time needed to prepare order for pickup (in minutes)';
COMMENT ON COLUMN pickup_settings.last_order_cutoff_minutes IS 'Minutes before closing time when last pickup order can be placed';
COMMENT ON COLUMN pickup_settings.timezone IS 'Store timezone for time calculations';
COMMENT ON COLUMN orders.fulfillment_type IS 'Whether order is for delivery or pickup';
COMMENT ON COLUMN orders.pickup_ready_at IS 'Estimated time when pickup order will be ready';

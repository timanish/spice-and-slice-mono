-- Add delivery distance and location fields to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS distance_from_store DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS distance_calculated_at TIMESTAMPTZ;

-- Create index for distance queries
CREATE INDEX IF NOT EXISTS idx_profiles_distance ON profiles(distance_from_store);

-- Create delivery_zones configuration table
CREATE TABLE IF NOT EXISTS delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_name TEXT NOT NULL,
  min_distance DECIMAL(10, 2) NOT NULL,
  max_distance DECIMAL(10, 2) NOT NULL,
  free_shipping_threshold DECIMAL(10, 2) NOT NULL,
  delivery_fee DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert the 4 delivery zones (0-5 miles is free)
INSERT INTO delivery_zones (zone_name, min_distance, max_distance, free_shipping_threshold, delivery_fee, display_order) VALUES
  ('Zone 0: 0-5 Miles (Free Delivery)', 0.0, 5.0, 0.0, 0.0, 0),
  ('Zone 1: 5-10 Miles', 5.0, 10.0, 125.0, 5.99, 1),
  ('Zone 2: 10-15 Miles', 10.0, 15.0, 150.0, 11.99, 2),
  ('Zone 3: 15-30 Miles', 15.0, 30.0, 200.0, 14.99, 3);

-- Disable RLS for delivery_zones (read-only config table)
ALTER TABLE delivery_zones DISABLE ROW LEVEL SECURITY;

-- Add delivery fee fields to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_distance DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS delivery_zone TEXT;

-- Add comments
COMMENT ON COLUMN profiles.distance_from_store IS 'Driving distance from store in miles (calculated via Mapbox)';
COMMENT ON COLUMN profiles.latitude IS 'Geocoded latitude of user address';
COMMENT ON COLUMN profiles.longitude IS 'Geocoded longitude of user address';
COMMENT ON COLUMN profiles.distance_calculated_at IS 'Timestamp when distance was last calculated';
COMMENT ON TABLE delivery_zones IS 'Configuration for distance-based delivery zones and fees';
COMMENT ON COLUMN orders.delivery_fee IS 'Delivery fee charged for this order';
COMMENT ON COLUMN orders.delivery_distance IS 'Distance at time of order';
COMMENT ON COLUMN orders.delivery_zone IS 'Delivery zone name at time of order';

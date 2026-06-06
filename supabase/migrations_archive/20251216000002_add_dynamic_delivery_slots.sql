-- Create delivery_time_slots table for dynamic slot management
CREATE TABLE IF NOT EXISTS delivery_time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_hour INTEGER NOT NULL CHECK (start_hour >= 0 AND start_hour <= 23),
  start_minute INTEGER NOT NULL DEFAULT 0 CHECK (start_minute >= 0 AND start_minute <= 59),
  end_hour INTEGER NOT NULL CHECK (end_hour >= 0 AND end_hour <= 23),
  end_minute INTEGER NOT NULL DEFAULT 0 CHECK (end_minute >= 0 AND end_minute <= 59),
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- NULL means all days, 0=Sunday, 6=Saturday
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create delivery_settings table for global delivery configuration
CREATE TABLE IF NOT EXISTS delivery_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_delivery_time_slots_active ON delivery_time_slots(is_active);
CREATE INDEX idx_delivery_time_slots_order ON delivery_time_slots(display_order);
CREATE INDEX idx_delivery_time_slots_day ON delivery_time_slots(day_of_week);

-- Add updated_at trigger for delivery_time_slots
CREATE OR REPLACE FUNCTION update_delivery_time_slots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER delivery_time_slots_updated_at
  BEFORE UPDATE ON delivery_time_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_time_slots_updated_at();

-- Add updated_at trigger for delivery_settings
CREATE OR REPLACE FUNCTION update_delivery_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER delivery_settings_updated_at
  BEFORE UPDATE ON delivery_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_settings_updated_at();

-- Disable RLS for delivery tables (consistent with Clerk auth pattern)
ALTER TABLE delivery_time_slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_settings DISABLE ROW LEVEL SECURITY;

-- Seed delivery_time_slots with current hardcoded values
INSERT INTO delivery_time_slots (start_hour, start_minute, end_hour, end_minute, label, is_active, display_order, day_of_week) VALUES
  (10, 0, 12, 0, '10:00 AM - 12:00 PM', true, 1, NULL),
  (12, 0, 14, 0, '12:00 PM - 2:00 PM', true, 2, NULL),
  (14, 0, 16, 0, '2:00 PM - 4:00 PM', true, 3, NULL),
  (16, 0, 18, 0, '4:00 PM - 6:00 PM', true, 4, NULL);

-- Seed delivery_settings with current configuration
INSERT INTO delivery_settings (key, value, description) VALUES
  ('min_delivery_hours', '2', 'Minimum hours required before delivery'),
  ('delivery_cutoff_hour', '18', 'Last hour for delivery completion (24-hour format)'),
  ('timezone', 'America/Chicago', 'Timezone for delivery time calculations (Central Time - Fort Worth, TX)'),
  ('max_days_advance', '7', 'Maximum days in advance customers can schedule delivery');

-- Add comments
COMMENT ON TABLE delivery_time_slots IS 'Dynamic delivery time slots configuration';
COMMENT ON TABLE delivery_settings IS 'Global delivery system settings';
COMMENT ON COLUMN delivery_time_slots.day_of_week IS 'NULL = all days, 0 = Sunday, 1 = Monday, ..., 6 = Saturday';

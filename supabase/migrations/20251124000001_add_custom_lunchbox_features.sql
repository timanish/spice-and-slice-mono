-- Add custom lunch box features: custom plans, delivery scheduling, pricing workflow, and deliveries tracking

-- 1. Drop the lunch_box_menu_selections table (no longer needed - admin controls menu)
DROP TABLE IF EXISTS lunch_box_menu_selections CASCADE;

-- 2. Alter lunch_box_subscriptions table to support custom plans and new workflow
ALTER TABLE lunch_box_subscriptions 
  DROP CONSTRAINT IF EXISTS lunch_box_subscriptions_subscription_type_check,
  DROP CONSTRAINT IF EXISTS lunch_box_subscriptions_status_check;

-- Add custom to subscription_type
ALTER TABLE lunch_box_subscriptions
  ADD CONSTRAINT lunch_box_subscriptions_subscription_type_check 
  CHECK (subscription_type IN ('weekly', 'monthly', 'custom'));

-- Expand status options to include approval workflow
ALTER TABLE lunch_box_subscriptions
  ADD CONSTRAINT lunch_box_subscriptions_status_check 
  CHECK (status IN ('pending_approval', 'approved', 'active', 'paused', 'cancelled'));

-- Add new columns for custom plans and pricing
ALTER TABLE lunch_box_subscriptions
  ADD COLUMN IF NOT EXISTS delivery_schedule JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS total_delivery_days INTEGER,
  ADD COLUMN IF NOT EXISTS price_per_day DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS total_price DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS end_date DATE;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_lunch_box_subscriptions_status_approval 
  ON lunch_box_subscriptions(status) WHERE status = 'pending_approval';

CREATE INDEX IF NOT EXISTS idx_lunch_box_subscriptions_end_date 
  ON lunch_box_subscriptions(end_date);

-- Add comments
COMMENT ON COLUMN lunch_box_subscriptions.delivery_schedule IS 'Array of selected delivery dates for custom plans (JSONB array of date strings)';
COMMENT ON COLUMN lunch_box_subscriptions.total_delivery_days IS 'Total number of delivery days for custom plans (5-30)';
COMMENT ON COLUMN lunch_box_subscriptions.price_per_day IS 'Price per delivery day (set by admin for custom plans)';
COMMENT ON COLUMN lunch_box_subscriptions.total_price IS 'Total subscription price (calculated or set by admin)';
COMMENT ON COLUMN lunch_box_subscriptions.admin_notes IS 'Admin notes for pricing justification or special instructions';

-- 3. Create deliveries table for granular tracking
CREATE TABLE IF NOT EXISTS lunch_box_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES lunch_box_subscriptions(id) ON DELETE CASCADE,
  delivery_date DATE NOT NULL,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'out_for_delivery', 'delivered', 'skipped', 'cancelled', 'failed')),
  scheduled_time TIME DEFAULT '12:00:00',
  delivered_at TIMESTAMPTZ,
  driver_notes TEXT,
  customer_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subscription_id, delivery_date)
);

-- Add indexes for deliveries table
CREATE INDEX idx_lunch_box_deliveries_subscription ON lunch_box_deliveries(subscription_id);
CREATE INDEX idx_lunch_box_deliveries_date ON lunch_box_deliveries(delivery_date);
CREATE INDEX idx_lunch_box_deliveries_status ON lunch_box_deliveries(status);
CREATE INDEX idx_lunch_box_deliveries_date_status ON lunch_box_deliveries(delivery_date, status);

-- Create updated_at trigger for deliveries
CREATE OR REPLACE FUNCTION update_lunch_box_deliveries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lunch_box_deliveries_updated_at
  BEFORE UPDATE ON lunch_box_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_lunch_box_deliveries_updated_at();

-- Disable RLS for deliveries table (consistent with Clerk auth pattern)
ALTER TABLE lunch_box_deliveries DISABLE ROW LEVEL SECURITY;

-- Add comments for deliveries table
COMMENT ON TABLE lunch_box_deliveries IS 'Tracks individual lunch box deliveries for granular status tracking';
COMMENT ON COLUMN lunch_box_deliveries.menu_item_id IS 'What menu item is being served on this delivery day (set by admin)';
COMMENT ON COLUMN lunch_box_deliveries.status IS 'Current status of the delivery';
COMMENT ON COLUMN lunch_box_deliveries.scheduled_time IS 'Scheduled delivery time (default 12:00 PM)';

-- 4. Create function to generate deliveries for a subscription
CREATE OR REPLACE FUNCTION generate_deliveries_for_subscription(
  p_subscription_id UUID,
  p_delivery_dates DATE[]
)
RETURNS void AS $$
DECLARE
  delivery_date DATE;
BEGIN
  -- Loop through each date and create a delivery record
  FOREACH delivery_date IN ARRAY p_delivery_dates
  LOOP
    INSERT INTO lunch_box_deliveries (subscription_id, delivery_date, status)
    VALUES (p_subscription_id, delivery_date, 'scheduled')
    ON CONFLICT (subscription_id, delivery_date) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_deliveries_for_subscription IS 'Generates delivery records for a subscription based on selected dates';

-- 5. Create function to calculate next delivery date
CREATE OR REPLACE FUNCTION calculate_next_delivery_date(p_subscription_id UUID)
RETURNS DATE AS $$
DECLARE
  next_date DATE;
BEGIN
  SELECT delivery_date INTO next_date
  FROM lunch_box_deliveries
  WHERE subscription_id = p_subscription_id
    AND delivery_date >= CURRENT_DATE
    AND status IN ('scheduled', 'out_for_delivery')
  ORDER BY delivery_date ASC
  LIMIT 1;
  
  RETURN next_date;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_next_delivery_date IS 'Calculates the next scheduled delivery date for a subscription';

-- 6. Create notifications table for approval workflow
CREATE TABLE IF NOT EXISTS lunch_box_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  subscription_id UUID REFERENCES lunch_box_subscriptions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('subscription_approved', 'subscription_rejected', 'delivery_reminder', 'subscription_ending')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Add indexes for notifications
CREATE INDEX idx_lunch_box_notifications_user_id ON lunch_box_notifications(user_id);
CREATE INDEX idx_lunch_box_notifications_unread ON lunch_box_notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX idx_lunch_box_notifications_created ON lunch_box_notifications(created_at DESC);

-- Disable RLS for notifications
ALTER TABLE lunch_box_notifications DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE lunch_box_notifications IS 'In-app notifications for lunch box subscription events';

-- 7. Update existing subscriptions with default values
UPDATE lunch_box_subscriptions
SET 
  delivery_schedule = '[]'::jsonb,
  total_delivery_days = CASE 
    WHEN subscription_type = 'weekly' THEN 5
    WHEN subscription_type = 'monthly' THEN 20
    ELSE 0
  END
WHERE delivery_schedule IS NULL;

-- Set end dates for existing subscriptions
UPDATE lunch_box_subscriptions
SET 
  end_date = CASE 
    WHEN subscription_type = 'weekly' THEN start_date + INTERVAL '7 days'
    WHEN subscription_type = 'monthly' THEN start_date + INTERVAL '30 days'
    ELSE NULL
  END
WHERE end_date IS NULL AND status = 'active';

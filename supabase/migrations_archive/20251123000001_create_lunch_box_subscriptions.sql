-- Create lunch_box_subscriptions table
CREATE TABLE IF NOT EXISTS lunch_box_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  subscription_type TEXT NOT NULL CHECK (subscription_type IN ('weekly', 'monthly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  start_date DATE NOT NULL,
  next_delivery_date DATE,
  company TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  delivery_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ
);

-- Add indexes for better query performance
CREATE INDEX idx_lunch_box_subscriptions_user_id ON lunch_box_subscriptions(user_id);
CREATE INDEX idx_lunch_box_subscriptions_status ON lunch_box_subscriptions(status);
CREATE INDEX idx_lunch_box_subscriptions_next_delivery ON lunch_box_subscriptions(next_delivery_date);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_lunch_box_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lunch_box_subscriptions_updated_at
  BEFORE UPDATE ON lunch_box_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_lunch_box_subscriptions_updated_at();

-- Disable RLS for Clerk authentication (consistent with your other tables)
ALTER TABLE lunch_box_subscriptions DISABLE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON TABLE lunch_box_subscriptions IS 'Stores lunch box delivery subscription information for users';
COMMENT ON COLUMN lunch_box_subscriptions.user_id IS 'Clerk user ID';
COMMENT ON COLUMN lunch_box_subscriptions.subscription_type IS 'weekly or monthly subscription plan';
COMMENT ON COLUMN lunch_box_subscriptions.status IS 'active, paused, or cancelled';
COMMENT ON COLUMN lunch_box_subscriptions.next_delivery_date IS 'Next scheduled delivery date (auto-updated)';

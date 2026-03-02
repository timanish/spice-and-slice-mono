ALTER TABLE lunch_box_subscriptions ADD COLUMN IF NOT EXISTS stripe_session_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lunch_box_subscriptions_stripe_session_id
  ON lunch_box_subscriptions (stripe_session_id) WHERE stripe_session_id IS NOT NULL;

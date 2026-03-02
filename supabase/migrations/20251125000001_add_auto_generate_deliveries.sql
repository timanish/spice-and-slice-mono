-- Create function to auto-generate delivery records for subscriptions
-- Generates weekday delivery records for specified date range

CREATE OR REPLACE FUNCTION auto_generate_subscription_deliveries(
  p_subscription_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_subscription_type TEXT;
  v_start_date DATE;
  v_end_date DATE;
  v_current_date DATE;
  v_days_to_generate INTEGER;
  v_generated_count INTEGER := 0;
BEGIN
  -- Get subscription details
  SELECT subscription_type, start_date
  INTO v_subscription_type, v_start_date
  FROM lunch_box_subscriptions
  WHERE id = p_subscription_id;

  -- If subscription not found, return 0
  IF v_subscription_type IS NULL THEN
    RETURN 0;
  END IF;

  -- Determine how many days to generate based on subscription type
  IF v_subscription_type = 'weekly' THEN
    v_days_to_generate := 14; -- 2 weeks ahead
  ELSIF v_subscription_type = 'monthly' THEN
    v_days_to_generate := 30; -- 30 days ahead
  ELSE
    -- Custom plans handle their own delivery generation
    RETURN 0;
  END IF;

  -- Set start date to today or subscription start date (whichever is later)
  v_current_date := GREATEST(CURRENT_DATE, v_start_date);
  v_end_date := v_current_date + v_days_to_generate;

  -- Loop through date range and create delivery records for weekdays only
  WHILE v_current_date <= v_end_date LOOP
    -- Only create for weekdays (Monday = 1 to Friday = 5)
    IF EXTRACT(ISODOW FROM v_current_date) BETWEEN 1 AND 5 THEN
      -- Insert delivery record if it doesn't already exist
      INSERT INTO lunch_box_deliveries (
        subscription_id,
        delivery_date,
        status,
        scheduled_time
      )
      VALUES (
        p_subscription_id,
        v_current_date,
        'scheduled',
        '12:00:00'
      )
      ON CONFLICT (subscription_id, delivery_date) DO NOTHING;
      
      -- Count successful inserts
      IF FOUND THEN
        v_generated_count := v_generated_count + 1;
      END IF;
    END IF;

    -- Move to next day
    v_current_date := v_current_date + 1;
  END LOOP;

  -- Update subscription's next_delivery_date
  UPDATE lunch_box_subscriptions
  SET next_delivery_date = (
    SELECT MIN(delivery_date)
    FROM lunch_box_deliveries
    WHERE subscription_id = p_subscription_id
      AND delivery_date >= CURRENT_DATE
      AND status IN ('scheduled', 'out_for_delivery')
  )
  WHERE id = p_subscription_id;

  RETURN v_generated_count;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION auto_generate_subscription_deliveries IS 'Auto-generates delivery records for weekly (14 days) and monthly (30 days) subscriptions. Skips weekends and avoids duplicates.';

-- Create function to bulk generate deliveries for all active subscriptions
CREATE OR REPLACE FUNCTION bulk_generate_missing_deliveries()
RETURNS TABLE(subscription_id UUID, generated_count INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    auto_generate_subscription_deliveries(s.id)
  FROM lunch_box_subscriptions s
  WHERE s.status = 'active'
    AND s.subscription_type IN ('weekly', 'monthly');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION bulk_generate_missing_deliveries IS 'Generates missing delivery records for all active weekly/monthly subscriptions.';

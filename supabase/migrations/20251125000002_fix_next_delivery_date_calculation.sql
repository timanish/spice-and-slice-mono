-- Fix calculate_next_delivery_date to respect subscription start_date
-- This prevents next_delivery_date from being set to dates before the subscription starts

CREATE OR REPLACE FUNCTION calculate_next_delivery_date(p_subscription_id UUID)
RETURNS DATE AS $$
DECLARE
  next_date DATE;
  sub_start_date DATE;
BEGIN
  -- Get subscription start date
  SELECT start_date INTO sub_start_date
  FROM lunch_box_subscriptions
  WHERE id = p_subscription_id;
  
  -- Find next delivery date that is >= start_date and >= today
  SELECT delivery_date INTO next_date
  FROM lunch_box_deliveries
  WHERE subscription_id = p_subscription_id
    AND delivery_date >= GREATEST(CURRENT_DATE, sub_start_date)
    AND status IN ('scheduled', 'out_for_delivery')
  ORDER BY delivery_date ASC
  LIMIT 1;
  
  RETURN next_date;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_next_delivery_date IS 'Calculates the next scheduled delivery date for a subscription, respecting start_date';

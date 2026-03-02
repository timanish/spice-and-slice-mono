-- Fix the generate_deliveries_for_subscription function to handle schedule updates properly
-- This function should:
-- 1. Remove deliveries that are no longer in the new schedule (only if status is 'scheduled')
-- 2. Add new deliveries for dates in the new schedule
-- 3. Keep existing deliveries that are already in progress or delivered

CREATE OR REPLACE FUNCTION generate_deliveries_for_subscription(
  p_subscription_id UUID,
  p_delivery_dates DATE[]
)
RETURNS void AS $$
DECLARE
  v_delivery_date DATE;
BEGIN
  -- First, delete scheduled deliveries that are NOT in the new schedule
  -- Only delete 'scheduled' status to preserve delivery history
  DELETE FROM lunch_box_deliveries
  WHERE subscription_id = p_subscription_id
    AND status = 'scheduled'
    AND lunch_box_deliveries.delivery_date NOT IN (SELECT unnest(p_delivery_dates));
  
  -- Then, insert new delivery records (skip if already exists)
  FOREACH v_delivery_date IN ARRAY p_delivery_dates
  LOOP
    INSERT INTO lunch_box_deliveries (subscription_id, delivery_date, status)
    VALUES (p_subscription_id, v_delivery_date, 'scheduled')
    ON CONFLICT (subscription_id, delivery_date) 
    DO UPDATE SET 
      status = CASE 
        WHEN lunch_box_deliveries.status = 'scheduled' THEN 'scheduled'
        ELSE lunch_box_deliveries.status  -- Keep existing status for non-scheduled deliveries
      END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_deliveries_for_subscription IS 'Updates delivery records for a subscription - removes old scheduled deliveries and adds new ones';

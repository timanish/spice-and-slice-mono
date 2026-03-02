-- Create validate_promo_code RPC function
-- This function validates promo codes and calculates discounts

-- Drop existing function with any signature
DROP FUNCTION IF EXISTS validate_promo_code(TEXT, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS validate_promo_code(TEXT, UUID, NUMERIC);

CREATE OR REPLACE FUNCTION validate_promo_code(
  _code TEXT,
  _user_id TEXT,
  _order_amount NUMERIC
)
RETURNS TABLE (
  valid BOOLEAN,
  discount NUMERIC,
  promo_id UUID,
  message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  promo_record RECORD;
  calculated_discount NUMERIC;
BEGIN
  -- Normalize the code to lowercase for case-insensitive comparison
  _code := LOWER(TRIM(_code));
  
  -- Find the promo code
  SELECT *
  INTO promo_record
  FROM public.promo_codes
  WHERE LOWER(code) = _code
  LIMIT 1;
  
  -- Check if promo code exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, 'Promo code not found'::TEXT;
    RETURN;
  END IF;
  
  -- Check if promo code is active
  IF NOT promo_record.is_active THEN
    RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, 'Promo code is not active'::TEXT;
    RETURN;
  END IF;
  
  -- Check if promo code has started
  IF promo_record.start_date > NOW() THEN
    RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, 'Promo code has not started yet'::TEXT;
    RETURN;
  END IF;
  
  -- Check if promo code has expired
  IF promo_record.end_date IS NOT NULL AND promo_record.end_date < NOW() THEN
    RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, 'Promo code has expired'::TEXT;
    RETURN;
  END IF;
  
  -- Check if minimum order amount is met
  IF promo_record.minimum_order_amount IS NOT NULL AND _order_amount < promo_record.minimum_order_amount THEN
    RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, 
      FORMAT('Minimum order amount of $%s required', promo_record.minimum_order_amount)::TEXT;
    RETURN;
  END IF;
  
  -- Check if max uses has been reached
  IF promo_record.max_uses IS NOT NULL AND promo_record.current_uses >= promo_record.max_uses THEN
    RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, 'Promo code has reached maximum uses'::TEXT;
    RETURN;
  END IF;
  
  -- Calculate discount
  IF promo_record.discount_percentage IS NOT NULL THEN
    calculated_discount := (_order_amount * promo_record.discount_percentage / 100.0);
  ELSIF promo_record.discount_amount IS NOT NULL THEN
    calculated_discount := promo_record.discount_amount;
  ELSE
    calculated_discount := 0;
  END IF;
  
  -- Ensure discount doesn't exceed order amount
  calculated_discount := LEAST(calculated_discount, _order_amount);
  
  -- Return valid result
  RETURN QUERY SELECT 
    true, 
    calculated_discount, 
    promo_record.id, 
    'Promo code applied successfully'::TEXT;
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION validate_promo_code(TEXT, TEXT, NUMERIC) TO anon;
GRANT EXECUTE ON FUNCTION validate_promo_code(TEXT, TEXT, NUMERIC) TO authenticated;

-- Add comment
COMMENT ON FUNCTION validate_promo_code IS 'Validates a promo code and calculates the discount amount. Returns validation result with discount and promo_id.';

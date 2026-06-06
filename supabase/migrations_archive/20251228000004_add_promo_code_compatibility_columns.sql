-- Add compatibility columns for promo codes
-- The base schema has discount_type and discount_value
-- The application code expects discount_percentage and discount_amount
-- Add both and update the validate_promo_code function

-- Add the new columns
ALTER TABLE public.promo_codes 
ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS minimum_order_amount NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS is_sitewide BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Rename min_order_amount to match expected name if it exists differently
-- (it's already correct as minimum_order_amount in the new columns)

-- Make discount_value nullable since we'll use the specific columns instead
ALTER TABLE public.promo_codes 
ALTER COLUMN discount_value DROP NOT NULL;

-- Update existing records to populate the new columns from discount_type/discount_value
UPDATE public.promo_codes
SET 
  discount_percentage = CASE WHEN discount_type = 'percentage' THEN discount_value ELSE NULL END,
  discount_amount = CASE WHEN discount_type = 'amount' THEN discount_value ELSE NULL END
WHERE discount_value IS NOT NULL;

-- Create trigger to keep discount_value in sync
CREATE OR REPLACE FUNCTION sync_promo_discount_value()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync discount_value and discount_type from the specific columns
  IF NEW.discount_percentage IS NOT NULL THEN
    NEW.discount_value := NEW.discount_percentage;
    NEW.discount_type := 'percentage';
    NEW.discount_amount := NULL;
  ELSIF NEW.discount_amount IS NOT NULL THEN
    NEW.discount_value := NEW.discount_amount;
    NEW.discount_type := 'amount';
    NEW.discount_percentage := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_promo_discount_before_insert_update
BEFORE INSERT OR UPDATE ON public.promo_codes
FOR EACH ROW
EXECUTE FUNCTION sync_promo_discount_value();

-- Update the validate_promo_code function to work with both column sets
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
  min_order NUMERIC;
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
  IF promo_record.start_date IS NOT NULL AND promo_record.start_date > NOW() THEN
    RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, 'Promo code has not started yet'::TEXT;
    RETURN;
  END IF;
  
  -- Check if promo code has expired
  IF promo_record.end_date IS NOT NULL AND promo_record.end_date < NOW() THEN
    RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, 'Promo code has expired'::TEXT;
    RETURN;
  END IF;
  
  -- Check minimum order amount (support both column names)
  min_order := COALESCE(promo_record.minimum_order_amount, promo_record.min_order_amount);
  IF min_order IS NOT NULL AND _order_amount < min_order THEN
    RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, 
      FORMAT('Minimum order amount of $%s required', min_order)::TEXT;
    RETURN;
  END IF;
  
  -- Check if max uses has been reached
  IF promo_record.max_uses IS NOT NULL AND promo_record.current_uses >= promo_record.max_uses THEN
    RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, 'Promo code has reached maximum uses'::TEXT;
    RETURN;
  END IF;
  
  -- Calculate discount (prefer the specific columns over discount_value)
  IF promo_record.discount_percentage IS NOT NULL THEN
    calculated_discount := (_order_amount * promo_record.discount_percentage / 100.0);
  ELSIF promo_record.discount_amount IS NOT NULL THEN
    calculated_discount := promo_record.discount_amount;
  ELSIF promo_record.discount_type = 'percentage' AND promo_record.discount_value IS NOT NULL THEN
    calculated_discount := (_order_amount * promo_record.discount_value / 100.0);
  ELSIF promo_record.discount_type = 'amount' AND promo_record.discount_value IS NOT NULL THEN
    calculated_discount := promo_record.discount_value;
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

COMMENT ON FUNCTION validate_promo_code IS 'Validates a promo code and calculates the discount amount. Supports both discount_percentage/discount_amount and discount_type/discount_value column sets.';

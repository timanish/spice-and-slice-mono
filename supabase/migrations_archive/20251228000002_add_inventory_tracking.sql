-- Add inventory tracking columns to products table
-- Supports both count-based (discrete items) and weight-based (bulk) inventory

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS inventory_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS inventory_weight DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS low_stock_weight_threshold DECIMAL(10,2) DEFAULT 10.0,
  ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS upc_code TEXT;

-- Add comments to explain the columns
COMMENT ON COLUMN public.products.inventory_count IS 'Available quantity for count-based (discrete) items';
COMMENT ON COLUMN public.products.inventory_weight IS 'Available weight in the specified unit_of_measure for weight-based items';
COMMENT ON COLUMN public.products.low_stock_threshold IS 'Alert threshold for count-based items';
COMMENT ON COLUMN public.products.low_stock_weight_threshold IS 'Alert threshold for weight-based items';
COMMENT ON COLUMN public.products.track_inventory IS 'Whether to track inventory for this product';
COMMENT ON COLUMN public.products.upc_code IS 'Universal Product Code for scanning';

-- Create index for inventory queries
CREATE INDEX IF NOT EXISTS idx_products_inventory_count ON public.products(inventory_count) WHERE track_inventory = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_inventory_weight ON public.products(inventory_weight) WHERE track_inventory = TRUE AND is_weighted = TRUE;

-- Create view for low stock items
CREATE OR REPLACE VIEW low_stock_products AS
SELECT 
  p.*,
  CASE
    WHEN p.is_weighted = TRUE THEN 
      p.inventory_weight <= p.low_stock_weight_threshold
    ELSE 
      p.inventory_count <= p.low_stock_threshold
  END as is_low_stock
FROM public.products p
WHERE p.track_inventory = TRUE
  AND (
    (p.is_weighted = TRUE AND p.inventory_weight <= p.low_stock_weight_threshold)
    OR
    (p.is_weighted = FALSE AND p.inventory_count <= p.low_stock_threshold)
  );

-- Function to check if product has sufficient inventory
CREATE OR REPLACE FUNCTION check_product_inventory(
  product_id UUID,
  requested_quantity DECIMAL
) RETURNS BOOLEAN AS $$
DECLARE
  product_record RECORD;
BEGIN
  SELECT * INTO product_record FROM public.products WHERE id = product_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- If not tracking inventory, always return true
  IF NOT product_record.track_inventory THEN
    RETURN TRUE;
  END IF;
  
  -- Check based on whether product is weight-based or count-based
  IF product_record.is_weighted THEN
    RETURN product_record.inventory_weight >= requested_quantity;
  ELSE
    RETURN product_record.inventory_count >= requested_quantity;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to deduct inventory when order is placed
CREATE OR REPLACE FUNCTION deduct_product_inventory(
  product_id UUID,
  quantity DECIMAL
) RETURNS BOOLEAN AS $$
DECLARE
  product_record RECORD;
BEGIN
  SELECT * INTO product_record FROM public.products WHERE id = product_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
  
  -- If not tracking inventory, just return success
  IF NOT product_record.track_inventory THEN
    RETURN TRUE;
  END IF;
  
  -- Deduct based on whether product is weight-based or count-based
  IF product_record.is_weighted THEN
    IF product_record.inventory_weight < quantity THEN
      RAISE EXCEPTION 'Insufficient inventory weight';
    END IF;
    
    UPDATE public.products 
    SET 
      inventory_weight = inventory_weight - quantity,
      updated_at = NOW()
    WHERE id = product_id;
  ELSE
    IF product_record.inventory_count < quantity THEN
      RAISE EXCEPTION 'Insufficient inventory count';
    END IF;
    
    UPDATE public.products 
    SET 
      inventory_count = inventory_count - quantity::INTEGER,
      updated_at = NOW()
    WHERE id = product_id;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to restore inventory when order is cancelled
CREATE OR REPLACE FUNCTION restore_product_inventory(
  product_id UUID,
  quantity DECIMAL
) RETURNS BOOLEAN AS $$
DECLARE
  product_record RECORD;
BEGIN
  SELECT * INTO product_record FROM public.products WHERE id = product_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
  
  -- If not tracking inventory, just return success
  IF NOT product_record.track_inventory THEN
    RETURN TRUE;
  END IF;
  
  -- Restore based on whether product is weight-based or count-based
  IF product_record.is_weighted THEN
    UPDATE public.products 
    SET 
      inventory_weight = inventory_weight + quantity,
      updated_at = NOW()
    WHERE id = product_id;
  ELSE
    UPDATE public.products 
    SET 
      inventory_count = inventory_count + quantity::INTEGER,
      updated_at = NOW()
    WHERE id = product_id;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add minimum order fields to products table
ALTER TABLE products 
ADD COLUMN min_order_value DECIMAL(10,2) CHECK (min_order_value IS NULL OR min_order_value > 0),
ADD COLUMN min_order_unit TEXT CHECK (min_order_unit IS NULL OR min_order_unit IN ('pieces', 'kg', 'lbs'));

-- Add comment for clarity
COMMENT ON COLUMN products.min_order_value IS 'Minimum orderable quantity or weight for this product';
COMMENT ON COLUMN products.min_order_unit IS 'Unit for minimum order: pieces (for countable items), kg, or lbs (for weight-based items)';

-- Add check constraint to ensure both fields are set together or both null
ALTER TABLE products 
ADD CONSTRAINT min_order_consistency CHECK (
  (min_order_value IS NULL AND min_order_unit IS NULL) OR 
  (min_order_value IS NOT NULL AND min_order_unit IS NOT NULL)
);

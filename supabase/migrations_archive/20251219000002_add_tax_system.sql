-- Add comprehensive tax system with product-level and category-level tax rates
-- Tax hierarchy: Product tax_rate > Category tax_rate > null (no tax)
-- Delivery fees are tax-exempt

-- Add tax_rate column to products table (nullable for hierarchy)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,4) CHECK (tax_rate >= 0 AND tax_rate <= 1);

-- Create category_tax_rates table for managing category-level tax rates
CREATE TABLE IF NOT EXISTS category_tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT UNIQUE NOT NULL,
  tax_rate DECIMAL(5,4) NOT NULL CHECK (tax_rate >= 0 AND tax_rate <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for category_tax_rates (open access)
ALTER TABLE category_tax_rates DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Anyone can view category tax rates" ON category_tax_rates;
DROP POLICY IF EXISTS "Admins can manage category tax rates" ON category_tax_rates;
DROP POLICY IF EXISTS "Authenticated users can manage category tax rates" ON category_tax_rates;

-- Add tax tracking to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS taxable_amount DECIMAL(10,2) DEFAULT 0;

-- Add tax tracking to order_items table (stores tax rate at time of order)
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN products.tax_rate IS 'Product-specific tax rate (0-1 decimal). Overrides category tax rate if set. NULL means use category rate or no tax.';
COMMENT ON TABLE category_tax_rates IS 'Tax rates by product category. Applied when product.tax_rate is NULL.';
COMMENT ON COLUMN orders.tax_amount IS 'Total tax amount for the order (sum of all item taxes). Delivery fee is tax-exempt.';
COMMENT ON COLUMN orders.taxable_amount IS 'Subtotal of taxable items (before tax, after discounts)';
COMMENT ON COLUMN order_items.tax_rate IS 'Tax rate applied to this item at order time (historical record)';
COMMENT ON COLUMN order_items.tax_amount IS 'Tax amount for this specific order item';

-- Create index for faster category lookups
CREATE INDEX IF NOT EXISTS idx_category_tax_rates_category ON category_tax_rates(category);

-- Add updated_at trigger for category_tax_rates
DROP TRIGGER IF EXISTS update_category_tax_rates_updated_at ON category_tax_rates;
CREATE TRIGGER update_category_tax_rates_updated_at
  BEFORE UPDATE ON category_tax_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

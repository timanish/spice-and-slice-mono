-- Comprehensive migration to add all missing columns to match TypeScript types
-- This ensures the database schema matches the application's expectations

-- ============================================================================
-- PRODUCTS TABLE - Add all missing columns
-- ============================================================================
ALTER TABLE public.products
  -- Core product info
  ADD COLUMN IF NOT EXISTS upc_code TEXT,
  ADD COLUMN IF NOT EXISTS sub_category TEXT,
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  
  -- Status and visibility
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 5,
  
  -- Inventory tracking (if not already added)
  ADD COLUMN IF NOT EXISTS inventory_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS inventory_weight DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS low_stock_weight_threshold DECIMAL(10,2) DEFAULT 10.0,
  
  -- Minimum order requirements (if not already added)
  ADD COLUMN IF NOT EXISTS min_order_value DECIMAL(10,2) CHECK (min_order_value IS NULL OR min_order_value > 0),
  ADD COLUMN IF NOT EXISTS min_order_unit TEXT CHECK (min_order_unit IS NULL OR min_order_unit IN ('pieces', 'kg', 'lbs')),
  
  -- Tax (if not already added)
  ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,4) CHECK (tax_rate IS NULL OR (tax_rate >= 0 AND tax_rate <= 1));

-- Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_sub_category ON public.products(sub_category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand);
CREATE INDEX IF NOT EXISTS idx_products_priority ON public.products(priority);
CREATE INDEX IF NOT EXISTS idx_products_upc_code ON public.products(upc_code);
CREATE INDEX IF NOT EXISTS idx_products_track_inventory ON public.products(track_inventory);

-- Add comments
COMMENT ON COLUMN public.products.is_active IS 'Whether product is active and visible to customers';
COMMENT ON COLUMN public.products.priority IS 'Display priority (higher = shown first)';
COMMENT ON COLUMN public.products.sub_category IS 'Product sub-category for finer filtering';
COMMENT ON COLUMN public.products.brand IS 'Product brand name';
COMMENT ON COLUMN public.products.tags IS 'Product tags for search and filtering';
COMMENT ON COLUMN public.products.upc_code IS 'Universal Product Code for scanning';
COMMENT ON COLUMN public.products.inventory_count IS 'Available quantity for count-based items';
COMMENT ON COLUMN public.products.inventory_weight IS 'Available weight for weight-based items';
COMMENT ON COLUMN public.products.track_inventory IS 'Whether to track inventory for this product';
COMMENT ON COLUMN public.products.low_stock_threshold IS 'Alert threshold for count-based items';
COMMENT ON COLUMN public.products.low_stock_weight_threshold IS 'Alert threshold for weight-based items';

-- ============================================================================
-- MENU_ITEMS TABLE - Add missing columns
-- ============================================================================
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS sub_category TEXT,
  ADD COLUMN IF NOT EXISTS is_vegetarian BOOLEAN,
  ADD COLUMN IF NOT EXISTS is_spicy BOOLEAN,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_sub_category ON public.menu_items(sub_category);
CREATE INDEX IF NOT EXISTS idx_menu_items_is_vegetarian ON public.menu_items(is_vegetarian);
CREATE INDEX IF NOT EXISTS idx_menu_items_is_spicy ON public.menu_items(is_spicy);

-- Add comments
COMMENT ON COLUMN public.menu_items.sub_category IS 'Menu item sub-category';
COMMENT ON COLUMN public.menu_items.is_vegetarian IS 'Whether the item is vegetarian';
COMMENT ON COLUMN public.menu_items.is_spicy IS 'Whether the item is spicy';
COMMENT ON COLUMN public.menu_items.updated_at IS 'Last update timestamp';

-- ============================================================================
-- PROMO_CODES TABLE - Add missing columns and rename existing ones
-- ============================================================================
-- Add missing columns
ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) CHECK (discount_percentage IS NULL OR (discount_percentage >= 0 AND discount_percentage <= 100)),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS is_sitewide BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS minimum_order_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Remove old columns if they exist (discount_type, discount_value, min_order_amount)
-- Note: We keep these for backward compatibility but new code uses the new columns
-- The application should prefer discount_amount/discount_percentage over discount_value

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_is_active ON public.promo_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_promo_codes_is_sitewide ON public.promo_codes(is_sitewide);

-- Add comments
COMMENT ON COLUMN public.promo_codes.discount_amount IS 'Fixed discount amount in currency';
COMMENT ON COLUMN public.promo_codes.discount_percentage IS 'Percentage discount (0-100)';
COMMENT ON COLUMN public.promo_codes.description IS 'Promo code description';
COMMENT ON COLUMN public.promo_codes.is_sitewide IS 'Whether promo applies to all products';
COMMENT ON COLUMN public.promo_codes.minimum_order_amount IS 'Minimum order amount to use promo';

-- ============================================================================
-- Update triggers for updated_at timestamps
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for products
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add triggers for menu_items
DROP TRIGGER IF EXISTS update_menu_items_updated_at ON public.menu_items;
CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add triggers for promo_codes
DROP TRIGGER IF EXISTS update_promo_codes_updated_at ON public.promo_codes;
CREATE TRIGGER update_promo_codes_updated_at
  BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Final verification comments
-- ============================================================================
COMMENT ON TABLE public.products IS 'Products table - matches Product interface in src/hooks/products/types.ts';
COMMENT ON TABLE public.menu_items IS 'Menu items table - matches MenuItem interface in src/hooks/products/types.ts';
COMMENT ON TABLE public.promo_codes IS 'Promo codes table - matches PromoCode interface in src/types/promoCode.ts';

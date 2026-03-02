-- ============================================================================
-- Create categories table with proper structure (includes tax_rate from category_tax_rates)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  tax_rate DECIMAL(5,4) CHECK (tax_rate IS NULL OR (tax_rate >= 0 AND tax_rate <= 1)),
  display_order INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if table already existed
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,4) CHECK (tax_rate IS NULL OR (tax_rate >= 0 AND tax_rate <= 1)),
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Disable RLS for categories
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_categories_name ON public.categories(name);
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON public.categories(display_order);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON public.categories(is_active);

-- ============================================================================
-- Migrate existing categories from products table
-- ============================================================================
INSERT INTO public.categories (name, display_order, tax_rate)
SELECT DISTINCT 
  p.category as name,
  ROW_NUMBER() OVER (ORDER BY p.category) as display_order,
  ctr.tax_rate
FROM public.products p
LEFT JOIN public.category_tax_rates ctr ON p.category = ctr.category
WHERE p.category IS NOT NULL AND p.category != ''
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- Update products table to use category_id FK
-- ============================================================================

-- Add category_id column to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE RESTRICT;

-- Populate category_id by matching names
UPDATE public.products p
SET category_id = c.id
FROM public.categories c
WHERE p.category = c.name AND p.category_id IS NULL;

-- Create "Uncategorized" category for any orphaned products
INSERT INTO public.categories (name, display_order, is_active)
VALUES ('Uncategorized', 999, FALSE)
ON CONFLICT (name) DO NOTHING;

-- Assign orphaned products to Uncategorized
UPDATE public.products p
SET category_id = c.id
FROM public.categories c
WHERE c.name = 'Uncategorized' AND p.category_id IS NULL;

-- Create index on category_id for faster joins
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);

-- Make category_id NOT NULL now that all products are migrated
ALTER TABLE public.products
ALTER COLUMN category_id SET NOT NULL;

-- Drop views that depend on the old category column
DROP VIEW IF EXISTS public.low_stock_products CASCADE;

-- Drop the old TEXT category column - we're using category_id now
ALTER TABLE public.products
DROP COLUMN IF EXISTS category CASCADE;

-- ============================================================================
-- Update collections table to use category_id FK
-- ============================================================================

-- Add category_id column to collections table
ALTER TABLE public.collections
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- Populate category_id by matching category names
UPDATE public.collections col
SET category_id = c.id
FROM public.categories c
WHERE col.category = c.name AND col.category_id IS NULL;

-- Create index on category_id
CREATE INDEX IF NOT EXISTS idx_collections_category_id ON public.collections(category_id);

-- Drop the old TEXT category column from collections
ALTER TABLE public.collections
DROP COLUMN IF EXISTS category CASCADE;

-- ============================================================================
-- Update menu_items table to use category_id FK (if needed)
-- ============================================================================

-- Check if menu_items has category column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'menu_items' 
    AND column_name = 'category'
    AND data_type = 'text'
  ) THEN
    -- Add category_id column
    ALTER TABLE public.menu_items
    ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
    
    -- Populate category_id by matching names
    UPDATE public.menu_items mi
    SET category_id = c.id
    FROM public.categories c
    WHERE mi.category = c.name AND mi.category_id IS NULL;
    
    -- Create index
    CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON public.menu_items(category_id);
    
    -- Drop old TEXT category column
    ALTER TABLE public.menu_items
    DROP COLUMN IF EXISTS category CASCADE;
  END IF;
END $$;

-- ============================================================================
-- Add trigger for updated_at on categories
-- ============================================================================
DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Drop category_tax_rates table (merged into categories)
-- ============================================================================
DROP TABLE IF EXISTS public.category_tax_rates;

-- ============================================================================
-- Add helpful comments
-- ============================================================================
COMMENT ON TABLE public.categories IS 'Product categories with tax rates and display settings';
COMMENT ON COLUMN public.categories.name IS 'Unique category name';
COMMENT ON COLUMN public.categories.description IS 'Optional category description';
COMMENT ON COLUMN public.categories.tax_rate IS 'Default tax rate for this category (0-1 decimal). Can be overridden at product level.';
COMMENT ON COLUMN public.categories.display_order IS 'Order for displaying categories (lower = first)';
COMMENT ON COLUMN public.categories.is_active IS 'Whether category is active and visible in dropdowns';
COMMENT ON COLUMN public.products.category_id IS 'Reference to categories table';

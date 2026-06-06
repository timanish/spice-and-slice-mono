-- Add priority field to products table
-- Priority range: 0-10, higher number = higher priority (shown first)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;

-- Add constraint if not exists (for products)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'products_priority_check' 
    AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products 
    ADD CONSTRAINT products_priority_check CHECK (priority >= 0 AND priority <= 10);
  END IF;
END $$;

-- Add priority field to categories table
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;

-- Add constraint if not exists (for categories)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'categories_priority_check' 
    AND conrelid = 'public.categories'::regclass
  ) THEN
    ALTER TABLE public.categories 
    ADD CONSTRAINT categories_priority_check CHECK (priority >= 0 AND priority <= 10);
  END IF;
END $$;

-- Create index for faster sorting (if not exists)
CREATE INDEX IF NOT EXISTS idx_products_priority ON public.products(priority DESC);
CREATE INDEX IF NOT EXISTS idx_categories_priority ON public.categories(priority DESC);

-- Add comments for documentation
COMMENT ON COLUMN public.products.priority IS 'Product display priority (0-10). Higher number = shown first. Used for sorting on products page.';
COMMENT ON COLUMN public.categories.priority IS 'Category display priority (0-10). Higher number = shown first. Used as tiebreaker when product priorities are equal.';

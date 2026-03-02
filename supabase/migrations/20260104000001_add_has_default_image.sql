-- Add has_default_image column to products table
-- This tracks whether the product is using a placeholder/default image
-- (i.e., the import script failed to fetch a real image)

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS has_default_image BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN public.products.has_default_image IS 'True if using placeholder image (image fetch failed during import)';

-- Create index for filtering products that need real images
CREATE INDEX IF NOT EXISTS idx_products_has_default_image
ON public.products(has_default_image)
WHERE has_default_image = TRUE;

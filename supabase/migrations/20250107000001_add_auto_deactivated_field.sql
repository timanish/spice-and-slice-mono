-- Add auto_deactivated field to products table
-- This tracks if a product was automatically deactivated when its category became inactive
-- vs manually deactivated by an admin

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS auto_deactivated BOOLEAN DEFAULT FALSE;

-- Add comment to explain the field
COMMENT ON COLUMN public.products.auto_deactivated IS 
'Tracks if product was auto-deactivated when category became inactive. If true, product can be auto-reactivated when category becomes active again. If false and is_active=false, product was manually deactivated.';

-- Create index for querying auto-deactivated products
CREATE INDEX IF NOT EXISTS idx_products_auto_deactivated ON public.products(auto_deactivated) WHERE auto_deactivated = TRUE;

-- Update existing inactive products to have auto_deactivated = false (they were manually deactivated)
UPDATE public.products
SET auto_deactivated = FALSE
WHERE is_active = FALSE AND auto_deactivated IS NULL;

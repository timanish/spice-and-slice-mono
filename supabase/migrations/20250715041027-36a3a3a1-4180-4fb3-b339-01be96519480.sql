-- Remove priority field from menu_items table since it doesn't apply to restaurant menu
ALTER TABLE public.menu_items 
DROP COLUMN IF EXISTS priority;

-- Drop the index we created for menu_items priority
DROP INDEX IF EXISTS idx_menu_items_priority;

-- Add priority field to products table with range 1-10
ALTER TABLE public.products 
ADD COLUMN priority integer NOT NULL DEFAULT 5 
CHECK (priority >= 1 AND priority <= 10);

-- Add index for better performance when ordering products by priority
CREATE INDEX idx_products_priority ON public.products(priority DESC);

-- Add comment to explain the priority system
COMMENT ON COLUMN public.products.priority IS 'Priority level from 1 (lowest) to 10 (highest) for display ordering';
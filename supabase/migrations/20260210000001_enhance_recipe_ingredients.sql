-- Enhance recipe_products table to support multiple ingredients with quantities and units
-- This migration adds structured ingredient data (amount, unit, notes) to replace simple text-based ingredients

-- Add new columns to recipe_products table
ALTER TABLE public.recipe_products
ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2) DEFAULT 1,
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'piece',
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update existing rows to have default values
UPDATE public.recipe_products
SET amount = 1, unit = 'piece', display_order = 0
WHERE amount IS NULL;

-- Add comments to document the schema
COMMENT ON COLUMN public.recipe_products.amount IS 'Numeric quantity for the ingredient (e.g., 2, 500, 0.5)';
COMMENT ON COLUMN public.recipe_products.unit IS 'Unit of measurement (e.g., cups, kg, g, lb, oz, tsp, tbsp, pieces, servings)';
COMMENT ON COLUMN public.recipe_products.display_order IS 'Order in which ingredients should be displayed (0 = first)';
COMMENT ON COLUMN public.recipe_products.notes IS 'Optional preparation notes (e.g., "finely chopped", "room temperature")';
COMMENT ON COLUMN public.recipe_products.quantity IS 'DEPRECATED: Legacy text-based quantity field, use amount + unit instead';

-- Create index for better query performance when fetching recipe ingredients
CREATE INDEX IF NOT EXISTS idx_recipe_products_recipe_id_display_order 
ON public.recipe_products(recipe_id, display_order);

-- Create index for product lookups
CREATE INDEX IF NOT EXISTS idx_recipe_products_product_id 
ON public.recipe_products(product_id);

-- Add constraint to ensure amount is positive
ALTER TABLE public.recipe_products
ADD CONSTRAINT check_amount_positive CHECK (amount > 0);

-- Add constraint to ensure unit is not empty
ALTER TABLE public.recipe_products
ADD CONSTRAINT check_unit_not_empty CHECK (unit IS NOT NULL AND unit != '');

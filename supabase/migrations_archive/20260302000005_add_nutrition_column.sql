-- Add nutrition info as JSONB to products table.
-- Stores serving_size, calories, macros etc. as flexible JSON.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS nutrition JSONB;

COMMENT ON COLUMN public.products.nutrition IS
'Nutrition facts as JSON: { serving_size, calories, total_fat, saturated_fat, cholesterol, sodium, total_carbs, dietary_fiber, sugars, protein }';

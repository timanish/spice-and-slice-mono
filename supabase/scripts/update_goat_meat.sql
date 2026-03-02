
-- Update the Goat Meat product to set is_weighted to TRUE
UPDATE public.products
SET is_weighted = TRUE
WHERE name LIKE '%Goat Meat%' AND is_weighted = FALSE;

-- Make sure it has a proper unit_of_measure
UPDATE public.products
SET unit_of_measure = 'lb'
WHERE name LIKE '%Goat Meat%' AND (unit_of_measure IS NULL OR unit_of_measure = '');

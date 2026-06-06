-- Add shippable_nationwide to categories (default for products in this category)
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS shippable_nationwide BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.categories.shippable_nationwide IS
  'Default shipping eligibility for products in this category. TRUE = products can ship nationwide.';

-- Add shippable_nationwide to products (NULL = inherit from category, TRUE/FALSE = override)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS shippable_nationwide BOOLEAN DEFAULT NULL;

COMMENT ON COLUMN public.products.shippable_nationwide IS
  'Shipping eligibility override. NULL = inherit from category, TRUE = ships nationwide, FALSE = local only.';

CREATE INDEX IF NOT EXISTS idx_products_shippable_nationwide
ON public.products(shippable_nationwide);

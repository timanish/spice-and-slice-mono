-- Add discount fields to cart_items table
ALTER TABLE public.cart_items
ADD COLUMN IF NOT EXISTS discount_percentage numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS flash_deal_id uuid REFERENCES public.flash_deals(id) ON DELETE SET NULL;

-- Add index for flash_deal_id
CREATE INDEX IF NOT EXISTS idx_cart_items_flash_deal_id ON public.cart_items(flash_deal_id);

-- Add comment
COMMENT ON COLUMN public.cart_items.discount_percentage IS 'Discount percentage applied to this cart item (e.g., 20 for 20% off)';
COMMENT ON COLUMN public.cart_items.flash_deal_id IS 'Reference to flash deal if item was added during a flash sale';

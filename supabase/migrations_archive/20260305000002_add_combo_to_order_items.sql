-- Add combo tracking columns to order_items
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS combo_id UUID REFERENCES public.product_combos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS combo_name TEXT;

CREATE INDEX idx_order_items_combo_id ON public.order_items(combo_id) WHERE combo_id IS NOT NULL;

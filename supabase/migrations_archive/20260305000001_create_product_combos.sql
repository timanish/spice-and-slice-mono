-- Create product_combos table
CREATE TABLE IF NOT EXISTS public.product_combos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  combo_price NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create combo_items table
CREATE TABLE IF NOT EXISTS public.combo_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id UUID NOT NULL REFERENCES public.product_combos(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 1,
  weight NUMERIC,
  is_addon BOOLEAN DEFAULT false,
  addon_price NUMERIC,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create cart_combo_items table
CREATE TABLE IF NOT EXISTS public.cart_combo_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  combo_id UUID NOT NULL REFERENCES public.product_combos(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  selected_addon_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_combo_items_combo_id ON public.combo_items(combo_id);
CREATE INDEX IF NOT EXISTS idx_cart_combo_items_cart_id ON public.cart_combo_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_product_combos_active ON public.product_combos(is_active) WHERE is_active = true;

-- Disable RLS on all three tables
ALTER TABLE public.product_combos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_combo_items DISABLE ROW LEVEL SECURITY;

-- Create updated_at trigger for product_combos
DROP TRIGGER IF EXISTS update_product_combos_updated_at ON public.product_combos;
CREATE TRIGGER update_product_combos_updated_at
  BEFORE UPDATE ON public.product_combos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create updated_at trigger for cart_combo_items
DROP TRIGGER IF EXISTS update_cart_combo_items_updated_at ON public.cart_combo_items;
CREATE TRIGGER update_cart_combo_items_updated_at
  BEFORE UPDATE ON public.cart_combo_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

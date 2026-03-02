-- Create foundational tables for Clerk + Supabase integration
-- All RLS disabled - using Clerk auth with application-layer authorization

-- Profiles table (Clerk users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  phone_number TEXT,
  onboarding_shown BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price_per_unit DECIMAL(10,2) NOT NULL,
  is_weighted BOOLEAN DEFAULT FALSE,
  unit_of_measure TEXT,
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;

-- Promo codes table
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2),
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.promo_codes DISABLE ROW LEVEL SECURITY;

-- Carts table
CREATE TABLE IF NOT EXISTS public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_carts_user_id ON public.carts(user_id);
ALTER TABLE public.carts DISABLE ROW LEVEL SECURITY;

-- Cart items table
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  weight DECIMAL(10,3),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_cart_items_cart_id ON public.cart_items(cart_id);
CREATE INDEX idx_cart_items_product_id ON public.cart_items(product_id);
ALTER TABLE public.cart_items DISABLE ROW LEVEL SECURITY;

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT NOT NULL,
  fulfillment_type TEXT NOT NULL DEFAULT 'delivery',
  promo_code_id UUID REFERENCES public.promo_codes(id),
  discount_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;

-- Order items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity DECIMAL(10,3) NOT NULL,
  price_per_unit DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;

-- Menu items table
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  image_url TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.menu_items DISABLE ROW LEVEL SECURITY;

-- Remove redundant phone column and keep only phone_number
-- The onboarding form uses 'phone' but we should standardize on 'phone_number'

-- First, copy any data from 'phone' to 'phone_number' if phone_number is null
-- UPDATE public.profiles 
-- SET phone_number = phone 
-- WHERE phone IS NOT NULL AND (phone_number IS NULL OR phone_number = '');

-- Now drop the redundant 'phone' column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone;

COMMENT ON COLUMN public.profiles.phone_number IS 'User phone number - primary contact field';

-- Comments documenting security model
COMMENT ON TABLE public.profiles IS 'RLS DISABLED - Using Clerk auth with application-layer authorization';
COMMENT ON TABLE public.carts IS 'RLS DISABLED - Using Clerk auth with application-layer authorization';
COMMENT ON TABLE public.cart_items IS 'RLS DISABLED - Using Clerk auth with application-layer authorization';
COMMENT ON TABLE public.orders IS 'RLS DISABLED - Using Clerk auth with application-layer authorization';
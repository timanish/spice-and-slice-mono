-- Create collections table for managing collection cards on home page
CREATE TABLE public.collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  category TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create festivals table for seasonal/festival sections
CREATE TABLE public.festivals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  banner_image TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create festival_products junction table
CREATE TABLE public.festival_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  festival_id UUID NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(festival_id, product_id)
);

-- Create featured_products table
CREATE TABLE public.featured_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id)
);

-- Create testimonials table
CREATE TABLE public.testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_image TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recipes table
CREATE TABLE public.recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  prep_time TEXT,
  cook_time TEXT,
  servings INTEGER,
  difficulty TEXT,
  instructions TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recipe_products junction table
CREATE TABLE public.recipe_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(recipe_id, product_id)
);

-- Create flash_deals table
CREATE TABLE public.flash_deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  discount_percentage INTEGER NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id)
);

-- Enable RLS
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.festivals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.festival_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flash_deals ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Everyone can view active collections" ON public.collections FOR SELECT USING (is_active = true);
CREATE POLICY "Everyone can view active festivals" ON public.festivals FOR SELECT USING (is_active = true);
CREATE POLICY "Everyone can view festival products" ON public.festival_products FOR SELECT USING (true);
CREATE POLICY "Everyone can view active featured products" ON public.featured_products FOR SELECT USING (is_active = true);
CREATE POLICY "Everyone can view active testimonials" ON public.testimonials FOR SELECT USING (is_active = true);
CREATE POLICY "Everyone can view active recipes" ON public.recipes FOR SELECT USING (is_active = true);
CREATE POLICY "Everyone can view recipe products" ON public.recipe_products FOR SELECT USING (true);
CREATE POLICY "Everyone can view active flash deals" ON public.flash_deals FOR SELECT USING (is_active = true);

-- Update triggers
CREATE OR REPLACE FUNCTION public.update_collections_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON public.collections FOR EACH ROW EXECUTE FUNCTION public.update_collections_updated_at();

CREATE OR REPLACE FUNCTION public.update_festivals_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER update_festivals_updated_at BEFORE UPDATE ON public.festivals FOR EACH ROW EXECUTE FUNCTION public.update_festivals_updated_at();

CREATE OR REPLACE FUNCTION public.update_featured_products_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER update_featured_products_updated_at BEFORE UPDATE ON public.featured_products FOR EACH ROW EXECUTE FUNCTION public.update_featured_products_updated_at();

CREATE OR REPLACE FUNCTION public.update_testimonials_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER update_testimonials_updated_at BEFORE UPDATE ON public.testimonials FOR EACH ROW EXECUTE FUNCTION public.update_testimonials_updated_at();

CREATE OR REPLACE FUNCTION public.update_recipes_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON public.recipes FOR EACH ROW EXECUTE FUNCTION public.update_recipes_updated_at();

CREATE OR REPLACE FUNCTION public.update_flash_deals_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER update_flash_deals_updated_at BEFORE UPDATE ON public.flash_deals FOR EACH ROW EXECUTE FUNCTION public.update_flash_deals_updated_at();

-- Sample data
INSERT INTO public.collections (name, description, category, image_url, display_order) VALUES
('Halal Meat', 'Premium quality halal certified meats', 'Meat', 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400', 1),
('Fresh Vegetables', 'Farm fresh vegetables delivered daily', 'Vegetables', 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=400', 2),
('Spices & Masala', 'Authentic Indian and Nepali spices', 'Spices', 'https://images.unsplash.com/photo-1596040033229-a0b57a1790d8?w=400', 3),
('Dal & Beans', 'Premium lentils and legumes', 'Dal & Beans', 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400', 4),
('Rice & Grains', 'High quality rice and grains', 'Rice', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400', 5),
('Snacks & Sweets', 'Traditional snacks', 'Snacks', 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400', 6);

INSERT INTO public.testimonials (customer_name, rating, review, display_order) VALUES
('Priya Sharma', 5, 'Best quality halal meat in DFW! Always fresh and the delivery is always on time.', 1),
('Raj Patel', 5, 'The spices are so authentic, just like back home. Great selection and reasonable prices.', 2),
('Anita Kumar', 4, 'Fresh vegetables and great customer service. My go-to place for all Indian groceries.', 3);

-- Indexes
CREATE INDEX idx_collections_active_order ON public.collections(is_active, display_order);
CREATE INDEX idx_festivals_dates ON public.festivals(start_date, end_date);
CREATE INDEX idx_featured_products_active_order ON public.featured_products(is_active, display_order);
CREATE INDEX idx_flash_deals_dates ON public.flash_deals(start_date, end_date);

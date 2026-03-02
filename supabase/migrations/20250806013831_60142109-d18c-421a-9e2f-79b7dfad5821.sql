-- Create hero_slides table for managing carousel content
CREATE TABLE public.hero_slides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sub_description TEXT,
  image_url TEXT NOT NULL,
  button_text TEXT,
  button_link TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can manage all hero slides" 
ON public.hero_slides 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow everyone to view active slides
CREATE POLICY "Everyone can view active hero slides" 
ON public.hero_slides 
FOR SELECT 
USING (is_active = true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_hero_slides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_hero_slides_updated_at
BEFORE UPDATE ON public.hero_slides
FOR EACH ROW
EXECUTE FUNCTION public.update_hero_slides_updated_at();

-- Insert default slides to get started
INSERT INTO public.hero_slides (title, description, sub_description, image_url, button_text, button_link, display_order) VALUES
('Spice&Slice Bazaar', 'Authentic Indo-Nepali cuisine with the perfect blend of traditional flavors and modern creativity.', 'Experience our carefully crafted dishes with aromatic spices and fresh ingredients that will transport your taste buds to the Himalayas.', 'https://images.unsplash.com/photo-1589647363585-f4a7d3877b10?q=80&w=1974&auto=format&fit=crop', 'Shop Now', '#products-section', 1),
('5% OFF Online Orders', 'Use promo code WELCOME5 at checkout and enjoy 5% off your grocery and meat items!', 'Limited time offer for all our fresh grocery and specialty meat products delivered to your doorstep.', 'https://images.unsplash.com/photo-1600335895229-6e75511892c8?q=80&w=1974&auto=format&fit=crop', NULL, NULL, 2);
-- Create junction table to link TikTok videos with products
-- Products featured in each TikTok video can be shown on the website

CREATE TABLE IF NOT EXISTS public.tiktok_video_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tiktok_video_id uuid NOT NULL REFERENCES public.tiktok_videos(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  display_order integer DEFAULT 0, -- Order of products for this video
  created_at timestamptz DEFAULT now(),
  
  -- Ensure no duplicate video-product pairs
  UNIQUE(tiktok_video_id, product_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_tiktok_video_products_video ON public.tiktok_video_products(tiktok_video_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_video_products_product ON public.tiktok_video_products(product_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_video_products_order ON public.tiktok_video_products(tiktok_video_id, display_order);

-- Disable RLS for admin access (Clerk auth)
ALTER TABLE public.tiktok_video_products DISABLE ROW LEVEL SECURITY;

-- Add comment for documentation
COMMENT ON TABLE public.tiktok_video_products IS 'Junction table linking TikTok videos to products featured in them';
COMMENT ON COLUMN public.tiktok_video_products.display_order IS 'Order of products display (0 = first)';

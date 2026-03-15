-- Add slug field for friendly TV menu board URLs
ALTER TABLE public.tv_menu_boards
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Unique constraint so slugs don't collide
CREATE UNIQUE INDEX IF NOT EXISTS idx_tv_menu_boards_slug
  ON public.tv_menu_boards(slug) WHERE slug IS NOT NULL;

COMMENT ON COLUMN public.tv_menu_boards.slug IS 'URL-friendly identifier, e.g. /tv-menu/meat-shop';

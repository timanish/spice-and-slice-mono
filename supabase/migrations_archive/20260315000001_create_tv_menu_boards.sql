-- TV Menu Boards: stores configuration for TV display screens in the restaurant
CREATE TABLE IF NOT EXISTS public.tv_menu_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_published BOOLEAN DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for quickly finding the published board
CREATE INDEX IF NOT EXISTS idx_tv_menu_boards_published
  ON public.tv_menu_boards(is_published) WHERE is_published = true;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_tv_menu_boards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tv_menu_boards_updated_at
BEFORE UPDATE ON public.tv_menu_boards
FOR EACH ROW
EXECUTE FUNCTION public.update_tv_menu_boards_updated_at();

-- Disable RLS (admin-only table accessed via service role)
ALTER TABLE public.tv_menu_boards DISABLE ROW LEVEL SECURITY;

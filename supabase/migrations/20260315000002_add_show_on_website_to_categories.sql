-- Add show_on_website flag to categories so TV-only categories can be hidden from the main site
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS show_on_website BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.categories.show_on_website IS 'When false, category and its items are hidden from the customer website but still available for TV menu boards.';

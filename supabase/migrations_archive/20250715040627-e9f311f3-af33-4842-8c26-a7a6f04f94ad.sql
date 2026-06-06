-- Add priority field to menu_items table with range 1-10
ALTER TABLE public.menu_items 
ADD COLUMN priority integer NOT NULL DEFAULT 5 
CHECK (priority >= 1 AND priority <= 10);

-- Add index for better performance when ordering by priority
CREATE INDEX idx_menu_items_priority ON public.menu_items(priority DESC);

-- Add comment to explain the priority system
COMMENT ON COLUMN public.menu_items.priority IS 'Priority level from 1 (lowest) to 10 (highest) for display ordering';
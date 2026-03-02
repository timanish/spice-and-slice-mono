-- Add serves_people column to menu_items table
-- This column indicates how many people one tray of the menu item can serve

ALTER TABLE public.menu_items
ADD COLUMN serves_people INTEGER;

COMMENT ON COLUMN public.menu_items.serves_people IS 'Number of people that one tray of this menu item serves';

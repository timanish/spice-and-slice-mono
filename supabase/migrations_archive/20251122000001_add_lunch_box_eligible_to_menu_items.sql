-- Add lunch_box_eligible field to menu_items table
ALTER TABLE menu_items 
ADD COLUMN lunch_box_eligible BOOLEAN DEFAULT false;

-- Create index for faster queries
CREATE INDEX idx_menu_items_lunch_box_eligible ON menu_items(lunch_box_eligible) WHERE lunch_box_eligible = true;

-- Update some existing items to be lunch box eligible (example)
-- You can run this manually or adjust as needed
UPDATE menu_items 
SET lunch_box_eligible = true 
WHERE category IN ('Main Course', 'Appetizer', 'Salad', 'Bowl');

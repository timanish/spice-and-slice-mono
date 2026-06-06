-- Create lunch_box_menu_selections table to track which menu items are selected for each week
CREATE TABLE IF NOT EXISTS lunch_box_menu_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES lunch_box_subscriptions(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  selected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(subscription_id, menu_item_id, week_start_date)
);

-- Create index for faster queries
CREATE INDEX idx_lunch_box_menu_selections_subscription ON lunch_box_menu_selections(subscription_id);
CREATE INDEX idx_lunch_box_menu_selections_week ON lunch_box_menu_selections(week_start_date);

-- Add RLS policies
ALTER TABLE lunch_box_menu_selections ENABLE ROW LEVEL SECURITY;

-- Users can view their own selections
CREATE POLICY "Users can view their own lunch box menu selections"
  ON lunch_box_menu_selections
  FOR SELECT
  USING (
    subscription_id IN (
      SELECT id FROM lunch_box_subscriptions WHERE user_id = auth.uid()::text
    )
  );

-- Users can insert their own selections
CREATE POLICY "Users can insert their own lunch box menu selections"
  ON lunch_box_menu_selections
  FOR INSERT
  WITH CHECK (
    subscription_id IN (
      SELECT id FROM lunch_box_subscriptions WHERE user_id = auth.uid()::text
    )
  );

-- Users can delete their own selections
CREATE POLICY "Users can delete their own lunch box menu selections"
  ON lunch_box_menu_selections
  FOR DELETE
  USING (
    subscription_id IN (
      SELECT id FROM lunch_box_subscriptions WHERE user_id = auth.uid()::text
    )
  );

-- Admins can do everything
CREATE POLICY "Admins can manage all lunch box menu selections"
  ON lunch_box_menu_selections
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid()::text
      AND role = 'admin'
    )
  );

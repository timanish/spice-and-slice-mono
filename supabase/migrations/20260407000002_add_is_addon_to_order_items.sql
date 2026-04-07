-- Add is_addon flag to order_items so we can distinguish combo core items from addon items
-- after order creation, enabling addon toggling during the review/confirmation cycle.

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS is_addon boolean NOT NULL DEFAULT false;

-- Backfill: mark nothing (all existing rows are either core or pre-fix unfiltered addons,
-- no reliable way to distinguish retroactively — new orders will populate correctly)

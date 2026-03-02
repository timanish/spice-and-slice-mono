-- Remove approval workflow from lunch box subscriptions
-- Custom plans now work the same as weekly/monthly plans (instant activation)

-- 1. Update status constraint to remove pending_approval and approved
ALTER TABLE lunch_box_subscriptions 
  DROP CONSTRAINT IF EXISTS lunch_box_subscriptions_status_check;

ALTER TABLE lunch_box_subscriptions
  ADD CONSTRAINT lunch_box_subscriptions_status_check 
  CHECK (status IN ('active', 'paused', 'cancelled'));

-- 2. Update any pending_approval or approved subscriptions to active
UPDATE lunch_box_subscriptions
SET status = 'active'
WHERE status IN ('pending_approval', 'approved');

-- 3. Drop approval-related columns
ALTER TABLE lunch_box_subscriptions
  DROP COLUMN IF EXISTS admin_notes,
  DROP COLUMN IF EXISTS approved_at,
  DROP COLUMN IF EXISTS approved_by;

-- 4. Drop the approval status index
DROP INDEX IF EXISTS idx_lunch_box_subscriptions_status_approval;

-- 5. Update notification type constraint to remove approval types
ALTER TABLE lunch_box_notifications 
  DROP CONSTRAINT IF EXISTS lunch_box_notifications_type_check;

ALTER TABLE lunch_box_notifications
  ADD CONSTRAINT lunch_box_notifications_type_check 
  CHECK (type IN ('delivery_reminder', 'subscription_ending'));

-- 6. Delete any approval-related notifications
DELETE FROM lunch_box_notifications
WHERE type IN ('subscription_approved', 'subscription_rejected');

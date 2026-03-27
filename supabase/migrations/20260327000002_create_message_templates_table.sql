-- Create admin_message_templates table
CREATE TABLE IF NOT EXISTS admin_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index on is_active for efficient filtering
CREATE INDEX IF NOT EXISTS idx_templates_is_active ON admin_message_templates(is_active);

-- Insert pre-seeded templates
INSERT INTO admin_message_templates (name, subject, body, is_active) VALUES
(
  'Payment Failed - Manual Refund',
  'Your Order Refund - Action Required',
  'We encountered an issue processing your payment. Our team is manually processing your refund. You will receive the credit to your original payment method within 3-5 business days. Thank you for your patience.',
  TRUE
),
(
  'Order Processing Delay',
  'Your Order is Being Prepared',
  'Your order is taking a bit longer to prepare than expected, but we are working on it. We appreciate your patience and will notify you as soon as it ships.',
  TRUE
),
(
  'Custom Message',
  'Custom Subject Line',
  'Custom message body - edit this template to create your own message.',
  TRUE
);

-- Disable Row Level Security on this table
-- RLS is disabled because this table is admin-only and accessed via authenticated Edge Functions
ALTER TABLE admin_message_templates DISABLE ROW LEVEL SECURITY;

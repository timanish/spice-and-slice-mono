-- Create customer_messages table for logging sent messages
CREATE TABLE IF NOT EXISTS public.customer_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  template_id UUID NOT NULL REFERENCES public.admin_message_templates(id),
  subject TEXT NOT NULL,
  message_body TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  sent_by_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for queries
CREATE INDEX IF NOT EXISTS idx_customer_messages_user_id ON public.customer_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_messages_sent_at ON public.customer_messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_messages_order_id ON public.customer_messages(order_id);

-- Disable RLS for admin access via Edge Functions
ALTER TABLE public.customer_messages DISABLE ROW LEVEL SECURITY;

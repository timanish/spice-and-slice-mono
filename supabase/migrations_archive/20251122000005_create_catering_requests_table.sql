-- Create catering_requests table
CREATE TABLE IF NOT EXISTS public.catering_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Contact Information
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  
  -- Event Details
  guest_count INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  event_date TEXT NOT NULL,
  event_time TEXT NOT NULL,
  venue TEXT NOT NULL,
  
  -- Additional Information
  dietary_restrictions TEXT,
  additional_info TEXT,
  
  -- Menu Items (stored as JSONB)
  selected_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled'))
);

-- Create index for faster user queries
CREATE INDEX IF NOT EXISTS idx_catering_requests_user_id ON public.catering_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_catering_requests_created_at ON public.catering_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_catering_requests_status ON public.catering_requests(status);

-- Disable RLS and drop all policies
ALTER TABLE public.catering_requests DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own catering requests" ON public.catering_requests;
DROP POLICY IF EXISTS "Users can insert their own catering requests" ON public.catering_requests;
DROP POLICY IF EXISTS "Users can update their own catering requests" ON public.catering_requests;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_catering_requests_updated_at ON public.catering_requests;
CREATE TRIGGER update_catering_requests_updated_at
  BEFORE UPDATE ON public.catering_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

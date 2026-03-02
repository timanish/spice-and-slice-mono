-- Print jobs table for store printer queue
CREATE TABLE IF NOT EXISTS public.print_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  claimed_at TIMESTAMPTZ,
  printed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT
);

-- Indexes for efficient polling
CREATE INDEX idx_print_jobs_status ON print_jobs(status);
CREATE INDEX idx_print_jobs_created_at ON print_jobs(created_at);
CREATE INDEX idx_print_jobs_order_id ON print_jobs(order_id);

-- Constraints
ALTER TABLE print_jobs
  ADD CONSTRAINT print_job_status_check
  CHECK (status IN ('pending', 'claimed', 'printed', 'failed'));

-- Disable RLS (using application-layer auth like other tables)
ALTER TABLE print_jobs DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE print_jobs IS 'Queue for store printer jobs - RLS DISABLED';
COMMENT ON COLUMN print_jobs.status IS 'Job status: pending, claimed, printed, failed';

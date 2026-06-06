-- Add user reviews support to testimonials table
-- This migration adds necessary columns to support user-submitted reviews with admin approval

-- Add new columns to testimonials table
ALTER TABLE public.testimonials 
  ADD COLUMN IF NOT EXISTS user_id TEXT,
  ADD COLUMN IF NOT EXISTS user_email TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved';

-- Add check constraints for enums
ALTER TABLE public.testimonials 
  ADD CONSTRAINT testimonials_source_check 
  CHECK (source IN ('admin', 'user'));

ALTER TABLE public.testimonials 
  ADD CONSTRAINT testimonials_status_check 
  CHECK (status IN ('pending', 'approved'));

-- Update existing rows to have correct source and status
UPDATE public.testimonials 
SET source = 'admin', status = 'approved' 
WHERE source IS NULL OR status IS NULL;

-- Make customer_image nullable (it already is, but being explicit)
-- No action needed as it's already nullable

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_testimonials_status_active 
  ON public.testimonials(status, is_active);

CREATE INDEX IF NOT EXISTS idx_testimonials_user_id 
  ON public.testimonials(user_id) 
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_testimonials_source 
  ON public.testimonials(source);

-- Add comment for documentation
COMMENT ON COLUMN public.testimonials.user_id IS 'Clerk user ID for user-submitted reviews. NULL for admin-created testimonials.';
COMMENT ON COLUMN public.testimonials.user_email IS 'Email of the user who submitted the review. NULL for admin-created testimonials.';
COMMENT ON COLUMN public.testimonials.source IS 'Source of the testimonial: admin (created by admin) or user (submitted by user)';
COMMENT ON COLUMN public.testimonials.status IS 'Approval status: pending (awaiting approval) or approved (visible on site)';

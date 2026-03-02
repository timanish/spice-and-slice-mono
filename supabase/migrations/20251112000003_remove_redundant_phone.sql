-- Remove redundant phone column and keep only phone_number
-- The onboarding form uses 'phone' but we should standardize on 'phone_number'

-- First, ensure phone_number column exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Copy any data from 'phone' to 'phone_number' if phone_number is null
UPDATE public.profiles 
SET phone_number = phone 
WHERE phone IS NOT NULL AND (phone_number IS NULL OR phone_number = '');

-- Now drop the redundant 'phone' column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone;

COMMENT ON COLUMN public.profiles.phone_number IS 'User phone number - primary contact field';

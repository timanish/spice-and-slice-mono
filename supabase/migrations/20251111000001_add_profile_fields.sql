-- Add profile fields for onboarding
-- This migration adds phone, address, and completion tracking fields to profiles table

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS address_line_1 text,
ADD COLUMN IF NOT EXISTS address_line_2 text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS postal_code text,
ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;

-- Create index for faster lookups on profile completion status
CREATE INDEX IF NOT EXISTS idx_profiles_completed ON profiles(profile_completed);

-- Update existing profiles to mark as incomplete if they don't have phone/address
UPDATE profiles 
SET profile_completed = false 
WHERE phone IS NULL OR address_line_1 IS NULL;

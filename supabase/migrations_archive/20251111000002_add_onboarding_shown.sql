-- Add onboarding_shown flag to track if user has seen onboarding page
-- This ensures onboarding is shown only once on first sign-up

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_shown boolean DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_shown ON profiles(onboarding_shown);

-- Existing users should not see onboarding (they're already using the app)
UPDATE profiles 
SET onboarding_shown = true 
WHERE created_at < NOW();

-- Verify the column was added
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name = 'onboarding_shown';

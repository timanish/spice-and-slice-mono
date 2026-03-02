-- Remove address fields from profiles table as they've been moved to user_addresses table
-- These fields are now stored in the user_addresses table for better management

ALTER TABLE profiles
  DROP COLUMN IF EXISTS address_line1,
  DROP COLUMN IF EXISTS address_line2,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS state,
  DROP COLUMN IF EXISTS postal_code,
  DROP COLUMN IF EXISTS distance_from_store,
  DROP COLUMN IF EXISTS latitude,
  DROP COLUMN IF EXISTS longitude,
  DROP COLUMN IF EXISTS distance_calculated_at;

-- Drop the index on distance_from_store since the column is removed
DROP INDEX IF EXISTS idx_profiles_distance;

-- Note: All address data has already been migrated to user_addresses table
-- in migration 20251222000000_create_user_addresses.sql

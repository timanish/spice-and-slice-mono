-- Remove redundant address columns with underscores
-- The onboarding form uses address_line1 and address_line2 (without underscores)
-- We need to remove address_line_1 and address_line_2 (with underscores) if they exist

-- First, copy any data from address_line_1 to address_line1 if address_line1 is null
DO $$ 
BEGIN
    -- Check if both columns exist before trying to copy data
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'address_line_1'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'address_line1'
    ) THEN
        EXECUTE 'UPDATE public.profiles SET address_line1 = address_line_1 WHERE address_line_1 IS NOT NULL AND (address_line1 IS NULL OR address_line1 = '''')';
    END IF;
END $$;

-- Copy data from address_line_2 to address_line2 if address_line2 is null
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'address_line_2'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'address_line2'
    ) THEN
        EXECUTE 'UPDATE public.profiles SET address_line2 = address_line_2 WHERE address_line_2 IS NOT NULL AND (address_line2 IS NULL OR address_line2 = '''')';
    END IF;
END $$;

-- Drop the redundant columns with underscores
ALTER TABLE public.profiles DROP COLUMN IF EXISTS address_line_1;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS address_line_2;

-- Note: Address columns (address_line1, address_line2, city, state, postal_code) 
-- are migrated to user_addresses table in migration 20251222000000_create_user_addresses.sql
-- and removed from profiles in migration 20251222000001_remove_address_from_profiles.sql


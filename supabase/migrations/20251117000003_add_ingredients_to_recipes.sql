-- Add missing columns to recipes table
ALTER TABLE public.recipes
ADD COLUMN IF NOT EXISTS ingredients TEXT;

-- Rename prep_time and cook_time to match code expectations
ALTER TABLE public.recipes
RENAME COLUMN prep_time TO prep_time_minutes;

ALTER TABLE public.recipes
RENAME COLUMN cook_time TO cook_time_minutes;

-- Change column types to INTEGER
ALTER TABLE public.recipes
ALTER COLUMN prep_time_minutes TYPE INTEGER USING prep_time_minutes::integer;

ALTER TABLE public.recipes
ALTER COLUMN cook_time_minutes TYPE INTEGER USING cook_time_minutes::integer;

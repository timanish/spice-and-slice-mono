-- Fix RLS on menu-items storage bucket
-- The "new row violates row-level security policy" error is coming from the storage bucket, not the table!

-- Drop any existing policies on the menu-items bucket
DROP POLICY IF EXISTS "Allow public access to menu-items images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload menu-items images" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon to upload menu-items images" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;

-- Create permissive policies for the menu-items bucket
CREATE POLICY "Anyone can view menu-items images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'menu-items');

CREATE POLICY "Anyone can upload menu-items images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'menu-items');

CREATE POLICY "Anyone can update menu-items images"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'menu-items');

CREATE POLICY "Anyone can delete menu-items images"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'menu-items');

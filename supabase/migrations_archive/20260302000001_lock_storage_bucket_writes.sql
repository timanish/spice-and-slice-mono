-- =============================================================================
-- Lock down menu-items storage bucket: public read, service-role-only writes
-- =============================================================================
-- Previously, INSERT/UPDATE/DELETE were granted TO public, allowing anyone
-- to upload, modify, or delete files. Now only service role (via the
-- upload-image edge function) can write.

-- Drop the overly permissive write policies
DROP POLICY IF EXISTS "Anyone can upload menu-items images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update menu-items images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete menu-items images" ON storage.objects;

-- Keep the public SELECT policy (images need to be viewable)
-- "Anyone can view menu-items images" already exists and is correct.

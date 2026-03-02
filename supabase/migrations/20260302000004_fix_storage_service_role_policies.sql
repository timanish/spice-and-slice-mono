-- Fix: Add service_role write policies for menu-items storage bucket.
-- Migration 20260302000001 dropped public write policies but never added
-- service_role replacements, breaking the upload-image edge function.

CREATE POLICY "service_role can upload to menu-items"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'menu-items');

CREATE POLICY "service_role can update menu-items"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'menu-items')
WITH CHECK (bucket_id = 'menu-items');

CREATE POLICY "service_role can delete menu-items"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'menu-items');

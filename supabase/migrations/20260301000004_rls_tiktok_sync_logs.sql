-- Enable RLS on tiktok_sync_logs (missed from initial RLS migration)
ALTER TABLE public.tiktok_sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select" ON public.tiktok_sync_logs FOR SELECT TO anon USING (true);
CREATE POLICY "authenticated_select" ON public.tiktok_sync_logs FOR SELECT TO authenticated USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.tiktok_sync_logs FROM anon, authenticated;

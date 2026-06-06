-- Create tiktok_videos table to store fetched TikTok videos
CREATE TABLE IF NOT EXISTS tiktok_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id text UNIQUE NOT NULL, -- TikTok video ID extracted from URL
  video_url text NOT NULL, -- Full TikTok video URL
  author_name text, -- TikTok username (@spiceandslicedfw)
  author_url text, -- Profile URL
  title text, -- Video description/caption
  thumbnail_url text, -- Video thumbnail/cover image
  embed_html text, -- oEmbed HTML for embedding
  duration integer, -- Video duration in seconds (if available)
  view_count bigint, -- View count (if available from scraping)
  like_count bigint, -- Like count (if available)
  published_at timestamptz, -- When video was published on TikTok
  display_order integer DEFAULT 0, -- Order for display (0 = first)
  is_active boolean DEFAULT true, -- Show/hide video
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_tiktok_videos_active ON tiktok_videos(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_tiktok_videos_published ON tiktok_videos(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_tiktok_videos_video_id ON tiktok_videos(video_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_tiktok_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tiktok_videos_updated_at
  BEFORE UPDATE ON tiktok_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_tiktok_videos_updated_at();

-- Create sync log table to track fetching attempts
CREATE TABLE IF NOT EXISTS tiktok_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_started_at timestamptz DEFAULT now(),
  sync_completed_at timestamptz,
  status text CHECK (status IN ('running', 'success', 'error')),
  videos_fetched integer DEFAULT 0,
  videos_added integer DEFAULT 0,
  videos_updated integer DEFAULT 0,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tiktok_sync_logs_created ON tiktok_sync_logs(created_at DESC);

-- Disable RLS for public read access
ALTER TABLE tiktok_videos DISABLE ROW LEVEL SECURITY;
ALTER TABLE tiktok_sync_logs DISABLE ROW LEVEL SECURITY;

-- Insert sample data (you can remove these after testing)
INSERT INTO tiktok_videos (video_id, video_url, author_name, author_url, title, thumbnail_url, display_order, published_at)
VALUES 
  ('sample1', 'https://www.tiktok.com/@spiceandslicedfw/video/sample1', '@spiceandslicedfw', 'https://www.tiktok.com/@spiceandslicedfw', 'Sample TikTok Video #1 - Replace with real videos', 'https://placehold.co/400x711', 0, now() - interval '1 day'),
  ('sample2', 'https://www.tiktok.com/@spiceandslicedfw/video/sample2', '@spiceandslicedfw', 'https://www.tiktok.com/@spiceandslicedfw', 'Sample TikTok Video #2 - Replace with real videos', 'https://placehold.co/400x711', 1, now() - interval '2 days')
ON CONFLICT (video_id) DO NOTHING;

-- Add video_file_url column to store direct MP4 video URLs
ALTER TABLE tiktok_videos 
ADD COLUMN IF NOT EXISTS video_file_url text;

-- Add comment for documentation
COMMENT ON COLUMN tiktok_videos.video_file_url IS 'Direct MP4 video URL from TikTok CDN (scraped via API)';

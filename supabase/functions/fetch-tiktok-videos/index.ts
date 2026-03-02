import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TikTokVideo {
  video_id: string;
  video_url: string;
  author_name: string;
  author_url: string;
  title: string;
  thumbnail_url: string;
  video_file_url?: string;
  embed_html?: string;
  published_at: string;
  duration?: number;
  view_count?: number;
  like_count?: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create sync log entry
    const { data: syncLog } = await supabase
      .from("tiktok_sync_logs")
      .insert({
        status: "running",
        sync_started_at: new Date().toISOString(),
      })
      .select()
      .single();

    const syncLogId = syncLog?.id;

    console.log("Starting TikTok video fetch for @spiceandslicedfw");

    const USERNAME = "spiceandslicedfw";
    const videos: TikTokVideo[] = [];
    let videosAdded = 0;
    let videosUpdated = 0;

    // Use tikwm.com API to get user's videos (free API, no key needed)
    // Alternative: Use TikAPI.io, RapidAPI TikTok scraper, or similar service
    try {
      console.log(`Fetching videos from TikTok user feed API for @${USERNAME}`);
      
      // Step 1: Scrape profile page to get video IDs
      const profileResponse = await fetch(
        `https://www.tiktok.com/@${USERNAME}`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        }
      );

      const html = await profileResponse.text();
      
      // Extract video IDs from the HTML
      const videoIdRegex = /\/video\/(\d+)/g;
      const matches = [...html.matchAll(videoIdRegex)];
      const uniqueVideoIds = [...new Set(matches.map(m => m[1]))].slice(0, 10);

      console.log(`Found ${uniqueVideoIds.length} video IDs from profile page`);

      // Step 2: For each video ID, fetch video data using tikwm.com API
      for (const videoId of uniqueVideoIds) {
        const videoUrl = `https://www.tiktok.com/@${USERNAME}/video/${videoId}`;
        
        try {
          // Use tikwm.com API to get video download URL
          const tikwmResponse = await fetch(
            `https://www.tikwm.com/api/?url=${encodeURIComponent(videoUrl)}&hd=1`
          );
          
          if (tikwmResponse.ok) {
            const tikwmData = await tikwmResponse.json();
            
            if (tikwmData.code === 0 && tikwmData.data) {
              const data = tikwmData.data;
              
              // tikwm.com returns direct video URLs
              const videoFileUrl = data.hdplay || data.play; // HD quality or standard
              
              videos.push({
                video_id: videoId,
                video_url: videoUrl,
                author_name: data.author?.nickname || `@${USERNAME}`,
                author_url: `https://www.tiktok.com/@${data.author?.unique_id || USERNAME}`,
                title: data.title || "",
                thumbnail_url: data.cover || data.origin_cover || "",
                video_file_url: videoFileUrl, // Direct MP4 URL
                duration: data.duration,
                view_count: data.play_count,
                like_count: data.digg_count,
                published_at: data.create_time 
                  ? new Date(data.create_time * 1000).toISOString() 
                  : new Date().toISOString(),
              });
              
              console.log(`✓ Fetched video data for ${videoId} with direct URL`);
            } else {
              console.warn(`tikwm.com returned error for ${videoId}:`, tikwmData.msg);
            }
          }
        } catch (error) {
          console.error(`Failed to fetch video data for ${videoId}:`, error);
          
          // Fallback: Try oEmbed for basic metadata
          try {
            const oEmbedResponse = await fetch(
              `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`
            );
            
            if (oEmbedResponse.ok) {
              const oEmbedData = await oEmbedResponse.json();
              
              videos.push({
                video_id: videoId,
                video_url: videoUrl,
                author_name: oEmbedData.author_name || `@${USERNAME}`,
                author_url: oEmbedData.author_url || `https://www.tiktok.com/@${USERNAME}`,
                title: oEmbedData.title || "",
                thumbnail_url: oEmbedData.thumbnail_url || "",
                embed_html: oEmbedData.html || "",
                published_at: new Date().toISOString(),
              });
              
              console.log(`○ Fetched oEmbed fallback for ${videoId} (no video URL)`);
            }
          } catch (oEmbedError) {
            console.error(`oEmbed fallback also failed for ${videoId}:`, oEmbedError);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching from TikTok profile:", error);
    }

    // If we found videos, save them to database
    if (videos.length > 0) {
      console.log(`Processing ${videos.length} videos`);

      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        
        // Check if video already exists
        const { data: existing } = await supabase
          .from("tiktok_videos")
          .select("id")
          .eq("video_id", video.video_id)
          .single();

        if (existing) {
          // Update existing video
          await supabase
            .from("tiktok_videos")
            .update({
              title: video.title,
              thumbnail_url: video.thumbnail_url,
              video_file_url: video.video_file_url,
              embed_html: video.embed_html,
              duration: video.duration,
              view_count: video.view_count,
              like_count: video.like_count,
              display_order: i, // Update order based on latest fetch
            })
            .eq("video_id", video.video_id);
          
          videosUpdated++;
        } else {
          // Insert new video
          await supabase
            .from("tiktok_videos")
            .insert({
              ...video,
              display_order: i,
              is_active: true,
            });
          
          videosAdded++;
        }
      }
    }

    // Update sync log
    if (syncLogId) {
      await supabase
        .from("tiktok_sync_logs")
        .update({
          status: "success",
          sync_completed_at: new Date().toISOString(),
          videos_fetched: videos.length,
          videos_added: videosAdded,
          videos_updated: videosUpdated,
        })
        .eq("id", syncLogId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        videos_fetched: videos.length,
        videos_added: videosAdded,
        videos_updated: videosUpdated,
        message: `Successfully synced ${videos.length} TikTok videos`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in fetch-tiktok-videos function:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Refresh interval: 1.5 hours (90 minutes) before 2-hour expiry
const REFRESH_THRESHOLD_MS = 90 * 60 * 1000; // 1.5 hours in milliseconds

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("🎬 TikTok Video URL Refresh - Scheduled Run");
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all active videos
    console.log("📋 Fetching all active TikTok videos...");
    const { data: videos, error: fetchError } = await supabase
      .from("tiktok_videos")
      .select("id, video_url, video_file_url, thumbnail_url, updated_at")
      .eq("is_active", true);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`✓ Found ${videos?.length || 0} active videos`);

    if (!videos || videos.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No videos to refresh",
          refreshed: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Filter videos that need refresh (older than 1.5 hours)
    const now = Date.now();
    const videosToRefresh = videos.filter((video) => {
      if (!video.updated_at) return true; // Never updated, refresh it
      
      const lastUpdate = new Date(video.updated_at).getTime();
      const age = now - lastUpdate;
      
      return age >= REFRESH_THRESHOLD_MS;
    });

    console.log(`🔄 ${videosToRefresh.length} videos need refresh (≥1.5 hours old)`);

    const results = {
      total: videos.length,
      refreshed: 0,
      skipped: videos.length - videosToRefresh.length,
      errors: [] as string[],
    };

    // Refresh each video
    for (const video of videosToRefresh) {
      try {
        console.log(`\n📹 Refreshing video ID: ${video.id}`);
        console.log(`🔗 URL: ${video.video_url}`);

        // Fetch fresh video URL from tikwm.com
        const tikwmUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(
          video.video_url
        )}&hd=1`;

        const tikwmResponse = await fetch(tikwmUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; Supabase Edge Function)",
          },
        });

        if (!tikwmResponse.ok) {
          throw new Error(`tikwm.com API failed: ${tikwmResponse.status}`);
        }

        const tikwmData = await tikwmResponse.json();

        if (tikwmData.code !== 0 || !tikwmData.data) {
          throw new Error(`tikwm.com API error: ${tikwmData.msg || "Unknown error"}`);
        }

        const data = tikwmData.data;
        const newVideoUrl = data.hdplay || data.play;
        const newThumbnailUrl = data.cover || data.origin_cover;

        // Update database
        const { error: updateError } = await supabase
          .from("tiktok_videos")
          .update({
            video_file_url: newVideoUrl,
            thumbnail_url: newThumbnailUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", video.id);

        if (updateError) {
          throw updateError;
        }

        console.log(`✅ Video ${video.id} refreshed successfully`);
        results.refreshed++;

        // Rate limiting: wait 500ms between requests to avoid overwhelming tikwm.com
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`❌ Failed to refresh video ${video.id}:`, error.message);
        results.errors.push(`${video.id}: ${error.message}`);
      }
    }

    console.log("\n📊 Refresh Summary:");
    console.log(`   Total videos: ${results.total}`);
    console.log(`   Refreshed: ${results.refreshed}`);
    console.log(`   Skipped (fresh): ${results.skipped}`);
    console.log(`   Errors: ${results.errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Refreshed ${results.refreshed}/${videosToRefresh.length} videos`,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error in scheduled refresh:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to refresh videos",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

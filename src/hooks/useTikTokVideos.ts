import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCrud } from '@/hooks/useAdminCrud';
import { useToast } from '@/hooks/use-toast';

export interface TikTokVideoProduct {
  id: string;
  name: string;
  price_per_unit: number;
  image_url: string | null;
  category_id: string;
  is_weighted: boolean;
  unit_of_measure: string | null;
}

export interface TikTokVideo {
  id: string;
  video_id: string;
  video_url: string;
  author_name: string | null;
  author_url: string | null;
  title: string | null;
  thumbnail_url: string | null;
  video_file_url: string | null; // Direct MP4 video URL
  embed_html: string | null;
  duration: number | null;
  view_count: number | null;
  like_count: number | null;
  published_at: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  products?: TikTokVideoProduct[]; // Products featured in this video
}

export const useTikTokVideos = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { insert: adminInsert, update: adminUpdate, remove: adminRemove } = useAdminCrud();

  // Fetch active videos for public display with associated products
  const { data: videos = [], isLoading, error } = useQuery({
    queryKey: ['tiktok-videos'],
    queryFn: async () => {
      console.log('🎥 Fetching TikTok videos with products...');
      // First fetch videos
      const { data: videosData, error: videosError } = await supabase
        .from('tiktok_videos')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(6);

      if (videosError) {
        console.error('❌ Error fetching videos:', videosError);
        throw videosError;
      }
      console.log('✅ Videos fetched:', videosData?.length || 0);

      // Fetch products for each video
      const videosWithProducts = await Promise.all(
        (videosData || []).map(async (video) => {
          console.log(`📦 Fetching products for video ${video.id}...`);
          const { data: productLinks, error: productError } = await supabase
            .from('tiktok_video_products')
            .select(`
              display_order,
              products:product_id (
                id,
                name,
                price_per_unit,
                image_url,
                category_id,
                is_weighted,
                unit_of_measure
              )
            `)
            .eq('tiktok_video_id', video.id)
            .order('display_order', { ascending: true })
            .limit(4);

          if (productError) {
            console.error(`❌ Error fetching products for video ${video.id}:`, productError);
          }
          console.log(`📦 Product links for video ${video.id}:`, productLinks);

          const products: TikTokVideoProduct[] = (productLinks || [])
            .map((link: any) => link.products)
            .filter(Boolean);
          
          console.log(`✅ Mapped products for video ${video.id}:`, products);

          return {
            ...video,
            products,
          };
        })
      );

      console.log('🎥 Final videos with products:', videosWithProducts);
      return videosWithProducts as TikTokVideo[];
    },
    staleTime: 0, // Always refetch to see latest products
    refetchInterval: 60 * 60 * 1000, // Refetch every hour
  });

  // Fetch all videos for admin
  const { data: allVideos = [], isLoading: isLoadingAll } = useQuery({
    queryKey: ['tiktok-videos-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tiktok_videos')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as TikTokVideo[];
    },
    enabled: false, // Only fetch when explicitly called
  });

  // Trigger sync from Edge Function
  const syncVideos = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-tiktok-videos');
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tiktok-videos'] });
      queryClient.invalidateQueries({ queryKey: ['tiktok-videos-all'] });
      toast({
        title: 'Videos synced!',
        description: `${data.videos_added} new, ${data.videos_updated} updated`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Sync failed',
        description: error.message,
      });
    },
  });

  // Add video manually via URL
  const addVideo = useMutation({
    mutationFn: async (videoUrl: string) => {
      // Extract video ID from URL
      const match = videoUrl.match(/\/video\/(\d+)/);
      if (!match) throw new Error('Invalid TikTok URL. Format: https://www.tiktok.com/@username/video/1234567890');
      
      const videoId = match[1];

      let videoData: any = {
        video_id: videoId,
        video_url: videoUrl,
        is_active: true,
      };

      // Step 1: Try to fetch video file URL from tikwm.com API
      try {
        const tikwmResponse = await fetch(
          `https://www.tikwm.com/api/?url=${encodeURIComponent(videoUrl)}&hd=1`
        );
        
        if (tikwmResponse.ok) {
          const tikwmData = await tikwmResponse.json();
          
          if (tikwmData.code === 0 && tikwmData.data) {
            const data = tikwmData.data;
            
            videoData = {
              ...videoData,
              video_file_url: data.hdplay || data.play, // HD or standard quality MP4 URL
              author_name: data.author?.nickname,
              author_url: `https://www.tiktok.com/@${data.author?.unique_id}`,
              title: data.title,
              thumbnail_url: data.cover || data.origin_cover,
              duration: data.duration,
              view_count: data.play_count,
              like_count: data.digg_count,
            };
            
            console.log('✓ Fetched video file URL from tikwm.com');
          } else {
            console.warn('tikwm.com API returned error:', tikwmData.msg);
          }
        }
      } catch (tikwmError) {
        console.warn('Failed to fetch from tikwm.com:', tikwmError);
      }

      // Step 2: Fallback to oEmbed for metadata if tikwm failed
      if (!videoData.title || !videoData.thumbnail_url) {
        try {
          const oEmbedResponse = await fetch(
            `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`
          );
          
          if (oEmbedResponse.ok) {
            const oEmbedData = await oEmbedResponse.json();
            
            videoData = {
              ...videoData,
              author_name: videoData.author_name || oEmbedData.author_name,
              author_url: videoData.author_url || oEmbedData.author_url,
              title: videoData.title || oEmbedData.title,
              thumbnail_url: videoData.thumbnail_url || oEmbedData.thumbnail_url,
              embed_html: oEmbedData.html,
            };
            
            console.log('✓ Fetched metadata from oEmbed');
          }
        } catch (oEmbedError) {
          console.warn('Failed to fetch from oEmbed:', oEmbedError);
        }
      }

      // Ensure we have at least basic data
      if (!videoData.title && !videoData.thumbnail_url) {
        throw new Error('Could not fetch video data. Please check the URL and try again.');
      }

      // Insert into database
      const { data } = await adminInsert('tiktok_videos', videoData);
      return data?.[0] || data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tiktok-videos'] });
      queryClient.invalidateQueries({ queryKey: ['tiktok-videos-all'] });
      toast({
        title: 'Video added!',
        description: data.video_file_url 
          ? '✓ Video will play inline with autoplay' 
          : '⚠️ Video added but will redirect to TikTok (MP4 URL not available)',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to add video',
        description: error.message,
      });
    },
  });

  // Update video
  const updateVideo = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TikTokVideo> }) => {
      const { data } = await adminUpdate('tiktok_videos', updates as Record<string, unknown>, [
        { column: 'id', operator: 'eq', value: id },
      ]);
      return data?.[0] || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiktok-videos'] });
      queryClient.invalidateQueries({ queryKey: ['tiktok-videos-all'] });
    },
  });



  // Delete video
  const deleteVideo = useMutation({
    mutationFn: async (id: string) => {
      await adminRemove('tiktok_videos', [
        { column: 'id', operator: 'eq', value: id },
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiktok-videos'] });
      queryClient.invalidateQueries({ queryKey: ['tiktok-videos-all'] });
      toast({
        title: 'Video deleted',
        description: 'TikTok video has been removed',
      });
    },
  });

  // Fetch sync logs
  const { data: syncLogs = [] } = useQuery({
    queryKey: ['tiktok-sync-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tiktok_sync_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: false,
  });

  // Update video products (link/unlink products to a video)
  const updateVideoProducts = useMutation({
    mutationFn: async ({ videoId, productIds }: { videoId: string; productIds: string[] }) => {
      console.log('updateVideoProducts called:', { videoId, productIds });

      // Delete existing links
      console.log('Deleting existing links for video:', videoId);
      await adminRemove('tiktok_video_products', [
        { column: 'tiktok_video_id', operator: 'eq', value: videoId },
      ]);
      console.log('Existing links deleted');

      // Insert new links with display order
      if (productIds.length > 0) {
        const links = productIds.map((productId, index) => ({
          tiktok_video_id: videoId,
          product_id: productId,
          display_order: index,
        }));
        console.log('Inserting new links:', links);

        await adminInsert('tiktok_video_products', links);
        console.log('New links inserted');
      }

      return { videoId, productIds };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiktok-videos'] });
      queryClient.invalidateQueries({ queryKey: ['tiktok-videos-all'] });
      toast({
        title: 'Products updated',
        description: 'Video products have been updated',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to update products',
        description: error.message,
      });
    },
  });

  return {
    videos,
    isLoading,
    error,
    allVideos,
    isLoadingAll,
    syncVideos,
    addVideo,
    updateVideo,
    deleteVideo,
    updateVideoProducts,
    syncLogs,
  };
};

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useTikTokVideos, TikTokVideo, TikTokVideoProduct } from '@/hooks/useTikTokVideos';
import { supabase } from '@/integrations/supabase/client';
import TikTokVideoProductPicker from '@/components/admin/TikTokVideoProductPicker';

// Extended type for videos with products
type TikTokVideoWithProducts = TikTokVideo & {
  products: TikTokVideoProduct[];
};
import { 
  Video, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Package,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';

const AdminTikTokPage = () => {
  const { toast } = useToast();
  const { allVideos, syncVideos, addVideo, updateVideo, deleteVideo } = useTikTokVideos();
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null);
  
  // Product picker state
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [selectedVideoForProducts, setSelectedVideoForProducts] = useState<{
    id: string;
    title: string | null;
    products: TikTokVideoProduct[];
  } | null>(null);

  // Fetch all videos for admin with their products
  const { data: videos = [], refetch, isLoading } = useQuery({
    queryKey: ['tiktok-videos-all'],
    queryFn: async () => {
      // First fetch videos
      const { data: videosData, error: videosError } = await supabase
        .from('tiktok_videos')
        .select('*')
        .order('display_order', { ascending: true });

      if (videosError) throw videosError;

      // Fetch products for each video
      const videosWithProducts = await Promise.all(
        (videosData || []).map(async (video) => {
          const { data: productLinks } = await supabase
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
            .order('display_order', { ascending: true });

          const products: TikTokVideoProduct[] = (productLinks || [])
            .map((link: { products: TikTokVideoProduct | null }) => link.products)
            .filter((p): p is TikTokVideoProduct => p !== null);

          return {
            ...video,
            products,
          };
        })
      );

      return videosWithProducts;
    },
  });

  const openProductPicker = (video: TikTokVideoWithProducts) => {
    setSelectedVideoForProducts({
      id: video.id,
      title: video.title,
      products: video.products || [],
    });
    setProductPickerOpen(true);
  };

  // Fetch sync logs
  const { data: syncLogs = [] } = useQuery({
    queryKey: ['tiktok-sync-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tiktok_sync_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  const handleSync = async () => {
    try {
      await syncVideos.mutateAsync();
      refetch();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const handleAddVideo = async () => {
    if (!newVideoUrl.trim()) {
      toast({
        variant: 'destructive',
        title: 'Invalid URL',
        description: 'Please enter a valid TikTok video URL',
      });
      return;
    }

    setIsAddingVideo(true);
    try {
      await addVideo.mutateAsync(newVideoUrl);
      setNewVideoUrl('');
      refetch();
    } catch (error) {
      console.error('Failed to add video:', error);
    } finally {
      setIsAddingVideo(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await updateVideo.mutateAsync({
        id,
        updates: { is_active: !currentActive },
      });
      refetch();
      toast({
        title: currentActive ? 'Video hidden' : 'Video shown',
        description: `Video is now ${currentActive ? 'hidden' : 'visible'} on the homepage`,
      });
    } catch (error) {
      console.error('Failed to toggle video:', error);
    }
  };

  const handleMoveUp = async (video: TikTokVideoWithProducts, index: number) => {
    if (index === 0 || !videos.length) return;
    
    const previousVideo = videos[index - 1];
    try {
      // Use index-based ordering (current video moves to previous position)
      await Promise.all([
        updateVideo.mutateAsync({
          id: video.id,
          updates: { display_order: index - 1 },
        }),
        updateVideo.mutateAsync({
          id: previousVideo.id,
          updates: { display_order: index },
        }),
      ]);
      refetch();
      toast({
        title: 'Order updated',
        description: 'Video moved up',
      });
    } catch (error) {
      console.error('Failed to update order:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to update order',
        description: 'Please try again',
      });
    }
  };

  const handleMoveDown = async (video: TikTokVideoWithProducts, index: number) => {
    if (index === videos.length - 1 || !videos.length) return;
    
    const nextVideo = videos[index + 1];
    try {
      // Use index-based ordering (current video moves to next position)
      await Promise.all([
        updateVideo.mutateAsync({
          id: video.id,
          updates: { display_order: index + 1 },
        }),
        updateVideo.mutateAsync({
          id: nextVideo.id,
          updates: { display_order: index },
        }),
      ]);
      refetch();
      toast({
        title: 'Order updated',
        description: 'Video moved down',
      });
    } catch (error) {
      console.error('Failed to update order:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to update order',
        description: 'Please try again',
      });
    }
  };

  const handleDelete = async () => {
    if (!videoToDelete) return;

    try {
      await deleteVideo.mutateAsync(videoToDelete);
      refetch();
      setDeleteDialogOpen(false);
      setVideoToDelete(null);
    } catch (error) {
      console.error('Failed to delete video:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <AdminLayout title="TikTok Videos">
      <div className="space-y-6">
        {/* Add Video Manually */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add TikTok Video
            </CardTitle>
            <CardDescription>
              Paste a TikTok video URL to add it. The system will automatically fetch the MP4 file for inline playback.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="video-url" className="sr-only">
                  TikTok Video URL
                </Label>
                <Input
                  id="video-url"
                  placeholder="https://www.tiktok.com/@spiceandslicedfw/video/1234567890"
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddVideo()}
                />
              </div>
              <Button
                onClick={handleAddVideo}
                disabled={isAddingVideo || !newVideoUrl.trim()}
              >
                {isAddingVideo ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  'Add Video'
                )}
              </Button>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">How to add videos:</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Go to your TikTok profile: <a href="https://www.tiktok.com/@spiceandslicedfw" target="_blank" rel="noopener noreferrer" className="underline">@spiceandslicedfw</a></li>
                <li>Click on a video you want to add</li>
                <li>Copy the URL from your browser (e.g., https://www.tiktok.com/@spiceandslicedfw/video/1234567890)</li>
                <li>Paste it above and click "Add Video"</li>
                <li>The video will automatically play inline on your website!</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Videos List */}
        <Card>
          <CardHeader>
            <CardTitle>All Videos ({videos.length})</CardTitle>
            <CardDescription>
              Manage visibility and order of TikTok videos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading videos...
              </div>
            ) : videos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No videos yet. Sync or add videos manually.
              </div>
            ) : (
              <div className="space-y-3">
                {(videos as TikTokVideoWithProducts[]).map((video, index) => (
                  <div
                    key={video.id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors overflow-hidden"
                  >
                    {/* Thumbnail */}
                    <div className="flex-shrink-0">
                      {video.thumbnail_url ? (
                        <img
                          src={video.thumbnail_url}
                          alt={video.title || 'TikTok video'}
                          className="w-16 h-28 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-16 h-28 bg-gray-200 rounded-lg flex items-center justify-center">
                          <Video className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Video Info */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <h4 className="font-medium text-sm truncate mb-1">
                        {video.title || 'Untitled Video'}
                      </h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        {video.author_name || '@spiceandslicedfw'}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                        {video.video_file_url ? (
                          <Badge className="bg-green-500 text-white text-xs">
                            ✓ Inline Playback
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Links to TikTok
                          </Badge>
                        )}
                        {video.products && video.products.length > 0 ? (
                          <Badge className="bg-pink-500 text-white text-xs">
                            <Package className="h-3 w-3 mr-1" />
                            {video.products.length} product{video.products.length !== 1 ? 's' : ''}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            No products linked
                          </Badge>
                        )}
                        {video.published_at && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(video.published_at), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Priority controls */}
                      <div className="flex flex-col gap-0.5 mr-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleMoveUp(video, index)}
                          disabled={index === 0 || updateVideo.isPending}
                          title="Move up"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleMoveDown(video, index)}
                          disabled={index === videos.length - 1 || updateVideo.isPending}
                          title="Move down"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openProductPicker(video)}
                        className="text-pink-500 border-pink-200 hover:bg-pink-50 hover:border-pink-300"
                      >
                        <Package className="h-4 w-4 mr-1" />
                        Products
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(video.video_url, '_blank')}
                        title="Open in TikTok"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>

                      <div className="flex items-center gap-2 mr-2">
                        <Switch
                          checked={video.is_active}
                          onCheckedChange={() => handleToggleActive(video.id, video.is_active)}
                        />
                        {video.is_active ? (
                          <Eye className="h-4 w-4 text-green-500" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setVideoToDelete(video.id);
                          setDeleteDialogOpen(true);
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the video from your site. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Product Picker Dialog */}
      {selectedVideoForProducts && (
        <TikTokVideoProductPicker
          open={productPickerOpen}
          onOpenChange={(open) => {
            setProductPickerOpen(open);
            if (!open) {
              setSelectedVideoForProducts(null);
              refetch(); // Refresh to show updated products
            }
          }}
          videoId={selectedVideoForProducts.id}
          videoTitle={selectedVideoForProducts.title}
          currentProducts={selectedVideoForProducts.products}
        />
      )}
    </AdminLayout>
  );
};

export default AdminTikTokPage;

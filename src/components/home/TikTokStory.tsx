import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Volume2, VolumeX, ShoppingBag, Loader2, Check } from 'lucide-react';
import { TikTokVideo, TikTokVideoProduct } from '@/hooks/useTikTokVideos';
import { usePostHogTracking } from '@/hooks/usePostHogTracking';
import { useCartStore } from '@/stores/cart';
import { useUser as useClerkUser, useClerk } from '@clerk/clerk-react';
import { useToast } from '@/hooks/use-toast';

interface TikTokStoryProps {
  video: TikTokVideo;
  isInView?: boolean;
  variant?: 'mobile' | 'desktop' | 'featured' | 'thumbnail';
  onClick?: () => void;
  isActive?: boolean;
  products?: TikTokVideoProduct[];
  hasAddedToCart?: boolean;
  onAddedToCart?: (videoId: string) => void;
}

const TikTokStory = ({ video, isInView = false, variant = 'desktop', onClick, isActive = false, products = [], hasAddedToCart = false, onAddedToCart }: TikTokStoryProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const thumbnailRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasTrackedView = useRef(false);
  const { trackEvent, trackProductAddedToCart } = usePostHogTracking();
  const [isMuted, setIsMuted] = useState(true);
  const [isAddingAll, setIsAddingAll] = useState(false);
  
  const { addToCart } = useCartStore();
  const { isSignedIn } = useClerkUser();
  const { openSignIn } = useClerk();
  const { toast } = useToast();

  // Dynamic sizing based on variant
  const containerClasses = 
    variant === 'mobile'
      ? 'w-full max-w-[340px] h-[75vh] max-h-[650px]'
      : variant === 'featured'
      ? 'w-full max-w-3xl aspect-[9/16] max-h-[650px] mx-auto'
      : variant === 'thumbnail'
      ? 'w-full aspect-[9/16] h-[280px]'
      : 'w-[280px] md:w-[320px] h-[520px] md:h-[600px]';

  // Track video view when it comes into view
  useEffect(() => {
    if (isInView && !hasTrackedView.current) {
      trackEvent('tiktok_video_viewed', {
        video_id: video.video_id,
        video_url: video.video_url,
        author: video.author_name || '',
      });
      hasTrackedView.current = true;
    }
  }, [isInView, video, trackEvent]);

  // Play/pause video based on isInView
  useEffect(() => {
    if (!videoRef.current) return;

    if (isInView) {
      videoRef.current.play().catch((error) => {
        console.log('Video autoplay failed:', error);
      });
    } else {
      videoRef.current.pause();
    }
  }, [isInView]);

  const handleVideoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // If onClick handler provided (thumbnail variant), call it
    if (onClick) {
      onClick();
      return;
    }
    
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }

    trackEvent('tiktok_video_clicked', {
      video_id: video.video_id,
      video_url: video.video_url,
    });
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
    
    trackEvent('tiktok_video_clicked', {
      video_id: video.video_id,
      video_url: video.video_url,
    });
  };

  const handleOpenTikTok = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(video.video_url, '_blank');
  };

  const handleAddAllToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Guest checkout (/checkout/guest) handles signed-out carts; no
    // sign-in gate on add-to-cart.

    if (!products || products.length === 0) return;

    setIsAddingAll(true);
    try {
      for (const product of products) {
        await addToCart(product.id, product.is_weighted ? 1 : undefined);
        trackProductAddedToCart({
          id: product.id,
          name: product.name,
          price_per_unit: product.price_per_unit,
          category: product.category_id,
          is_weighted: product.is_weighted,
        }, {
          quantity: product.is_weighted ? undefined : 1,
          weight: product.is_weighted ? 1 : undefined,
          fromPage: 'tiktok_mobile',
        });
      }
      toast({
        title: `${products.length} item${products.length > 1 ? 's' : ''} added`,
        description: 'Added all products from this video to your cart',
      });
      onAddedToCart?.(video.id);
    } catch (error) {
      console.error('Failed to add products to cart:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to add items',
        description: 'Please try again',
      });
    } finally {
      setIsAddingAll(false);
    }
  };

  // Thumbnail variant: Show static preview with play button
  if (variant === 'thumbnail') {
    return (
      <motion.button
        ref={thumbnailRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        onClick={handleVideoClick}
        className={`relative flex-shrink-0 ${containerClasses} rounded-2xl overflow-hidden bg-black shadow-lg group cursor-pointer hover:scale-105 hover:shadow-xl transition-all`}
        aria-label={`Play ${video.title || 'video'}`}
      >
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title || 'TikTok video'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900" />
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
        
        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors"
          >
            <Play className="h-8 w-8 text-white fill-white" />
          </motion.div>
        </div>

        {/* Video info */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white text-xs font-medium line-clamp-2">
            {video.title}
          </p>
        </div>

        {/* Active indicator */}
        {isActive && (
          <div className="absolute top-2 left-2 bg-gray-900 rounded px-2 py-0.5 text-white text-[10px] font-medium">
            Playing
          </div>
        )}
      </motion.button>
    );
  }

  // If we have direct video file URL, use native video player
  if (video.video_file_url) {
    return (
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className={`relative flex-shrink-0 ${containerClasses} rounded-2xl overflow-hidden bg-black shadow-xl group`}
      >
        {/* Native HTML5 Video Player */}
        <video
          ref={videoRef}
          src={video.video_file_url}
          poster={video.thumbnail_url || undefined}
          className="w-full h-full object-cover cursor-pointer"
          muted={isMuted}
          autoPlay
          loop
          playsInline
          preload="auto"
          onClick={handleVideoClick}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

        {/* Video info */}
        <div className={`absolute bottom-0 left-0 right-0 p-4 pointer-events-none ${variant === 'mobile' && products.length > 0 ? 'pb-16' : ''}`}>
          <p className="text-white text-sm font-medium mb-1 line-clamp-2">
            {video.title}
          </p>
          <p className="text-white/80 text-xs">
            {video.author_name || '@spiceandslicedfw'}
          </p>
        </div>

        {/* Add All to Cart button - Mobile only */}
        {variant === 'mobile' && products.length > 0 && (
          <button
            onClick={handleAddAllToCart}
            disabled={isAddingAll || hasAddedToCart}
            className={`absolute bottom-3 left-3 right-3 py-2.5 px-4 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-colors z-10 ${
              hasAddedToCart 
                ? 'bg-green-600 text-white cursor-default' 
                : 'bg-food-red hover:bg-food-red/90 disabled:bg-food-red/50 text-white'
            }`}
          >
            {isAddingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : hasAddedToCart ? (
              <>
                <Check className="h-4 w-4" />
                Added to Cart
              </>
            ) : (
              <>
                <ShoppingBag className="h-4 w-4" />
                Add {products.length} Item{products.length > 1 ? 's' : ''} to Cart
              </>
            )}
          </button>
        )}

        {/* Mute/Unmute button */}
        <button
          onClick={handleToggleMute}
          className={`absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-full ${
            variant === 'featured' ? 'p-3' : 'p-2.5'
          } text-white hover:bg-black/70 transition-colors cursor-pointer z-10 group`}
          aria-label={isMuted ? 'Unmute video' : 'Mute video'}
        >
          {isMuted ? (
            <VolumeX className={variant === 'featured' ? 'h-6 w-6' : 'h-5 w-5'} />
          ) : (
            <Volume2 className={variant === 'featured' ? 'h-6 w-6' : 'h-5 w-5'} />
          )}
        </button>

        {/* TikTok logo badge - clickable to open TikTok */}
        <button
          onClick={handleOpenTikTok}
          className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-black/70 transition-colors cursor-pointer z-10"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
          </svg>
          View on TikTok
        </button>
      </motion.div>
    );
  }

  // Fallback: Show thumbnail with play button if no video file URL
  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`relative flex-shrink-0 ${containerClasses} rounded-2xl overflow-hidden bg-black shadow-xl group cursor-pointer`}
      onClick={handleOpenTikTok}
    >
      {video.thumbnail_url ? (
        <img
          src={video.thumbnail_url}
          alt={video.title || 'TikTok video'}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900" />
      )}
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
      
      {/* Play button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
          <Play className="h-8 w-8 text-white fill-white" />
        </motion.div>
      </div>

      {/* Video info */}
      <div className={`absolute bottom-0 left-0 right-0 p-4 ${variant === 'mobile' && products.length > 0 ? 'pb-16' : ''}`}>
        <p className="text-white text-sm font-medium mb-1 line-clamp-2">
          {video.title}
        </p>
        <p className="text-white/80 text-xs">
          {video.author_name || '@spiceandslicedfw'}
        </p>
      </div>

      {/* Add All to Cart button - Mobile only */}
      {variant === 'mobile' && products.length > 0 && (
        <button
          onClick={handleAddAllToCart}
          disabled={isAddingAll || hasAddedToCart}
          className={`absolute bottom-3 left-3 right-3 py-2.5 px-4 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-colors z-10 ${
            hasAddedToCart 
              ? 'bg-green-600 text-white cursor-default' 
              : 'bg-food-red hover:bg-food-red/90 disabled:bg-food-red/50 text-white'
          }`}
        >
          {isAddingAll ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : hasAddedToCart ? (
            <>
              <Check className="h-4 w-4" />
              Added to Cart
            </>
          ) : (
            <>
              <ShoppingBag className="h-4 w-4" />
              Add {products.length} Item{products.length > 1 ? 's' : ''} to Cart
            </>
          )}
        </button>
      )}

      {/* TikTok logo badge */}
      <div className="absolute top-4 right-4">
        <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 text-white text-xs font-semibold flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
          </svg>
          TikTok
        </div>
      </div>
    </motion.div>
  );
};

export default TikTokStory;

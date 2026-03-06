import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight, ExternalLink, ShoppingBag } from 'lucide-react';
import { useTikTokVideos } from '@/hooks/useTikTokVideos';
import TikTokStory from './TikTokStory';
import TikTokProductShowcase from './TikTokProductShowcase';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePostHogTracking } from '@/hooks/usePostHogTracking';

const TikTokSection = () => {
  const { videos, isLoading } = useTikTokVideos();
  const isMobile = useIsMobile();
  const { trackEvent } = usePostHogTracking();
  
  // Unified carousel state for both mobile and desktop
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [direction, setDirection] = useState(0); // -1 for left, 1 for right
  const [addedVideoIds, setAddedVideoIds] = useState<Set<string>>(new Set());
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const activeProducts = videos?.[activeIndex]?.products || [];

  // Callback when a video's items are added to cart
  const handleVideoAddedToCart = useCallback((videoId: string) => {
    setAddedVideoIds(prev => new Set(prev).add(videoId));
  }, []);

  // Navigate to next/previous video
  const goToVideo = useCallback((index: number) => {
    if (!videos || index < 0 || index >= videos.length) return;
    
    setDirection(index > activeIndex ? 1 : -1);
    trackEvent('tiktok_video_swiped', {
      direction: index > activeIndex ? 'right' : 'left',
      from_index: activeIndex,
      to_index: index,
      video_id: videos[index]?.video_id || '',
    });
    setActiveIndex(index);
  }, [videos, activeIndex, trackEvent]);

  const goToPrevious = useCallback(() => {
    if (!videos) return;
    const newIndex = activeIndex > 0 ? activeIndex - 1 : videos.length - 1;
    goToVideo(newIndex);
  }, [videos, activeIndex, goToVideo]);

  const goToNext = useCallback(() => {
    if (!videos) return;
    const newIndex = activeIndex < videos.length - 1 ? activeIndex + 1 : 0;
    goToVideo(newIndex);
  }, [videos, activeIndex, goToVideo]);

  // Keyboard navigation
  useEffect(() => {
    if (!videos || videos.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [videos, activeIndex, goToNext, goToPrevious]);

  // Mobile swipe handlers
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    const threshold = 50; // minimum swipe distance
    const velocity = info.velocity.x;
    const offset = info.offset.x;
    
    // Determine swipe direction based on offset and velocity
    if (offset < -threshold || velocity < -500) {
      // Swipe left - go to next video
      goToNext();
    } else if (offset > threshold || velocity > 500) {
      // Swipe right - go to previous video
      goToPrevious();
    }
  };

  if (isLoading) {
    return (
      <div>
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="flex gap-4 overflow-hidden">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[280px] h-[500px] bg-gray-200 rounded-2xl"></div>
              ))}
            </div>
          </div>
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return null;
  }

  return (
    <div>
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Fresh from Our Kitchen
          </h2>
          <p className="text-muted-foreground">
            Follow us on TikTok{' '}
            <a 
              href="https://www.tiktok.com/@spiceandslicedfw" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-food-red hover:underline"
            >
              @spiceandslicedfw
            </a>
          </p>
        </div>

        {isMobile ? (
          /* MOBILE: Centered video with swipe + arrows */
          <>
            {/* Video container with navigation */}
            <div 
              className="relative max-w-sm mx-auto"
              role="region"
              aria-label="TikTok videos from our kitchen"
            >
              {/* Simple video container */}
              <div className="relative overflow-hidden rounded-xl shadow-md mx-auto max-w-[360px]">
                {/* Left arrow - overlapping video */}
                <button
                  onClick={goToPrevious}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/90 hover:bg-black/60 active:scale-95 transition-all"
                  aria-label="Previous video"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                {/* Right arrow - overlapping video */}
                <button
                  onClick={goToNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/90 hover:bg-black/60 active:scale-95 transition-all"
                  aria-label="Next video"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                <motion.div
                  className="touch-pan-y"
                  style={{ touchAction: 'pan-y' }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={activeIndex}
                      initial={{ opacity: 0, x: direction >= 0 ? 100 : -100 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: direction >= 0 ? -100 : 100 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.2}
                      onDragStart={() => setIsDragging(true)}
                      onDragEnd={handleDragEnd}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <TikTokStory
                        video={videos[activeIndex]}
                        isInView={true}
                        variant="mobile"
                      />
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              </div>
            </div>

            {/* Swipe hint - shows briefly then fades */}
            <p className="text-center text-xs text-muted-foreground mt-3 animate-pulse">
              Swipe or tap arrows to browse
            </p>

            {/* Dot indicators */}
            <div className="flex justify-center gap-1.5 mt-5">
              {videos.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToVideo(index)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === activeIndex 
                      ? 'w-6 bg-food-red' 
                      : 'w-1.5 bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Go to video ${index + 1}`}
                />
              ))}
            </div>

            {/* Shop Featured Items button */}
            {activeProducts.length > 0 && (
              <div className="flex justify-center mt-4">
                <Button
                  onClick={() => setIsSheetOpen(true)}
                  className="bg-food-red hover:bg-food-red/90 text-white font-semibold"
                >
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Shop Featured Items ({activeProducts.length})
                </Button>
              </div>
            )}

            {/* See more link */}
            <div className="flex justify-center mt-4">
              <a
                href="https://www.tiktok.com/@spiceandslicedfw"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-food-red hover:text-food-red/80 transition-colors"
              >
                See All Videos
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </>
        ) : (
          /* DESKTOP: Centered video with navigation */
          <div
            className="flex flex-col items-center"
            role="region"
            aria-label="TikTok videos from our kitchen"
          >
            {/* Container with arrows flanking the video */}
            <div className="relative flex items-center gap-3">
              {/* Left arrow */}
              {videos.length > 1 && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToPrevious}
                  className="flex-shrink-0 rounded-full border bg-white hover:bg-gray-50 transition-colors h-10 w-10"
                  aria-label="Previous video"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}

              {/* Video container */}
              <div className="relative">
                <div className="relative overflow-hidden rounded-xl shadow-md w-[340px]">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={activeIndex}
                      initial={{ opacity: 0, x: direction >= 0 ? 100 : -100 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: direction >= 0 ? -100 : 100 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <TikTokStory
                        video={videos[activeIndex]}
                        isInView={true}
                        variant="desktop"
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Dot indicators below video */}
                <div className="flex justify-center gap-1.5 mt-3">
                  {videos.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToVideo(index)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        index === activeIndex
                          ? 'w-6 bg-food-red'
                          : 'w-1.5 bg-gray-300 hover:bg-gray-400'
                      }`}
                      aria-label={`Go to video ${index + 1}`}
                    />
                  ))}
                </div>
              </div>

              {/* Right arrow */}
              {videos.length > 1 && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToNext}
                  className="flex-shrink-0 rounded-full border bg-white hover:bg-gray-50 transition-colors h-10 w-10"
                  aria-label="Next video"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              )}
            </div>

            {/* Shop Featured Items button */}
            {activeProducts.length > 0 && (
              <Button
                onClick={() => setIsSheetOpen(true)}
                className="mt-4 bg-food-red hover:bg-food-red/90 text-white font-semibold"
              >
                <ShoppingBag className="h-4 w-4 mr-2" />
                Shop Featured Items ({activeProducts.length})
              </Button>
            )}
          </div>
        )}

        {/* Screen reader announcement */}
        <div aria-live="polite" className="sr-only">
          {videos[activeIndex] && `Now playing: ${videos[activeIndex].title || 'TikTok video'}, video ${activeIndex + 1} of ${videos.length}`}
        </div>

        {/* Featured Products Sheet */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader className="mb-4">
              <SheetTitle>Featured in this Video</SheetTitle>
            </SheetHeader>
            <TikTokProductShowcase
              products={activeProducts}
              videoTitle={videos[activeIndex]?.title}
            />
          </SheetContent>
        </Sheet>
    </div>
  );
};

export default TikTokSection;

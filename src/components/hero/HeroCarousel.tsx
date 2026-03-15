
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import HeroSlide, { Slide } from './HeroSlide';
import HeroNavigation from './HeroNavigation';
import HeroIndicators from './HeroIndicators';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { type CarouselApi } from '@/components/ui/carousel';

interface HeroCarouselProps {
  slides: Slide[];
}

const HeroCarousel: React.FC<HeroCarouselProps> = ({ slides }) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());

    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };

    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  // Auto-rotate slides
  useEffect(() => {
    if (!api) return;

    intervalRef.current = window.setInterval(() => {
      if (api.canScrollNext()) {
        api.scrollNext();
      } else {
        api.scrollTo(0);
      }
    }, 8000);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [api]);

  const nextSlide = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    api?.scrollNext();
  }, [api]);

  const prevSlide = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    api?.scrollPrev();
  }, [api]);

  const goToSlide = useCallback((index: number) => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    api?.scrollTo(index);
  }, [api]);

  return (
    <div className="relative bg-black text-white overflow-hidden">
      {/* Preload images */}
      {slides.map((slide, index) => (
        <link 
          key={`preload-${index}`} 
          rel="preload" 
          href={slide.bgUrl} 
          as="image" 
        />
      ))}
      
      <Carousel 
        setApi={setApi}
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
      >
        <AnimatePresence mode="wait">
          <CarouselContent>
            {slides.map((slide, index) => (
              <CarouselItem key={index} className="p-0">
                <HeroSlide slide={slide} />
              </CarouselItem>
            ))}
          </CarouselContent>
        </AnimatePresence>
      </Carousel>
      
      {/* Navigation arrows — hidden when only 1 slide */}
      {slides.length > 1 && (
        <HeroNavigation 
          onPrevSlide={prevSlide} 
          onNextSlide={nextSlide} 
        />
      )}
      
      {/* Dot indicators — hidden when only 1 slide */}
      {slides.length > 1 && (
        <HeroIndicators 
          totalSlides={slides.length} 
          currentSlide={current} 
          onSlideChange={goToSlide} 
        />
      )}
    </div>
  );
};

export default HeroCarousel;

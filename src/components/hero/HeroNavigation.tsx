
import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface HeroNavigationProps {
  onPrevSlide: () => void;
  onNextSlide: () => void;
}

const HeroNavigation: React.FC<HeroNavigationProps> = ({ 
  onPrevSlide, 
  onNextSlide 
}) => {
  return (
    <>
      {/* Left arrow — min 44×44px touch target */}
      <button 
        onClick={onPrevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label="Previous slide"
      >
        <ArrowLeft className="h-6 w-6" />
      </button>
      
      {/* Right arrow — min 44×44px touch target */}
      <button 
        onClick={onNextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label="Next slide"
      >
        <ArrowRight className="h-6 w-6" />
      </button>
    </>
  );
};

export default HeroNavigation;

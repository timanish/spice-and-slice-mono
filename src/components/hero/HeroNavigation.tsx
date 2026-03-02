
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
      {/* Left arrow */}
      <button 
        onClick={onPrevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors focus:outline-none"
        aria-label="Previous slide"
      >
        <ArrowLeft className="h-6 w-6" />
      </button>
      
      {/* Right arrow */}
      <button 
        onClick={onNextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors focus:outline-none"
        aria-label="Next slide"
      >
        <ArrowRight className="h-6 w-6" />
      </button>
    </>
  );
};

export default HeroNavigation;

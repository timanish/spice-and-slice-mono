
import React from 'react';

interface HeroIndicatorsProps {
  totalSlides: number;
  currentSlide: number;
  onSlideChange: (index: number) => void;
}

const HeroIndicators: React.FC<HeroIndicatorsProps> = ({ 
  totalSlides, 
  currentSlide, 
  onSlideChange 
}) => {
  return (
    <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-2">
      {Array.from({ length: totalSlides }).map((_, index) => (
        <button
          key={index}
          onClick={() => onSlideChange(index)}
          className={`w-3 h-3 rounded-full transition-colors ${
            currentSlide === index ? 'bg-white' : 'bg-white/40 hover:bg-white/60'
          }`}
          aria-label={`Go to slide ${index + 1}`}
        />
      ))}
    </div>
  );
};

export default HeroIndicators;

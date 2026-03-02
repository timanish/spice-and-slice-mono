
import React from 'react';
import HeroCarousel from './HeroCarousel';
import { useHeroCarousel } from './useHeroCarousel';

const Hero = () => {
  const { getHeroSlides } = useHeroCarousel();
  const slides = getHeroSlides();

  return <HeroCarousel slides={slides} />;
};

export default React.memo(Hero);

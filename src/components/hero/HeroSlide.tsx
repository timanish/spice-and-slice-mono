
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  containerVariants,
  titleVariants,
  descriptionVariants,
  buttonVariants,
  indicatorVariants,
  floatingOrbVariants,
} from './animations';

export interface SlideButton {
  key: string;
  component: React.ReactElement;
  onClick?: () => void;
  label?: string;
}

export interface Slide {
  bg: string;
  bgUrl: string;
  title: React.ReactNode;
  description: string;
  subDescription: string;
  buttons: SlideButton[];
}

interface HeroSlideProps {
  slide: Slide;
}

const HeroSlide: React.FC<HeroSlideProps> = ({ slide }) => {
  const navigate = useNavigate();
  
  return (
    <div 
      className="relative w-full h-[450px] md:h-[465px] overflow-hidden"
      style={{ width: '100%' }}
    >
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: slide.bg }}
        aria-hidden="true"
      >
        {/* Hidden image to detect loading */}
        <img 
          src={slide.bgUrl} 
          alt="" 
          className="hidden" 
        />
        
        {/* Gradient Overlays for better text readability (WCAG AA compliant) */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/20"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40"></div>
      </div>

      {/* Decorative Elements */}
      <motion.div 
        className="absolute top-0 right-0 w-96 h-96 bg-food-red/20 rounded-full blur-3xl"
        variants={floatingOrbVariants}
        animate="animate"
      />
      <motion.div 
        className="absolute bottom-0 left-1/4 w-96 h-96 bg-food-orange/20 rounded-full blur-3xl"
        variants={floatingOrbVariants}
        animate="animate"
        style={{ animationDelay: '1s' }}
      />

      {/* Content */}
      <div className="container relative z-10 h-full flex items-center">
        <motion.div 
          className="flex flex-col max-w-3xl space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          key={`hero-content-${slide.bgUrl}`}
        >
          {/* Title */}
          <motion.h1 
            className="text-5xl md:text-7xl font-serif font-bold text-white"
            variants={titleVariants}
            style={{ lineHeight: '1.15', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
          >
            {slide.title}
          </motion.h1>

          {/* Description */}
          <motion.div 
            className="space-y-3"
            variants={descriptionVariants}
          >
            <p className="text-xl md:text-2xl text-gray-100 leading-relaxed drop-shadow-lg">
              {slide.description}
            </p>
            {slide.subDescription && (
              <p className="text-base md:text-lg text-gray-200 leading-relaxed max-w-2xl drop-shadow-md">
                {slide.subDescription}
              </p>
            )}
          </motion.div>

          {/* Buttons */}
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 pt-4"
            variants={buttonVariants}
          >
            <motion.div
              whileHover="hover"
              whileTap="tap"
              variants={buttonVariants}
            >
              <Button
                size="lg"
                onClick={() => navigate('/products')}
                className="bg-gradient-to-r from-food-red to-food-orange hover:from-food-red/90 hover:to-food-orange/90 text-white shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 text-lg px-12 py-7 w-full sm:w-auto min-w-[240px] group"
              >
                Shop Now
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
          </motion.div>
          {/* <div className="flex flex-col sm:flex-row gap-4 pt-4">
            {slide.buttons.map((button) => {
              // Clone the button component with enhanced styling
              const enhancedButton = React.cloneElement(button.component, {
                key: button.key,
                onClick: button.onClick,
                className: `${button.component.props.className || ''} 
                  shadow-xl hover:shadow-2xl transform hover:scale-105 
                  transition-all duration-300 text-lg px-8 py-6
                  cursor-pointer`.trim()
              });
              
              return enhancedButton;
            })}
            
            {slide.buttons.length > 0 && (
              <Button 
                size="lg"
                variant="outline"
                className="bg-white/10 backdrop-blur-md border-2 border-white/30 
                  hover:bg-white/20 text-white shadow-xl hover:shadow-2xl 
                  transform hover:scale-105 transition-all duration-300 
                  text-lg px-8 py-6"
              >
                Learn More
              </Button>
            )}
          </div> -->

          {/* Trust Indicators */}
          <motion.div 
            className="flex flex-wrap items-center gap-8 pt-4 text-white/90"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div 
              className="flex items-center gap-2"
              variants={indicatorVariants}
            >
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Fresh Daily</span>
            </motion.div>
            <motion.div 
              className="flex items-center gap-2"
              variants={indicatorVariants}
            >
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Authentic Recipes</span>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom Wave/Curve Effect */}
      <div className="absolute bottom-0 left-0 right-0 h-24">
        <svg 
          className="w-full h-full" 
          viewBox="0 0 1440 120" 
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,58.7C960,64,1056,64,1152,58.7C1248,53,1344,43,1392,37.3L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z" 
            fill="white"
            fillOpacity="1"
          />
        </svg>
      </div>
    </div>
  );
};

export default HeroSlide;

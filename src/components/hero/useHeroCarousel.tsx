
import { useCallback, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Slide } from './HeroSlide';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface HeroSlideData {
  id: string;
  title: string;
  description: string;
  sub_description: string | null;
  image_url: string;
  button_text: string | null;
  button_link: string | null;
  is_active: boolean;
  display_order: number;
}

export const useHeroCarousel = () => {
  const { toast } = useToast();
  
  const scrollToProducts = useCallback(() => {
    const productSection = document.getElementById('products-section');
    
    if (productSection) {
      productSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      setTimeout(() => {
        window.scrollBy({ top: -80, behavior: 'smooth' });
      }, 500);
      
      toast({
        title: "Navigation",
        description: "Browsing our products...",
        duration: 1500
      });
    } else {
      window.scrollTo({ 
        top: window.innerHeight,
        behavior: 'smooth'
      });
      
      toast({
        title: "Navigation",
        description: "Scroll down to browse our products",
      });
    }
  }, [toast]);

  const { data: slidesData, isLoading, error } = useQuery({
    queryKey: ['hero-slides'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hero_slides')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as HeroSlideData[];
    }
  });

  const handleButtonClick = useCallback((buttonLink: string | null) => {
    if (!buttonLink) return;
    
    if (buttonLink.startsWith('#')) {
      if (buttonLink === '#products-section') {
        scrollToProducts();
      } else {
        const element = document.querySelector(buttonLink);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    } else if (buttonLink.startsWith('/')) {
      window.location.href = buttonLink;
    } else if (buttonLink.startsWith('http')) {
      window.open(buttonLink, '_blank');
    }
  }, [scrollToProducts]);

  const getHeroSlides = (): Slide[] => {
    if (isLoading || error || !slidesData?.length) {
      return [
        {
          bg: `url('https://images.unsplash.com/photo-1589647363585-f4a7d3877b10?q=80&w=1974&auto=format&fit=crop')`,
          bgUrl: "https://images.unsplash.com/photo-1589647363585-f4a7d3877b10?q=80&w=1974&auto=format&fit=crop",
          title: (
            <div className="flex items-center gap-2">
              <img 
                src="/logo.png" 
                alt="Company Logo" 
                className="h-16 md:h-20 w-auto"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                  if (nextElement) nextElement.style.display = 'block';
                }}
              />
              <div style={{ display: 'none' }} className="flex items-center gap-0.5">
                <span>Spice&Slice Bazaar</span>
              </div>
            </div>
          ) as ReactNode,
          description: "Authentic Indo-Nepali cuisine with the perfect blend of traditional flavors and modern creativity.",
          subDescription: "Experience our carefully crafted dishes with aromatic spices and fresh ingredients that will transport your taste buds to the Himalayas.",
          buttons: [
            {
              key: "shop",
              component: (
                <Button 
                  size="lg" 
                  className="bg-food-red hover:bg-food-red/90 cursor-pointer"
                >
                  Shop Now
                </Button>
              ),
              onClick: scrollToProducts,
            }
          ]
        }
      ];
    }

    return slidesData.map((slide) => ({
      bg: `url('${slide.image_url}')`,
      bgUrl: slide.image_url,
      title: slide.title as ReactNode,
      description: slide.description,
      subDescription: slide.sub_description || '',
      buttons: slide.button_text ? [
        {
          key: "action",
          component: (
            <Button 
              size="lg" 
              className="bg-food-red hover:bg-food-red/90 cursor-pointer"
            >
              {slide.button_text}
            </Button>
          ),
          onClick: () => handleButtonClick(slide.button_link),
        }
      ] : []
    }));
  };

  return {
    getHeroSlides,
    scrollToProducts,
    isLoading,
    error
  };
};

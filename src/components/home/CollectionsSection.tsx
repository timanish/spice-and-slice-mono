import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ChevronRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { usePostHogTracking } from "@/hooks/usePostHogTracking";

interface Collection {
  id: string;
  name: string;
  description: string | null;
  image_url: string;
  category_id: string | null;
  category?: { id: string; name: string } | null;
  display_order: number;
}

const CollectionsSection = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { trackEvent } = usePostHogTracking();
  const [isHovering, setIsHovering] = useState(false);
  const autoScrollIntervalRef = useRef<NodeJS.Timeout>();

  const { data: collections, isLoading } = useQuery({
    queryKey: ["collections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*, category:categories(id, name, products:products!category_id(count))")
        .eq("is_active", true)
        .eq("category.is_active", true)
        .eq("category.products.is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      
      const collectionsWithActiveProducts = (data as Collection[])?.filter((collection) => {
        if (!collection.category) return true;
        const productCount = (collection.category as any).products?.[0]?.count || 0;
        return productCount > 0;
      });
      
      return collectionsWithActiveProducts;
    },
  });

  // Auto-scroll functionality
  useEffect(() => {
    if (!scrollContainerRef.current || !collections || collections.length === 0) {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
      return;
    }

    const container = scrollContainerRef.current;
    const isMobile = window.innerWidth < 1024; // lg breakpoint
    const hasOverflow = container.scrollWidth > container.clientWidth;

    // On desktop: only auto-scroll if content overflows, on mobile: always scroll
    const shouldAutoScroll = isMobile || hasOverflow;

    if (isHovering || !shouldAutoScroll) {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
      return;
    }

    autoScrollIntervalRef.current = setInterval(() => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const isMobile = window.innerWidth < 768;
        
        const cardWidth = isMobile ? 256 : 320; // w-64 (256px) or w-80 (320px)
        const gap = isMobile ? 16 : 24; // gap-4 (16px) or gap-6 (24px)
        const scrollAmount = cardWidth + gap;
        
        const maxScroll = container.scrollWidth - container.clientWidth;

        if (container.scrollLeft >= maxScroll - 10) {
          container.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
      }
    }, 2000);

    return () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
    };
  }, [isHovering, collections]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 250;
      const newPosition = direction === 'left' 
        ? scrollContainerRef.current.scrollLeft - scrollAmount
        : scrollContainerRef.current.scrollLeft + scrollAmount;
      
      scrollContainerRef.current.scrollTo({
        left: newPosition,
        behavior: 'smooth'
      });
    }
  };

  if (isLoading) {
    return (
      <section className="py-16 bg-white">
        <div className="container">
          <div className="animate-pulse space-y-8">
            <div className="h-10 bg-gray-200 rounded w-64"></div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!collections || collections.length === 0) return null;

  return (
    <section className="py-16 bg-white relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-food-orange/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-food-red/5 rounded-full blur-3xl"></div>

      <div className="container relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="h-7 w-7 text-food-orange" />
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-food-brown to-food-red bg-clip-text text-transparent">
                Shop by Collection
              </h2>
            </div>
            <p className="text-muted-foreground text-base">
              Explore our curated categories of authentic products
            </p>
          </div>
          
          {/* Desktop Navigation Arrows */}
          <div className="hidden lg:flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll('left')}
              className="rounded-full border-2 hover:border-food-red hover:text-food-red transition-colors"
            >
              <ChevronRight className="h-5 w-5 rotate-180" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll('right')}
              className="rounded-full border-2 hover:border-food-red hover:text-food-red transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Collections Horizontal Scroll - Both Mobile & Desktop */}
        <div className="relative">
          <div 
            ref={scrollContainerRef}
            className="flex overflow-x-auto gap-4 md:gap-6 pb-4 snap-x snap-mandatory scrollbar-hide scroll-smooth"
            style={{ scrollBehavior: 'smooth', scrollSnapType: 'x mandatory' }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            {collections.map((collection, index) => (
              <Link
                key={collection.id}
                to={`/products?category=${encodeURIComponent(collection.category?.name || '')}`}
                className="snap-start flex-shrink-0 group"
                onClick={() => {
                  trackEvent('collection_clicked', {
                    collection_id: collection.id,
                    collection_name: collection.name,
                  });
                }}
              >
                <div className="relative w-64 md:w-80 h-64 md:h-72 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:border-food-red/30 bg-gradient-to-br from-gray-50 to-white">
                  {/* Background Image */}
                  <div className="absolute inset-0">
                    <img
                      src={collection.image_url}
                      alt={collection.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                  </div>

                  {/* Content */}
                  <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-6">
                    <h3 className="text-white font-bold text-lg md:text-xl mb-1 group-hover:text-yellow-400 transition-colors">
                      {collection.name}
                    </h3>
                    {collection.description && (
                      <p className="text-white/90 text-xs md:text-sm line-clamp-2 mb-3">
                        {collection.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-white/90 group-hover:text-yellow-400 transition-colors">
                      <span className="text-sm font-medium">Explore</span>
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Scroll Indicators */}
          <div className="flex justify-center gap-2 mt-6">
            {collections.slice(0, Math.min(collections.length, 6)).map((_, index) => (
              <div
                key={index}
                className="h-1.5 w-8 bg-gray-200 rounded-full"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CollectionsSection;

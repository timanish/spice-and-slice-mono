import { memo } from 'react';
import Navigation from '@/components/Navigation';
import Hero from '@/components/hero';
import Footer from '@/components/Footer';
import CollectionsSection from '@/components/home/CollectionsSection';
import FeaturedProductsSection from '@/components/home/FeaturedProductsSection';
import FestivalSection from '@/components/home/FestivalSection';
import FlashDealsSection from '@/components/home/FlashDealsSection';
import TestimonialsSection from '@/components/home/TestimonialsSection';
import RecipeInspirationSection from '@/components/home/RecipeInspirationSection';
import GlobalProductSearch from '@/components/home/GlobalProductSearch';
import TikTokSection from '@/components/home/TikTokSection';
import ShopCombosSection from '@/components/home/ShopCombosSection';
import LeaveReviewButton from '@/components/home/LeaveReviewButton';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';

// Memoize the Index component to prevent unnecessary re-renders
const Index = memo(() => {
  // Check profile completion and redirect if needed
  useProfileCompletion();

  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      <main>
        <Hero />
        <section className="py-8 md:py-12">
          <div className="container">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
              <div className="lg:col-span-3">
                <ShopCombosSection />
              </div>
              <div className="lg:col-span-2">
                <TikTokSection />
              </div>
            </div>
          </div>
        </section>
        <GlobalProductSearch />
        <CollectionsSection />
        <FeaturedProductsSection />
        <FlashDealsSection />
        <FestivalSection />
        <RecipeInspirationSection />

        {/* Leave Review Button Section */}
        <div className="py-6 bg-gray-50 flex justify-center">
          <LeaveReviewButton />
        </div>

        <TestimonialsSection />
      </main>
      <Footer />
    </div>
  );
});

// Add displayName for better debugging
Index.displayName = 'Index';

export default Index;

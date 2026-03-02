import { memo, useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import ProductListingSection from '@/components/products/ProductListingSection';
import { ProductFiltersType } from '@/components/product-filters';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { Button } from '@/components/ui/button';
import { SlidersHorizontal } from 'lucide-react';

const ProductsPage = memo(() => {
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const searchParam = searchParams.get('search');
  
  // Check profile completion
  useProfileCompletion();
  
  // Initialize filters with category and search from URL if present - use function form to ensure correct initial value
  const [filters, setFilters] = useState<ProductFiltersType>(() => ({
    searchTerm: searchParam || '',
    categories: categoryParam ? [categoryParam] : [],
    brands: [],
    priceRange: [0, 1000],
    priceRangeModified: false
  }));

  // Update filters when URL parameters change
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      searchTerm: searchParam || '',
      categories: categoryParam ? [categoryParam] : [],
      brands: categoryParam ? prev.brands : [], // Keep brands when only search changes
      priceRangeModified: categoryParam ? false : prev.priceRangeModified // Keep price filter when only search changes
    }));
  }, [categoryParam, searchParam]);

  const handleFilterChange = useCallback((newFilters: ProductFiltersType) => {
    setFilters(newFilters);
  }, []);

  const toggleFilters = useCallback(() => {
    window.dispatchEvent(new CustomEvent('toggleProductFilters', { detail: { open: true } }));
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      <main className="flex-1">
        {/* Filter button - floating on mobile */}
        <div className="md:hidden fixed bottom-6 right-4 z-40">
          <Button
            size="lg"
            onClick={toggleFilters}
            className="rounded-full shadow-lg flex items-center gap-2 bg-food-red hover:bg-food-red/90 text-white"
          >
            <SlidersHorizontal className="h-5 w-5" />
            Filters
          </Button>
        </div>
        
        {/* Product Listing */}
        <ProductListingSection 
          filters={filters}
          onFilterChange={handleFilterChange}
        />
      </main>
      <Footer />
    </div>
  );
});

ProductsPage.displayName = 'ProductsPage';

export default ProductsPage;

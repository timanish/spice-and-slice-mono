
import { useState, useCallback, memo, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import ProductFilters, { ProductFiltersType } from '@/components/product-filters';
import ProductList from '@/components/products/ProductList';
import { useProductQuery, useProductMetadata } from '@/hooks/products';
import SearchBar from '@/components/products/SearchBar';
import StickyFilterRow, { SortOption } from '@/components/products/StickyFilterRow';
import { usePostHogTracking } from '@/hooks/usePostHogTracking';

interface ProductListingSectionProps {
  showMobileFilters?: boolean;
  filters?: ProductFiltersType;
  onFilterChange?: (filters: ProductFiltersType) => void;
}

const ProductListingSection = memo(({ 
  showMobileFilters = true, 
  filters: externalFilters, 
  onFilterChange: externalOnFilterChange 
}: ProductListingSectionProps = {}) => {
  const isMobile = useIsMobile();
  const [showFilters, setShowFilters] = useState(false);
  const isHandlingSheetChangeRef = useRef(false);
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const { trackEvent } = usePostHogTracking();
  const [internalFilters, setInternalFilters] = useState<ProductFiltersType>({
    searchTerm: '',
    categories: [],
    brands: [],
    priceRange: [0, 1000],
    priceRangeModified: false
  });


  useEffect(() => {
    const handleToggle = (event: Event) => {
      const customEvent = event as CustomEvent<{ open: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.open === 'boolean') {
        isHandlingSheetChangeRef.current = true;
        setShowFilters(customEvent.detail.open);
        setTimeout(() => {
          isHandlingSheetChangeRef.current = false;
        }, 150);
      }
    };
    
    window.addEventListener('toggleProductFilters', handleToggle);
    return () => window.removeEventListener('toggleProductFilters', handleToggle);
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    if (isHandlingSheetChangeRef.current) {
      return;
    }
    
    setShowFilters(open);
    
    if (!open) {
      window.dispatchEvent(new CustomEvent('updateSearchState', { detail: { open: false } }));
    } else {
      // console.log('🟣 [ProductListingSection] Sheet opened, not dispatching event');
    }
  }, []);

  const filters = externalFilters !== undefined ? externalFilters : internalFilters;
  const { data: metadata, isLoading: isMetadataLoading } = useProductMetadata();
  const productQueryResult = useProductQuery(filters);
  const sortedProducts = useMemo(() => {
    const products = [...(productQueryResult.allProducts || [])];
    
    switch (sortBy) {
      case 'price-asc':
        return products.sort((a, b) => (a.price_per_unit || 0) - (b.price_per_unit || 0));
      case 'price-desc':
        return products.sort((a, b) => (b.price_per_unit || 0) - (a.price_per_unit || 0));
      case 'in-stock':
        return products.sort((a, b) => {
          const aInStock = (a.inventory_count || 0) > 0 ? 1 : 0;
          const bInStock = (b.inventory_count || 0) > 0 ? 1 : 0;
          return bInStock - aInStock;
        });
      case 'relevance':
      default: {
        return products;
      }
    }
  }, [productQueryResult.allProducts, sortBy]);

  const sortedQueryResult = useMemo(() => ({
    ...productQueryResult,
    allProducts: sortedProducts,
    products: sortedProducts.slice(
      productQueryResult.page * 20, 
      (productQueryResult.page + 1) * 20
    ),
    itemCount: {
      showing: Math.min(sortedProducts.length, (productQueryResult.page + 1) * 20),
      total: sortedProducts.length
    }
  }), [productQueryResult, sortedProducts]);

  const handleFilterChangeWithAutoClose = useCallback(
    function handleFilterChangeWithAutoClose_MOBILE(newFilters: ProductFiltersType) {
      if (externalFilters && newFilters.searchTerm !== externalFilters.searchTerm && newFilters.searchTerm) {
        trackEvent('product_searched', {
          query: newFilters.searchTerm,
          results_count: productQueryResult.allProducts?.length || 0,
        });
      }
      
      if (externalFilters && newFilters.categories.length !== externalFilters.categories.length) {
        trackEvent('category_filtered', {
          categories: newFilters.categories,
          products_shown: productQueryResult.allProducts?.length || 0,
        });
      }
      
      if (newFilters.priceRangeModified && externalFilters && 
          (newFilters.priceRange[0] !== externalFilters.priceRange[0] || 
           newFilters.priceRange[1] !== externalFilters.priceRange[1])) {
        trackEvent('price_filtered', {
          min: newFilters.priceRange[0],
          max: newFilters.priceRange[1],
          products_shown: productQueryResult.allProducts?.length || 0,
        });
      }
      
      if (externalOnFilterChange) {
        externalOnFilterChange(newFilters);
      } else {
        setInternalFilters(newFilters);
      }
    }, 
    [externalOnFilterChange, externalFilters, trackEvent, productQueryResult.allProducts]
  );

  const handleFilterChange = useCallback(
    function handleFilterChange_DESKTOP(newFilters: ProductFiltersType) {
      if (externalOnFilterChange) {
        externalOnFilterChange(newFilters);
      } else {
        setInternalFilters(newFilters);
      }
    }, 
    [externalOnFilterChange]
  );

  const handleRefresh = useCallback(() => {
    productQueryResult.setPage(0);
    productQueryResult.refetch();
  }, [productQueryResult]);

  const handleClearAll = useCallback(() => {
    const clearedFilters: ProductFiltersType = {
      searchTerm: '',
      categories: [],
      brands: [],
      priceRange: metadata ? [metadata.priceRange[0], metadata.priceRange[1]] : [0, 1000],
      priceRangeModified: false
    };
    
    if (externalOnFilterChange) {
      externalOnFilterChange(clearedFilters);
    } else {
      setInternalFilters(clearedFilters);
    }
  }, [externalOnFilterChange, metadata]);

  const handleSortChange = useCallback((newSortBy: SortOption) => {
    setSortBy(newSortBy);
    trackEvent('sort_changed', {
      sort_by: newSortBy,
    });
  }, [trackEvent]);

  const renderDesktopFilters = () => (
    <div className="md:col-span-1">
      {metadata && !isMetadataLoading && (
        <ProductFilters
          key="desktop-filters"
          categories={metadata.categories}
          brands={metadata.brands}
          minPrice={metadata.priceRange[0]}
          maxPrice={metadata.priceRange[1]}
          onFilterChange={handleFilterChange}
          activeFilters={filters}
        />
      )}
    </div>
  );


  return (
    <section id="products-section" className="pb-12">
      {/* Search Bar - Full Width */}
      <div className="container pt-8 pb-6">
        <SearchBar
          filters={filters}
          onFilterChange={externalOnFilterChange || setInternalFilters}
          allProducts={sortedQueryResult.allProducts || []}
        />
      </div>

      {/* Sticky Filter Row */}
      {metadata && !isMetadataLoading && (
        <StickyFilterRow
          filters={filters}
          onFilterChange={externalOnFilterChange || setInternalFilters}
          onClearAll={handleClearAll}
          sortBy={sortBy}
          onSortChange={handleSortChange}
          minPrice={metadata.priceRange[0]}
          maxPrice={metadata.priceRange[1]}
          className="sticky top-0 z-10"
        />
      )}

      <div className="container pt-8">
        {(sortedQueryResult.error || (!sortedQueryResult.isLoading && sortedQueryResult.allProducts?.length === 0)) && (
          <div className="flex justify-end mb-6">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={sortedQueryResult.isRefetching}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${sortedQueryResult.isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        )}
      
      {/* Mobile Layout with Sheet/Drawer */}
      {isMobile ? (
        <>
          {/* Mobile Filter Sheet */}
          <Sheet open={showFilters} onOpenChange={handleSheetOpenChange}>
            <SheetContent side="left" className="w-[300px] sm:w-[400px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filter Products</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                {metadata && !isMetadataLoading && (
                  <ProductFilters
                    key="mobile-filters"
                    categories={metadata.categories}
                    brands={metadata.brands}
                    minPrice={metadata.priceRange[0]}
                    maxPrice={metadata.priceRange[1]}
                    onFilterChange={handleFilterChangeWithAutoClose}
                    activeFilters={filters}
                  />
                )}
              </div>
            </SheetContent>
          </Sheet>
          
          {/* Mobile Product List */}
          <div>
            {isMetadataLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <ProductList queryResult={sortedQueryResult} />
            )}
          </div>
        </>
      ) : (
        /* Desktop Layout - Filters always visible */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {renderDesktopFilters()}
          <div className="md:col-span-3">
            {isMetadataLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <ProductList queryResult={sortedQueryResult} />
            )}
          </div>
        </div>
      )}
      </div>
    </section>
  );
});

// Add a display name for debugging
ProductListingSection.displayName = 'ProductListingSection';

export default ProductListingSection;

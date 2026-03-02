
import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/use-mobile';
import ProductFilters, { ProductFiltersType } from '@/components/product-filters';
import ProductCard from '@/components/ProductCard';
import type { Product } from '@/hooks/products/types';

interface ProductSectionProps {
  products: Product[];
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  filters: ProductFiltersType;
  setFilters: (filters: ProductFiltersType) => void;
  refetch: () => void;
}

const ProductSection: React.FC<ProductSectionProps> = ({ 
  products, 
  isLoading, 
  isRefetching, 
  error, 
  filters, 
  setFilters,
  refetch
}) => {
  const isMobile = useIsMobile();
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  // Extract unique categories and brands for filters
  const categories = useMemo(() => {
    if (!products) return [];
    return [...new Set(products.map(product => product.category?.name))].filter(Boolean);
  }, [products]);

  const brands = useMemo(() => {
    if (!products) return [];
    return [...new Set(products.map(product => product.brand))].filter(Boolean) as string[];
  }, [products]);

  // Calculate price ranges
  const priceRange = useMemo(() => {
    if (!products || products.length === 0) return [0, 100];
    const prices = products.map(p => p.price_per_unit);
    return [
      Math.floor(Math.min(...prices)),
      Math.ceil(Math.max(...prices))
    ];
  }, [products]);

  // Apply filters to products
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    return products.filter(product => {
      // Search term filter
      if (filters.searchTerm && !product.name.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
        return false;
      }
      
      // Category filter
      if (filters.categories.length > 0 && !filters.categories.includes(product.category?.name)) {
        return false;
      }
      
      // Brand filter
      if (filters.brands.length > 0 && product.brand && !filters.brands.includes(product.brand)) {
        return false;
      }
      
      // Price range filter - only apply if explicitly modified
      if (filters.priceRangeModified && 
          (product.price_per_unit < filters.priceRange[0] || 
           product.price_per_unit > filters.priceRange[1])) {
        return false;
      }
      
      return true;
    });
  }, [products, filters]);

  const handleFilterChange = (newFilters: ProductFiltersType) => {
    setFilters(newFilters);
  };

  // Group products by category
  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};

    filteredProducts.forEach(product => {
      const category = product.category?.name || 'Other';
      
      if (!groups[category]) {
        groups[category] = [];
      }
      
      groups[category].push(product);
    });

    return groups;
  }, [filteredProducts]);

  const renderProductsByCategory = () => {
    return (
      <div className="space-y-8">
        {Object.entries(groupedProducts).map(([category, products]) => {
          if (products.length === 0) return null;
          
          return (
            <div key={category} className="space-y-4">
              {/* Category Header */}
              <div className="border-b border-border pb-2">
                <h4 className="text-xl font-semibold text-foreground">{category}</h4>
                <p className="text-sm text-muted-foreground">{products.length} items</p>
              </div>
              
              {/* Products Grid - Horizontal scroll on mobile, grid on desktop */}
              <div className="md:grid md:grid-cols-3 lg:grid-cols-4 md:gap-4">
                <div className="flex md:contents overflow-x-auto gap-3 md:gap-0 pb-2 md:pb-0 snap-x snap-mandatory">
                  {products.map((product) => (
                    <div key={product.id} className="flex-shrink-0 w-40 md:w-auto snap-start">
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render mobile filters with partial visibility by default
  const renderMobileFilters = () => (
    <div className="mb-4">
      {/* Always visible search and basic filters (20% preview) */}
      <div className="bg-card border rounded-lg p-4 mb-2">
        <div className="space-y-3">
          <ProductFilters
            categories={categories}
            brands={brands}
            minPrice={priceRange[0]}
            maxPrice={priceRange[1]}
            onFilterChange={handleFilterChange}
            compactMode={true}
          />
        </div>
      </div>
      
      {/* Expandable section for additional filters */}
      <Collapsible open={isFiltersExpanded} onOpenChange={setIsFiltersExpanded}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between"
            size="sm"
          >
            <span className="text-sm">
              {isFiltersExpanded ? 'Show Less Filters' : 'Show More Filters'}
            </span>
            {isFiltersExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <div className="bg-card border rounded-lg p-4">
            <ProductFilters
              categories={categories}
              brands={brands}
              minPrice={priceRange[0]}
              maxPrice={priceRange[1]}
              onFilterChange={handleFilterChange}
              expandedMode={true}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );

  // Render desktop filters in sidebar
  const renderDesktopFilters = () => (
    <div className="md:col-span-1">
      <ProductFilters
        categories={categories}
        brands={brands}
        minPrice={priceRange[0]}
        maxPrice={priceRange[1]}
        onFilterChange={handleFilterChange}
      />
    </div>
  );

  // Render products content
  const renderProductsContent = () => {
    if (isLoading || isRefetching) {
      return (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 p-6 rounded-lg text-center">
          <p className="text-red-600 mb-4">Failed to load products</p>
          <Button 
            variant="outline" 
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Try Again
          </Button>
        </div>
      );
    }

    if (filteredProducts.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-lg text-gray-600 mb-2">No products match your search criteria</p>
          <p className="text-sm text-gray-500">Try adjusting your filters or search term</p>
        </div>
      );
    }

    return renderProductsByCategory();
  };

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4">Menu Items</h3>
      
      {/* Mobile Layout */}
      {isMobile ? (
        <div className="space-y-4">
          {renderMobileFilters()}
          <div>
            {renderProductsContent()}
          </div>
        </div>
      ) : (
        /* Desktop Layout */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {renderDesktopFilters()}
          <div className="md:col-span-3">
            {renderProductsContent()}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductSection;

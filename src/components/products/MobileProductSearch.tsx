import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import ProductFilters, { ProductFiltersType } from '@/components/product-filters';
import { useProductMetadata } from '@/hooks/products';

interface MobileProductSearchProps {
  filters: ProductFiltersType;
  onFilterChange: (filters: ProductFiltersType) => void;
}

const MobileProductSearch = ({ filters, onFilterChange }: MobileProductSearchProps) => {
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const { data: metadata, isLoading: isMetadataLoading } = useProductMetadata();

  return (
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container py-4">
        {/* Always visible search and basic filters */}
        <div className="bg-card border rounded-lg p-4 mb-2">
          {metadata && !isMetadataLoading && (
            <div className="space-y-3">
              <ProductFilters
                categories={metadata.categories}
                brands={metadata.brands}
                minPrice={metadata.priceRange[0]}
                maxPrice={metadata.priceRange[1]}
                onFilterChange={onFilterChange}
                activeFilters={filters}
                compactMode={true}
              />
            </div>
          )}
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
              {metadata && !isMetadataLoading && (
                <ProductFilters
                  categories={metadata.categories}
                  brands={metadata.brands}
                  minPrice={metadata.priceRange[0]}
                  maxPrice={metadata.priceRange[1]}
                  onFilterChange={onFilterChange}
                  activeFilters={filters}
                  expandedMode={true}
                />
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};

export default MobileProductSearch;
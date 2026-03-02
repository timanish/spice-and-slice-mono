import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { ProductFiltersType } from '@/components/product-filters';

export type SortOption = 'relevance' | 'price-asc' | 'price-desc' | 'in-stock';

interface StickyFilterRowProps {
  filters: ProductFiltersType;
  onFilterChange: (filters: ProductFiltersType) => void;
  onClearAll: () => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  minPrice: number;
  maxPrice: number;
  className?: string;
}

const StickyFilterRow: React.FC<StickyFilterRowProps> = ({
  filters,
  onFilterChange,
  onClearAll,
  sortBy,
  onSortChange,
  minPrice,
  maxPrice,
  className = ''
}) => {
  const [tempPriceRange, setTempPriceRange] = useState(filters.priceRange);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          
          // Show when scrolling up, hide when scrolling down
          // Only apply this behavior on mobile (width < 1024px)
          if (window.innerWidth < 1024) {
            if (currentScrollY < lastScrollY.current || currentScrollY < 100) {
              setIsVisible(true);
            } else if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
              setIsVisible(false);
            }
          } else {
            setIsVisible(true);
          }
          
          lastScrollY.current = currentScrollY;
          ticking.current = false;
        });
        
        ticking.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleRemoveCategory = (category: string) => {
    const newFilters = {
      ...filters,
      categories: filters.categories.filter(c => c !== category)
    };
    onFilterChange(newFilters);
  };

  const handleRemoveBrand = (brand: string) => {
    const newFilters = {
      ...filters,
      brands: filters.brands.filter(b => b !== brand)
    };
    onFilterChange(newFilters);
  };

  const handleRemovePriceFilter = () => {
    const newFilters = {
      ...filters,
      priceRange: [minPrice, maxPrice] as [number, number],
      priceRangeModified: false
    };
    onFilterChange(newFilters);
  };

  const handlePriceChange = (values: number[]) => {
    setTempPriceRange(values as [number, number]);
  };

  const handlePriceCommit = () => {
    const newFilters = {
      ...filters,
      priceRange: tempPriceRange,
      priceRangeModified: true
    };
    onFilterChange(newFilters);
  };

  const handleRemoveSearch = () => {
    const newFilters = {
      ...filters,
      searchTerm: ''
    };
    onFilterChange(newFilters);
  };

  const hasActiveFilters = 
    filters.searchTerm.length > 0 ||
    filters.categories.length > 0 || 
    filters.brands.length > 0 || 
    filters.priceRangeModified;

  const isPriceFiltered = filters.priceRangeModified && 
    (filters.priceRange[0] !== minPrice || filters.priceRange[1] !== maxPrice);

  return (
    <div 
      className={`bg-white border-b border-gray-200 shadow-md transition-transform duration-300 ${className} ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="container py-5">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Left Side - Active Filters */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-h-[40px]">
            {/* Filter Icon Label */}
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mr-2">
              <SlidersHorizontal className="h-4 w-4 text-gray-600" />
              <span className="hidden sm:inline">Filters:</span>
            </div>

            {/* Search Term Badge */}
            {filters.searchTerm && (
              <Badge 
                variant="secondary" 
                className="flex items-center gap-1.5 px-3 py-2 bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer transition-all hover:scale-105 rounded-full font-medium text-sm"
                onClick={handleRemoveSearch}
              >
                Search: {filters.searchTerm}
                <X className="h-3.5 w-3.5" />
              </Badge>
            )}

            {/* Price Range Badge */}
            {isPriceFiltered && (
              <Badge 
                variant="secondary" 
                className="flex items-center gap-1.5 px-3 py-2 bg-food-red/10 text-food-red hover:bg-food-red/20 cursor-pointer transition-all hover:scale-105 rounded-full font-medium text-sm"
                onClick={handleRemovePriceFilter}
              >
                ${filters.priceRange[0]} - ${filters.priceRange[1]}
                <X className="h-3.5 w-3.5" />
              </Badge>
            )}

            {/* Category Badges */}
            {filters.categories.map(category => (
              <Badge 
                key={category}
                variant="secondary"
                className="flex items-center gap-1.5 px-3 py-2 bg-food-orange/10 text-food-orange hover:bg-food-orange/20 cursor-pointer transition-all hover:scale-105 rounded-full font-medium text-sm"
                onClick={() => handleRemoveCategory(category)}
              >
                {category}
                <X className="h-3.5 w-3.5" />
              </Badge>
            ))}

            {/* Brand Badges */}
            {filters.brands.map(brand => (
              <Badge 
                key={brand}
                variant="secondary"
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer transition-all hover:scale-105 rounded-full font-medium text-sm"
                onClick={() => handleRemoveBrand(brand)}
              >
                {brand}
                <X className="h-3.5 w-3.5" />
              </Badge>
            ))}

            {/* Clear All Button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="text-gray-600 hover:text-food-red text-sm font-medium hover:bg-red-50 transition-colors"
              >
                Clear All
              </Button>
            )}

            {/* No Filters Message */}
            {!hasActiveFilters && (
              <span className="text-sm text-gray-400 italic">No filters applied</span>
            )}
          </div>

          {/* Right Side - Price Range & Sort */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Price Range Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2 h-10 border-gray-300 hover:bg-gray-50 transition-colors font-medium"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="text-sm">Price</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Price Range</h4>
                  <div className="space-y-4">
                    <Slider
                      value={tempPriceRange}
                      onValueChange={handlePriceChange}
                      onValueCommit={handlePriceCommit}
                      min={minPrice}
                      max={maxPrice}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>${tempPriceRange[0]}</span>
                      <span>${tempPriceRange[1]}</span>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Sort Dropdown */}
            <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortOption)}>
              <SelectTrigger className="w-[180px] h-10 border-gray-300 hover:bg-gray-50 transition-colors font-medium">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StickyFilterRow;

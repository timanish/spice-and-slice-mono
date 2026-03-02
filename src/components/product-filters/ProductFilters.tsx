import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useProductQuery } from '@/hooks/products';
import FilterSection from './FilterSection';
import PriceRangeFilter from './PriceRangeFilter';
import CheckboxGroup from './CheckboxGroup';
import SearchInput from './SearchInput';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface FilterProps {
  categories: string[];
  brands: string[];
  minPrice: number;
  maxPrice: number;
  onFilterChange: (filters: ProductFiltersType) => void;
  activeFilters?: ProductFiltersType;
  compactMode?: boolean;
  expandedMode?: boolean;
}

export interface ProductFilters {
  searchTerm: string;
  categories: string[];
  brands: string[];
  priceRange: [number, number];
  priceRangeModified?: boolean;
}

// Alias for better readability
export type ProductFiltersType = ProductFilters;

const ProductFilters = ({ 
  categories, 
  brands, 
  minPrice, 
  maxPrice, 
  onFilterChange,
  activeFilters,
  compactMode = false,
  expandedMode = false
}: FilterProps) => {
  
  const [filters, setFilters] = useState<ProductFiltersType>({
    searchTerm: '',
    categories: [],
    brands: [],
    priceRange: [minPrice, maxPrice],
    priceRangeModified: false
  });
  
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const { allProducts } = useProductQuery({ 
    searchTerm: '', 
    categories: [], 
    brands: [], 
    priceRange: [0, 10000],
    priceRangeModified: false
  });

  useEffect(() => {
    if (activeFilters) {
      setFilters({
        searchTerm: activeFilters.searchTerm || '',
        categories: activeFilters.categories || [],
        brands: activeFilters.brands || [],
        priceRange: activeFilters.priceRange || [minPrice, maxPrice],
        priceRangeModified: activeFilters.priceRangeModified || false
      });
    }
  }, [
    activeFilters?.searchTerm, 
    JSON.stringify(activeFilters?.categories), 
    JSON.stringify(activeFilters?.brands), 
    JSON.stringify(activeFilters?.priceRange), 
    activeFilters?.priceRangeModified, 
    minPrice, 
    maxPrice
  ]);

  // Update local state when min/max price from props change
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      priceRange: [
        prev.priceRangeModified ? prev.priceRange[0] : minPrice,
        prev.priceRangeModified ? prev.priceRange[1] : maxPrice
      ]
    }));
  }, [minPrice, maxPrice]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value;
    const newFilters = {
      ...filters,
      searchTerm
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
    setShowSuggestions(searchTerm.length > 0);
  }, [filters, onFilterChange]);
  
  const handleSearchFocus = useCallback(() => {
    if (filters.searchTerm.length > 0) {
      setShowSuggestions(true);
    }
  }, [filters.searchTerm]);
  
  const handleSuggestionSelect = (suggestion: string) => {
    const newFilters = {
      ...filters,
      searchTerm: suggestion
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleCategoryChange = (category: string, checked: boolean) => {
    const newCategories = checked
      ? [...filters.categories, category]
      : filters.categories.filter(c => c !== category);
    
    const newFilters = {
      ...filters,
      categories: newCategories
    };
    
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleBrandChange = (brand: string, checked: boolean) => {
    const newBrands = checked
      ? [...filters.brands, brand]
      : filters.brands.filter(b => b !== brand);
    
    const newFilters = {
      ...filters,
      brands: newBrands
    };
    
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handlePriceChange = (values: number[]) => {
    const newFilters = {
      ...filters,
      priceRange: [values[0], values[1]] as [number, number],
      priceRangeModified: true
    };
    
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowSuggestions(false);
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Compact mode renders only search and a few categories
  if (compactMode) {
    return (
      <div className="space-y-3">
        <SearchInput 
          searchTerm={filters.searchTerm}
          onSearchChange={handleSearchChange}
          onFocus={handleSearchFocus}
          showSuggestions={showSuggestions}
          setShowSuggestions={setShowSuggestions}
          products={allProducts || []}
          onSuggestionSelect={handleSuggestionSelect}
        />
        
        {categories.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Quick Categories</h4>
            <div className="flex flex-wrap gap-2">
              {categories.slice(0, 4).map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategoryChange(category, !filters.categories.includes(category))}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    filters.categories.includes(category)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border hover:bg-accent'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Expanded mode shows additional filters beyond basic
  if (expandedMode) {
    return (
      <div className="space-y-4">
        <FilterSection title="Price Range">
          <PriceRangeFilter 
            minPrice={minPrice}
            maxPrice={maxPrice}
            value={filters.priceRange}
            onChange={values => handlePriceChange(values)}
          />
        </FilterSection>

        {categories.length > 4 && (
          <FilterSection title="All Categories">
            <CheckboxGroup 
              items={categories}
              selectedItems={filters.categories}
              onChange={handleCategoryChange}
              idPrefix="category"
            />
          </FilterSection>
        )}

        {brands.length > 0 && (
          <FilterSection title="Brands">
            <CheckboxGroup 
              items={brands}
              selectedItems={filters.brands}
              onChange={handleBrandChange}
              idPrefix="brand"
            />
          </FilterSection>
        )}
      </div>
    );
  }

  // Default mode (desktop)
  return (
    <Card className="h-fit sticky top-4 shadow-md">
      <CardContent className="pt-5 px-5">
        <div className="space-y-5">
          <FilterSection title="Price Range">
            <PriceRangeFilter 
              minPrice={minPrice}
              maxPrice={maxPrice}
              value={filters.priceRange}
              onChange={values => handlePriceChange(values)}
            />
          </FilterSection>

          {categories.length > 0 && (
            <Accordion type="single" collapsible defaultValue="categories" className="w-full">
              <AccordionItem value="categories" className="border-none">
                <AccordionTrigger className="py-2 text-sm font-semibold hover:no-underline">
                  Categories
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-0">
                  <CheckboxGroup 
                    items={categories}
                    selectedItems={filters.categories}
                    onChange={handleCategoryChange}
                    idPrefix="category"
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          {brands.length > 0 && (
            <Accordion type="single" collapsible defaultValue="brands" className="w-full">
              <AccordionItem value="brands" className="border-none">
                <AccordionTrigger className="py-2 text-sm font-semibold hover:no-underline">
                  Brands
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-0">
                  <CheckboxGroup 
                    items={brands}
                    selectedItems={filters.brands}
                    onChange={handleBrandChange}
                    idPrefix="brand"
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductFilters;

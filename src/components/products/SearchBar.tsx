import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ProductFiltersType } from '@/components/product-filters';

interface Product {
  id: string;
  name: string;
  description?: string | null;
  category?: { id: string; name: string; tax_rate?: number | null } | null;
  tags?: string[] | null;
}

interface SearchBarProps {
  filters: ProductFiltersType;
  onFilterChange: (filters: ProductFiltersType) => void;
  allProducts: Product[];
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  filters,
  onFilterChange,
  allProducts,
  placeholder = "Search by name, description, category..." 
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate suggestions based on search term
  const suggestions = useMemo(() => {
    if (!filters.searchTerm || filters.searchTerm.length === 0) {
      return [];
    }

    const searchLower = filters.searchTerm.toLowerCase();
    const matches = new Set<string>();

    allProducts.forEach(product => {
      // Match product name
      if (product.name?.toLowerCase().includes(searchLower)) {
        matches.add(product.name);
      }
      // Match category
      if (product.category?.name?.toLowerCase().includes(searchLower)) {
        matches.add(product.category.name);
      }
      // Match description
      if (product.description?.toLowerCase().includes(searchLower)) {
        matches.add(product.name); // Add product name for description matches
      }
      // Match tags
      if (product.tags) {
        product.tags.forEach(tag => {
          if (tag.toLowerCase().includes(searchLower)) {
            matches.add(product.name);
          }
        });
      }
    });

    return Array.from(matches).slice(0, 8);
  }, [filters.searchTerm, allProducts]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onFilterChange({
      ...filters,
      searchTerm: newValue
    });
    setShowSuggestions(newValue.length > 0);
    setHighlightedIndex(-1);
  }, [filters, onFilterChange]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    onFilterChange({
      ...filters,
      searchTerm: suggestion
    });
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  }, [filters, onFilterChange]);

  const handleClear = useCallback(() => {
    onFilterChange({
      ...filters,
      searchTerm: ''
    });
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  }, [filters, onFilterChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[highlightedIndex]);
        } else {
          // Submit search with the typed term as-is
          setShowSuggestions(false);
          setHighlightedIndex(-1);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
    }
  }, [showSuggestions, suggestions, highlightedIndex, handleSuggestionClick]);

  const filteredSuggestions = suggestions.slice(0, 8); // Limit to 8 suggestions

  return (
    <div ref={searchRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          value={filters.searchTerm}
          onChange={handleInputChange}
          onFocus={() => filters.searchTerm.length > 0 && setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-14 pr-12 h-16 text-base border border-gray-300 rounded-lg shadow-sm focus:border-food-red focus:ring-2 focus:ring-food-red/20 transition-all"
        />
        {filters.searchTerm && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
            aria-label="Clear search"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Autocomplete Suggestions Dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-lg border border-gray-200 rounded-lg max-h-[400px] overflow-y-auto">
          <div className="py-2">
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-100 transition-colors flex items-center gap-3 ${
                  index === highlightedIndex ? 'bg-gray-100' : ''
                }`}
              >
                <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm flex-1 truncate">{suggestion}</span>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default SearchBar;

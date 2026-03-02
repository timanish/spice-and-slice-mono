
import React from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Product } from '@/hooks/products';

interface SearchSuggestionsProps {
  products: Product[];
  searchTerm: string;
  onSelect: (value: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const SearchSuggestions = ({
  products,
  searchTerm,
  onSelect,
  isOpen,
  setIsOpen
}: SearchSuggestionsProps) => {
  // Get unique suggestions based on product name, brand, and category
  const suggestions = React.useMemo(() => {
    if (!searchTerm.trim() || !products || products.length === 0) return [];

    const term = searchTerm.toLowerCase().trim();
    const uniqueSuggestions = new Set<string>();
    
    // Add product names that match
    products.forEach(product => {
      // Check name
      if (product.name.toLowerCase().includes(term)) {
        uniqueSuggestions.add(product.name);
      }
      
      // Check category
      const categoryName = typeof product.category === 'object' ? product.category?.name : product.category;
      if (categoryName && categoryName.toLowerCase().includes(term)) {
        uniqueSuggestions.add(categoryName);
      }
      
      // Check brand
      if (product.brand && product.brand.toLowerCase().includes(term)) {
        uniqueSuggestions.add(product.brand);
      }
      
      // Check tags
      if (product.tags) {
        product.tags.forEach(tag => {
          if (tag.toLowerCase().includes(term)) {
            uniqueSuggestions.add(tag);
          }
        });
      }
    });
    
    return Array.from(uniqueSuggestions).sort().slice(0, 5);
  }, [products, searchTerm]);

  // Don't render anything if not open or no suggestions
  if (!isOpen || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="relative z-50">
      <Command className="rounded-lg border shadow-md">
        <CommandList>
          <CommandInput placeholder="Search products..." value={searchTerm} readOnly={true} className="hidden" />
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup className="max-h-60 overflow-auto">
            {suggestions.map((suggestion) => (
              <CommandItem
                key={suggestion}
                onSelect={() => {
                  onSelect(suggestion);
                  setIsOpen(false);
                }}
                className="cursor-pointer"
              >
                {suggestion}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
};

export default SearchSuggestions;


import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import SearchSuggestions from '@/components/products/SearchSuggestions';
import { Product } from '@/hooks/products';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchInputProps {
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  products: Product[];
  onSuggestionSelect: (suggestion: string) => void;
  debounceDelay?: number;
}

const SearchInput: React.FC<SearchInputProps> = ({
  searchTerm,
  onSearchChange,
  onFocus,
  showSuggestions,
  setShowSuggestions,
  products,
  onSuggestionSelect,
  debounceDelay = 300
}) => {
  const [inputValue, setInputValue] = useState(searchTerm);
  const debouncedValue = useDebounce(inputValue, debounceDelay);
  
  // Update local input value without triggering filter
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };
  
  // When debounced value changes, trigger the actual search
  useEffect(() => {
    // Create a synthetic event to match the expected parameter
    const syntheticEvent = {
      target: { value: debouncedValue },
      currentTarget: { value: debouncedValue }
    } as React.ChangeEvent<HTMLInputElement>;
    
    onSearchChange(syntheticEvent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedValue]);
  
  return (
    <div className="relative">
      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search by name or description..."
        value={inputValue}
        onChange={handleInputChange}
        onFocus={onFocus}
        className="pl-8"
      />
      <SearchSuggestions 
        products={products || []}
        searchTerm={inputValue}
        onSelect={onSuggestionSelect}
        isOpen={showSuggestions}
        setIsOpen={setShowSuggestions}
      />
    </div>
  );
};

export default SearchInput;

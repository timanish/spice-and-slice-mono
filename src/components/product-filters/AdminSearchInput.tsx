
import React, { useState, useEffect, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface AdminSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  debounceDelay?: number;
  minSearchLength?: number;
}

const AdminSearchInput: React.FC<AdminSearchInputProps> = ({ 
  value, 
  onChange, 
  placeholder = "Search products...", 
  className = "",
  debounceDelay = 300,
  minSearchLength = 3
}) => {
  const [inputValue, setInputValue] = useState(value);
  const debouncedValue = useDebounce(inputValue, debounceDelay);
  
  // Handle immediate search on Enter key press
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onChange(inputValue);
    }
  };
  
  useEffect(() => {
    // Only trigger search if the input length meets the minimum requirement
    if (debouncedValue.length >= minSearchLength || debouncedValue.length === 0) {
      onChange(debouncedValue);
    }
  }, [debouncedValue, onChange, minSearchLength]);
  
  return (
    <div className={`relative w-full ${className}`}>
      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input 
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="pl-8 w-full"
      />
    </div>
  );
};

export default AdminSearchInput;

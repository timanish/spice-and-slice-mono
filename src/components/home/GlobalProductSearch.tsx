import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Search, TrendingUp, X, Clock, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useProductFetcher } from '@/hooks/products';

const GlobalProductSearch = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout>();
  
  const { data: products = [] } = useProductFetcher();

  const popularSearches = ['Chicken', 'Rice', 'Biryani', 'Curry', 'Naan', 'Spices'];

  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved).slice(0, 5));
    }
  }, []);

  const saveSearch = useCallback((term: string) => {
    if (!term.trim()) return;
    
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  }, [recentSearches]);

  const clearRecentSearch = useCallback((term: string) => {
    const updated = recentSearches.filter(s => s !== term);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  }, [recentSearches]);

  const suggestions = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) {
      return [];
    }

    const searchLower = searchTerm.toLowerCase();
    const matches = new Map<string, { type: string; category?: string; image?: string; price?: number }>();

    products.forEach(product => {
      if (product.name?.toLowerCase().includes(searchLower)) {
        matches.set(product.name, { 
          type: 'product', 
          category: product.category?.name || undefined,
          image: product.image_url,
          price: product.price_per_unit
        });
      }
      if (product.category?.name?.toLowerCase().includes(searchLower)) {
        matches.set(product.category.name, { type: 'category' });
      }
      if (product.tags && Array.isArray(product.tags)) {
        product.tags.forEach(tag => {
          if (tag.toLowerCase().includes(searchLower)) {
            matches.set(tag, { type: 'tag' });
          }
        });
      }
    });

    return Array.from(matches.entries())
      .slice(0, 8)
      .map(([text, meta]) => ({ text, ...meta }));
  }, [searchTerm, products]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = useCallback((term: string) => {
    if (term.trim()) {
      saveSearch(term);
      navigate(`/products?search=${encodeURIComponent(term.trim())}`);
    }
  }, [navigate, saveSearch]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setHighlightedIndex(-1);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (newValue.length >= 2) {
      setIsLoading(true);
      debounceTimer.current = setTimeout(() => {
        setShowSuggestions(true);
        setIsLoading(false);
      }, 300); 
    } else {
      setShowSuggestions(false);
      setIsLoading(false);
    }
  }, []);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setSearchTerm(suggestion);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    handleSearch(suggestion);
  }, [handleSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        handleSuggestionClick(suggestions[highlightedIndex].text);
      } else if (searchTerm.trim()) {
        handleSearch(searchTerm);
      }
      return;
    }

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
      case 'Escape':
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
    }
  }, [showSuggestions, suggestions, highlightedIndex, handleSuggestionClick, searchTerm, handleSearch]);

  const handlePopularSearchClick = useCallback((term: string) => {
    setSearchTerm(term);
    handleSearch(term);
  }, [handleSearch]);

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <motion.div 
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Find Your Perfect Product
            </h2>
            <p className="text-lg text-gray-600">
              Search from our extensive collection of authentic Indo-Nepali products
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.div 
            ref={searchRef} 
            className="relative"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <div className="relative">
              <motion.div
                animate={{ rotate: isLoading ? 360 : 0 }}
                transition={{ duration: 2, repeat: isLoading ? Infinity : 0 }}
                className="absolute inset-y-0 left-6 flex items-center pointer-events-none"
              >
                <Search className="h-5 w-5 text-gray-400" />
              </motion.div>
              <Input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={handleInputChange}
                onFocus={() => searchTerm.length >= 2 && setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                placeholder="Search for products, categories, or ingredients..."
                className="pl-16 pr-6 h-16 md:h-20 text-lg md:text-xl border-2 border-gray-200 rounded-2xl shadow-lg focus:border-food-red focus:ring-4 focus:ring-food-red/20 transition-all"
              />
            </div>

            {/* Suggestions Dropdown */}
            <AnimatePresence>
              {showSuggestions && (
                <motion.div
                  key="suggestions-dropdown"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute z-50 w-full mt-2"
                >
                  <Card className="shadow-xl border-2 rounded-xl overflow-hidden">
                    <div className="max-h-[500px] overflow-y-auto">
                      {/* Recent Searches */}
                      {recentSearches.length > 0 && !suggestions.length && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Recent Searches</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {recentSearches.map((recent, idx) => (
                              <motion.button
                                key={recent}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                onClick={() => handleSuggestionClick(recent)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-food-red/5 hover:border-food-red hover:text-food-red transition-all"
                              >
                                {recent}
                                <X
                                  className="h-3 w-3 cursor-pointer hover:opacity-60"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    clearRecentSearch(recent);
                                  }}
                                />
                              </motion.button>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {/* Search Results */}
                      {suggestions.length > 0 ? (
                        suggestions.map((suggestion, index) => (
                          <motion.button
                            key={`${suggestion.type}-${suggestion.text}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => handleSuggestionClick(suggestion.text)}
                            className={`w-full text-left px-6 py-4 border-b border-gray-100 last:border-0 transition-all ${
                              index === highlightedIndex 
                                ? 'bg-gradient-to-r from-food-red/5 to-food-orange/5' 
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              {/* Product Image */}
                              {suggestion.image && suggestion.type === 'product' && (
                                <motion.img
                                  src={suggestion.image}
                                  alt={suggestion.text}
                                  className="h-12 w-12 rounded-lg object-cover border border-gray-200"
                                  whileHover={{ scale: 1.1 }}
                                />
                              )}
                              
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <span className="text-base font-medium text-gray-900">
                                    {suggestion.text}
                                  </span>
                                  <Badge variant="secondary" className="text-xs capitalize">
                                    {suggestion.type}
                                  </Badge>
                                </div>
                                {suggestion.category && (
                                  <div className="text-sm text-gray-500 mt-1">
                                    in {suggestion.category}
                                  </div>
                                )}
                                {suggestion.price && (
                                  <div className="text-sm font-semibold text-food-red mt-1">
                                    ${suggestion.price.toFixed(2)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.button>
                        ))
                      ) : isLoading ? (
                        // Loading Skeleton
                        Array.from({ length: 3 }).map((_, idx) => (
                          <motion.div
                            key={`skeleton-${idx}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: idx * 0.1 }}
                            className="px-6 py-4 border-b border-gray-100 last:border-0"
                          >
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-lg bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse" />
                              <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse w-3/4" />
                                <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse w-1/2" />
                              </div>
                            </div>
                          </motion.div>
                        ))
                      ) : null}
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Popular Searches */}
          <motion.div 
            className="mt-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-food-orange" />
              <p className="text-sm font-medium text-gray-600">Popular Searches:</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {popularSearches.map((term, idx) => (
                <motion.button
                  key={term}
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  whileHover={{ scale: 1.08, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  viewport={{ once: true }}
                  onClick={() => handlePopularSearchClick(term)}
                  className="px-5 py-2.5 bg-white border-2 border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:border-food-red hover:text-food-red hover:shadow-lg transition-all"
                >
                  {term}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default GlobalProductSearch;

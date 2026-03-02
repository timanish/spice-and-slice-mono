
import { useState, useEffect, useMemo } from 'react';
import { PRODUCTS_PER_PAGE } from './types';

export const usePagination = <T>(items: T[], dependencies: any[] = []) => {
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Calculate total pages
  const totalPages = useMemo(() => {
    if (!items) return 0;
    return Math.ceil(items.length / PRODUCTS_PER_PAGE);
  }, [items]);
  
  // Only reset pagination when the items array length changes,
  // not on every render or when page changes
  useEffect(() => {
    // Reset page only when the items array changes its length
    // This ensures that pagination isn't reset when just navigating
    setPage(0);
  }, [JSON.stringify(dependencies.map(dep => 
    // For arrays, we only track their length
    Array.isArray(dep) ? dep.length : dep
  ))]);
  
  // Client-side pagination - only show items for current page
  const paginatedItems = useMemo(() => {
    if (!items) return [];
    
    const start = page * PRODUCTS_PER_PAGE; // Start from current page
    const end = start + PRODUCTS_PER_PAGE; // Show exactly PRODUCTS_PER_PAGE items
    
    return items.slice(start, end);
  }, [items, page]);
  
  // Update hasMore flag
  useEffect(() => {
    if (!items) return;
    setHasMore(page < totalPages - 1);
  }, [items, page, totalPages]);
  
  // Load more function kept for compatibility
  const loadMore = () => {
    setPage(prevPage => {
      if (prevPage < totalPages - 1) {
        const newPage = prevPage + 1;
        return newPage;
      }
      return prevPage;
    });
  };

  // Calculate current item count for display purposes
  const itemCount = {
    showing: paginatedItems.length,
    total: items?.length || 0
  };
  
  return {
    page,
    setPage,
    hasMore,
    paginatedItems,
    loadMore,
    itemCount,
    totalPages
  };
};

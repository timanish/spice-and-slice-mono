import { useState, useEffect } from 'react';
import { ProductFiltersType } from '@/components/product-filters';
import { ProductQueryResult, Product } from './types';
import { useProductFetcher } from './useProductFetcher';
import { useProductFiltering } from './useProductFiltering';
import { usePagination } from './usePagination';

export const useProductQuery = (filters: ProductFiltersType): ProductQueryResult => {
  // Keep track of the current filters
  const [currentFilters, setCurrentFilters] = useState(filters);
  
  // Fetch all products - explicitly use Product type
  const { 
    data: allProductsFromDB, 
    isLoading, 
    error, 
    refetch,
    isRefetching,
  } = useProductFetcher();

  // Apply filters client-side with proper typing
  const filteredProducts = useProductFiltering(
    allProductsFromDB as Product[], 
    filters
  );

  // Update current filters when they change
  useEffect(() => {
    setCurrentFilters(filters);
  }, [JSON.stringify(filters)]);

  // Client-side pagination with the filtered products
  // Only reset pagination when filters change, not on every render
  const pagination = usePagination(filteredProducts, [JSON.stringify(currentFilters)]);

  return {
    products: pagination.paginatedItems, // Paginated products
    allProducts: filteredProducts,
    isLoading,
    isRefetching,
    error: error as Error | null,
    hasMore: pagination.hasMore,
    page: pagination.page,
    setPage: pagination.setPage,
    loadMore: pagination.loadMore,
    refetch,
    itemCount: {
      showing: pagination.paginatedItems.length,
      total: filteredProducts.length
    },
    totalPages: pagination.totalPages
  };
};

// Re-export for backward compatibility
export * from './types';

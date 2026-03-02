
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import DeliveryTimeSelector from '@/components/DeliveryTimeSelector';
import ProductSection from './ProductSection';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Product } from '@/hooks/products/types';
import type { ProductFiltersType } from '@/components/product-filters';

const fetchProducts = async () => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('priority', { ascending: true })
    .order('name');

  if (error) throw error;
  return data || [];
};

const DirectOrderTab = () => {
  const { 
    data: products, 
    isLoading, 
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const [filters, setFilters] = useState<ProductFiltersType>({
    searchTerm: '',
    categories: [],
    brands: [],
    priceRange: [0, 1000],
    priceRangeModified: false
  });

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-serif font-bold">Direct Online Order</h2>
        {(error || (!isLoading && products?.length === 0)) && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}
      </div>
      
      <DeliveryTimeSelector />
      
      <ProductSection 
        products={products as Product[]} 
        isLoading={isLoading}
        isRefetching={isRefetching}
        error={error as Error | null}
        filters={filters} 
        setFilters={setFilters}
        refetch={refetch}
      />
    </div>
  );
};

export default DirectOrderTab;

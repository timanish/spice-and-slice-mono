
import { memo, useCallback, useEffect, useRef, useMemo } from 'react';
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/ProductCard';
import { ProductQueryResult, PRODUCTS_PER_PAGE, Product } from '@/hooks/products';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';

interface ProductListProps {
  queryResult: ProductQueryResult;
}

const ProductList = memo(({ queryResult }: ProductListProps) => {
  const { 
    products, 
    isLoading, 
    error, 
    hasMore, 
    isRefetching, 
    refetch,
    page,
    setPage,
    itemCount,
    totalPages
  } = queryResult;
  
  const prevProductsRef = useRef<typeof products>([]);
  const prevPageRef = useRef(page);
  
  useEffect(() => {
    prevProductsRef.current = products;
    prevPageRef.current = page;
  }, [products, page]);

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setPage(newPage);
    }
  }, [setPage, totalPages]);

  const getPageNumbers = useCallback(() => {
    const pageNumbers: number[] = [];
    
    pageNumbers.push(0);
    const startPage = Math.max(1, page - 1);
    const endPage = Math.min(totalPages - 1, page + 1);
    
    if (startPage > 1) {
      pageNumbers.push(-1); 
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    
    if (endPage < totalPages - 2) {
      pageNumbers.push(-1); 
    }
    
    if (totalPages > 1 && !pageNumbers.includes(totalPages - 1)) {
      pageNumbers.push(totalPages - 1);
    }
    
    return pageNumbers;
  }, [page, totalPages]);

  if ((isLoading && page === 0)) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    console.error('Error in ProductList:', error);
    return (
      <div className="bg-red-50 border border-red-200 p-8 rounded-lg text-center max-w-md mx-auto">
        <div className="text-4xl mb-4" role="img" aria-label="Error">🍽️</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to load products</h3>
        <p className="text-gray-600 mb-6">
          We're having trouble fetching our menu. Please try again or browse by category below.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <Button 
            variant="outline" 
            onClick={handleRefetch}
            disabled={isRefetching}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Try Again
          </Button>
          <Button 
            variant="ghost"
            onClick={() => window.location.href = '/contact'}
          >
            Contact Support
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {['Chicken', 'Rice', 'Biryani', 'Curry', 'Naan', 'Spices'].map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 text-sm bg-white border border-gray-200 rounded-full text-gray-600 cursor-pointer hover:border-food-red hover:text-food-red transition-colors"
              onClick={() => {
                const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
                if (searchInput) {
                  searchInput.value = tag;
                  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
                handleRefetch();
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-gray-600 mb-2">No products match your search criteria</p>
        <p className="text-sm text-gray-500">Try adjusting your filters or search term</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 text-sm text-gray-500">
        Showing {page * PRODUCTS_PER_PAGE + 1}-{Math.min((page + 1) * PRODUCTS_PER_PAGE, itemCount.total)} of {itemCount.total} products
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
        {products.map((product) => (
          <div key={product.id}>
            <ProductCard product={product} />
          </div>
        ))}
      </div>
      
      {totalPages > 1 && (
        <div className="mt-8">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => goToPage(page - 1)}
                  className={page <= 0 ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                />
              </PaginationItem>
              
              {getPageNumbers().map((pageNum, index) => {
                if (pageNum === -1) {
                  return (
                    <PaginationItem key={`ellipsis-${index}`}>
                      <span className="flex h-9 w-9 items-center justify-center">...</span>
                    </PaginationItem>
                  );
                }
                
                return (
                  <PaginationItem key={`page-${pageNum}`}>
                    <PaginationLink 
                      onClick={(e) => {
                        e.preventDefault();
                        goToPage(pageNum);
                      }}
                      isActive={pageNum === page}
                      className="cursor-pointer"
                    >
                      {pageNum + 1}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={(e) => {
                    e.preventDefault(); 
                    goToPage(page + 1);
                  }}
                  className={page >= totalPages - 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </>
  );
});

ProductList.displayName = 'ProductList';

export default ProductList;

import { useState, useEffect, useMemo } from 'react';
import { useTikTokVideos, TikTokVideoProduct } from '@/hooks/useTikTokVideos';
import { useProductFetcher } from '@/hooks/products';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search, Package, X, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TikTokVideoProductPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoId: string;
  videoTitle: string | null;
  currentProducts: TikTokVideoProduct[];
}

const TikTokVideoProductPicker = ({
  open,
  onOpenChange,
  videoId,
  videoTitle,
  currentProducts,
}: TikTokVideoProductPickerProps) => {
  const { updateVideoProducts } = useTikTokVideos();
  const [search, setSearch] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Use the same product fetcher as GlobalProductSearch
  const { data: products = [], isLoading: isLoadingProducts } = useProductFetcher();

  // Initialize with current products and reset search
  useEffect(() => {
    if (open) {
      setSearch('');
      setSelectedProductIds(currentProducts?.map(p => p.id) || []);
    }
  }, [open, currentProducts]);

  // Filter products by search using useMemo like GlobalProductSearch
  const filteredProducts = useMemo(() => {
    if (!search || search.length < 1) {
      return products;
    }
    
    const searchLower = search.toLowerCase();
    return products.filter(product => 
      product.name?.toLowerCase().includes(searchLower) ||
      product.category?.name?.toLowerCase().includes(searchLower) ||
      (product.tags && Array.isArray(product.tags) && 
        product.tags.some(tag => tag.toLowerCase().includes(searchLower)))
    );
  }, [search, products]);

  const toggleProduct = (productId: string) => {
    setSelectedProductIds(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        // Limit to 4 products
        if (prev.length >= 4) {
          return prev;
        }
        return [...prev, productId];
      }
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    console.log('💾 handleSave called:', { videoId, selectedProductIds });
    try {
      await updateVideoProducts.mutateAsync({
        videoId,
        productIds: selectedProductIds,
      });
      console.log('✅ Products saved successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('❌ Failed to update products:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setSearch('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-pink-500" />
            Link Products to Video
          </DialogTitle>
          <DialogDescription>
            {videoTitle ? (
              <>Select products featured in: <strong className="text-foreground">{videoTitle}</strong></>
            ) : (
              'Select up to 4 products to show alongside this video'
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Selected products */}
        {selectedProductIds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedProductIds.map(id => {
              const product = products.find(p => p.id === id);
              if (!product) return null;
              return (
                <Badge
                  key={id}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  {product.name}
                  <button
                    onClick={() => toggleProduct(id)}
                    className="ml-1 hover:bg-gray-200 rounded p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
            <span className="text-xs text-muted-foreground self-center">
              {selectedProductIds.length}/4 selected
            </span>
          </div>
        )}

        {/* Product list */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full max-h-[400px] border rounded-lg">
            {isLoadingProducts ? (
              <div className="flex items-center justify-center h-[200px]">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No products found
              </div>
            ) : (
              <div className="p-2 space-y-1">
              {filteredProducts.map(product => {
                const isSelected = selectedProductIds.includes(product.id);
                const isDisabled = !isSelected && selectedProductIds.length >= 4;
                
                return (
                  <div
                    key={product.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-pink-50 border border-pink-200' 
                        : isDisabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                    onClick={() => !isDisabled && toggleProduct(product.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={isDisabled}
                      onCheckedChange={() => !isDisabled && toggleProduct(product.id)}
                    />
                    
                    {/* Product image */}
                    <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Product info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ${product.price_per_unit.toFixed(2)}
                        {product.is_weighted && product.unit_of_measure && (
                          <span> / {product.unit_of_measure}</span>
                        )}
                        {product.category?.name && (
                          <>
                            <span className="mx-1">•</span>
                            {product.category.name}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              `Save (${selectedProductIds.length} products)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TikTokVideoProductPicker;

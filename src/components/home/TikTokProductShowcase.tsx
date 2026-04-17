import { motion } from 'framer-motion';
import { Package, ExternalLink, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TikTokVideoProduct } from '@/hooks/useTikTokVideos';
import { Link } from 'react-router-dom';
import { useCartItem } from '@/hooks/useCartItem';
import CartItemControls from '@/components/product/CartItemControls';
import AddToCartButton from '@/components/product/AddToCartButton';
import { useCartStore } from '@/stores/cart';
import { useToast } from '@/hooks/use-toast';
import { useUser as useClerkUser, useClerk } from '@clerk/clerk-react';
import { usePostHogTracking } from '@/hooks/usePostHogTracking';
import { useState } from 'react';

interface TikTokProductShowcaseProps {
  products: TikTokVideoProduct[];
  videoTitle?: string | null;
}

const TikTokProductShowcase = ({ products, videoTitle }: TikTokProductShowcaseProps) => {
  const { addToCart, isLoading } = useCartStore();
  const { toast } = useToast();
  const { isSignedIn } = useClerkUser();
  const { openSignIn } = useClerk();
  const { trackProductAddedToCart, trackEvent } = usePostHogTracking();
  const [addingProductId, setAddingProductId] = useState<string | null>(null);

  const handleAddToCart = async (product: TikTokVideoProduct) => {
    // Guest checkout handles signed-out carts; no sign-in gate here.

    trackEvent('tiktok_video_clicked', {
      video_id: product.id,
      video_url: '',
    });

    setAddingProductId(product.id);
    try {
      // For weighted products, add with 1 lb/kg, for non-weighted, weight is undefined
      await addToCart(product.id, product.is_weighted ? 1 : undefined);

      trackProductAddedToCart({
        id: product.id,
        name: product.name,
        price_per_unit: product.price_per_unit,
        category: product.category_id,
        is_weighted: product.is_weighted,
      }, {
        quantity: product.is_weighted ? undefined : 1,
        weight: product.is_weighted ? 1 : undefined,
        fromPage: 'tiktok_showcase',
      });

      toast({
        title: 'Added to cart!',
        description: `${product.name} has been added to your cart`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to add to cart',
        description: 'Please try again',
      });
    } finally {
      setAddingProductId(null);
    }
  };

  // Show placeholder if no products
  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12">
        <div className="bg-gray-100 rounded-full p-4 mb-3">
          <Package className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-base font-semibold text-gray-800 mb-1.5">
          Featured Products Coming Soon
        </h3>
        <p className="text-muted-foreground text-sm max-w-xs mb-4">
          We're linking products to this video. Check back soon!
        </p>
        <Link to="/products">
          <Button
            variant="outline"
            size="sm"
          >
            Browse All Products
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-800">
          Featured in this Video
        </h3>
        {videoTitle && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
            {videoTitle}
          </p>
        )}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {products.slice(0, 4).map((product, index) => {
          const ProductCartControls = () => {
            const { cartItem, isInCart, quantity, weight } = useCartItem(product.id);
            
            return (
              <div className="mt-2">
                {isInCart ? (
                  <CartItemControls
                    productId={product.id}
                    quantity={quantity}
                    weight={weight}
                    isWeighted={product.is_weighted}
                    unitOfMeasure={product.unit_of_measure}
                    pricePerUnit={product.price_per_unit}
                    compact={true}
                  />
                ) : (
                  <AddToCartButton
                    isDisabled={!isSignedIn || isLoading}
                    isLoading={addingProductId === product.id}
                    label="Add to Cart"
                    onClick={() => handleAddToCart(product)}
                    size="sm"
                    showIcon={false}
                  />
                )}
              </div>
            );
          };
          
          return (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-shadow"
          >
            {/* Product Image */}
            <div className="aspect-square relative overflow-hidden bg-gray-50">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                  <ShoppingBag className="h-8 w-8 text-gray-400" />
                </div>
              )}
              
              {/* Price indicator */}
              <div className="absolute top-2 left-2">
                <span className="bg-white/90 backdrop-blur-sm text-gray-900 text-xs font-semibold px-2 py-1 rounded-md shadow-sm">
                  ${product.price_per_unit.toFixed(2)}
                  {product.is_weighted && product.unit_of_measure && `/${product.unit_of_measure}`}
                </span>
              </div>
            </div>

            {/* Product Info */}
            <div className="p-2.5">
              <h4 className="font-medium text-gray-800 text-sm line-clamp-2 mb-1 min-h-[2.5rem]">
                {product.name}
              </h4>
              
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-bold text-food-red text-base">
                    ${product.price_per_unit.toFixed(2)}
                  </span>
                  {product.is_weighted && product.unit_of_measure && (
                    <span className="text-xs text-muted-foreground ml-1">
                      /{product.unit_of_measure}
                    </span>
                  )}
                </div>
              </div>

              <ProductCartControls />
            </div>
          </motion.div>
          );
        })}
      </div>

      {/* View All Products Link */}
      <div className="mt-3 text-center">
        <Link to="/products">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-gray-900 h-8 text-xs"
          >
            View All Products
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default TikTokProductShowcase;

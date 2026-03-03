
import { useState, memo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCartStore } from "@/stores/cart";
import { useToast } from "@/hooks/use-toast";
import { useUser as useClerkUser, useClerk } from "@clerk/clerk-react";
import { Package, Tag, Trash2 } from "lucide-react";
import { memoizationUtils } from "@/stores/cart/operations/memoization";
import { useTaxCalculation } from "@/hooks/useTaxCalculation";
import ProductImage from "./ProductImage";
import WeightSelector from "./WeightSelector";
import QuantitySelector from "./QuantitySelector";
import AddToCartButton from "./AddToCartButton";
import { useCartItem } from "@/hooks/useCartItem";
import CartItemControls from "./CartItemControls";
import { usePostHogTracking } from "@/hooks/usePostHogTracking";
import { useStoreDisplaySettings } from "@/hooks/useStoreDisplaySettings";

interface Product {
  id: string;
  name: string;
  description: string;
  price_per_unit: number;
  inventory_count: number;
  inventory_weight: number;
  image_url?: string;
  is_weighted?: boolean;
  unit_of_measure?: string;
  category?: { id: string; name: string; tax_rate?: number | null } | null;
  brand?: string;
  min_order_value?: number | null;
  min_order_unit?: 'pieces' | 'kg' | 'lbs' | null;
  tax_rate?: number | null;
}

interface ProductCardProps {
  product: Product;
}

// Memoize ProductCard to prevent unnecessary re-renders
const ProductCard = memo(({ product }: ProductCardProps) => {
  const { addToCart, removeFromCart, isLoading } = useCartStore();
  const [isAdding, setIsAdding] = useState(false);
  const { trackProductAddedToCart, trackEvent } = usePostHogTracking();
  const [weight, setWeight] = useState(() => {
    // Set initial weight to minimum if product has minimum weight requirement
    if (product.is_weighted && product.min_order_value && product.min_order_unit && 
        (product.min_order_unit === 'kg' || product.min_order_unit === 'lbs')) {
      return product.min_order_value;
    }
    return 1;
  });
  const [localQuantity, setLocalQuantity] = useState(() => {
    // Set initial quantity to minimum if product has minimum quantity requirement
    if (!product.is_weighted && product.min_order_value && product.min_order_unit === 'pieces') {
      return product.min_order_value;
    }
    return 1;
  });
  const { toast } = useToast();
  const { user, isSignedIn } = useClerkUser();
  const { openSignIn } = useClerk();
  const { cartItem, isInCart, quantity, weight: cartWeight } = useCartItem(product.id);
  const { calculateItemTax, formatTaxRate } = useTaxCalculation();
  const { data: displaySettings } = useStoreDisplaySettings();
  const showTaxOnCards = displaySettings?.showTaxOnCards ?? true;

  // Calculate tax for this product
  const quantityForTax = product.is_weighted ? weight : 1;
  const { itemTaxAmount, hasValidTaxRate } = calculateItemTax(
    product.price_per_unit,
    quantityForTax,
    product.tax_rate || null,
    product.category?.name || ''
  );

  // Update local weight state when cart item weight changes
  useEffect(() => {
    if (isInCart && cartWeight && product.is_weighted) {
      setWeight(cartWeight);
    }
  }, [isInCart, cartWeight, product.is_weighted]);

  // Update local quantity state when cart item quantity changes
  useEffect(() => {
    if (isInCart && quantity && !product.is_weighted) {
      setLocalQuantity(quantity);
    }
  }, [isInCart, quantity, product.is_weighted]);

  // Set Clerk user ID for cart operations
  useEffect(() => {
    if (isSignedIn && user?.id) {
      // Set the Clerk user ID in the cart store's memoization utility
      memoizationUtils.setClerkUserId(user.id);
    } else {
      // Clear user ID when signed out
      memoizationUtils.setClerkUserId(null);
    }
  }, [isSignedIn, user?.id]);

  const handleAddToCart = async () => {
    // SECURITY: Check Clerk authentication before adding to cart
    if (!isSignedIn || !user?.id) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to add items to your cart",
        variant: "default",
      });
      // Open Clerk sign-in modal
      openSignIn();
      return;
    }

    // Validate minimum order requirements before adding
    if (hasMinimumOrder) {
      if (product.min_order_unit === 'pieces' && localQuantity < product.min_order_value!) {
        toast({
          title: "Minimum order not met",
          description: `This item requires a minimum order of ${product.min_order_value} ${product.min_order_unit}`,
          variant: "destructive",
        });
        return;
      }
      
      if ((product.min_order_unit === 'kg' || product.min_order_unit === 'lbs') && 
          product.is_weighted && weight < product.min_order_value!) {
        toast({
          title: "Minimum order not met",
          description: `This item requires a minimum order of ${product.min_order_value} ${product.min_order_unit}`,
          variant: "destructive",
        });
        return;
      }
    }

    setIsAdding(true);
    try {
      await addToCart(
        product.id,
        product.is_weighted ? weight : undefined,
        product.is_weighted ? undefined : localQuantity
      );
      
      trackProductAddedToCart(product, {
        quantity: product.is_weighted ? undefined : localQuantity,
        weight: product.is_weighted ? weight : undefined,
        fromPage: window.location.pathname,
      });
      
      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart`,
      });
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast({
        variant: "destructive",
        title: "Failed to add item",
        description: "Please try again",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleWeightChange = (newWeight: number) => {
    setWeight(newWeight);
  };

  const buttonLabel = "Add to Cart";

  const isDisabled = isAdding || isLoading;
  const totalPrice = product.is_weighted ? (weight * product.price_per_unit) : product.price_per_unit;

  // Calculate minimum order price if applicable
  const hasMinimumOrder = product.min_order_value && product.min_order_unit;
  const minimumOrderPrice = hasMinimumOrder 
    ? product.min_order_value * product.price_per_unit 
    : null;

  return (
    <Card className="group relative flex flex-col h-full min-h-[420px] overflow-hidden bg-white border-2 hover:border-food-red/50 hover:shadow-lg transition-all duration-300">
      {/* Minimum Order Badge */}
      {hasMinimumOrder && (
        <div className="absolute top-2 left-2 z-10">
          <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs">
            Min: {product.min_order_value} {product.min_order_unit}
          </Badge>
        </div>
      )}
      
      {/* Product Image */}
      <div className="relative overflow-hidden flex-shrink-0">
        <ProductImage 
          imageUrl={product.image_url} 
          alt={product.name} 
        />
      </div>

      {/* Product Info */}
      <div className="flex-1 flex flex-col min-h-0">
        <CardHeader className="p-3 md:p-4 pb-1 flex-shrink-0">
          <CardTitle className="line-clamp-3 text-sm md:text-base font-semibold leading-tight min-h-[2.5rem]">
            {product.name}
          </CardTitle>
          {product.brand && (
            <CardDescription className="text-xs mt-1 flex items-center">
              <Package className="mr-1 h-3 w-3" />
              {product.brand}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="p-3 md:p-4 pt-1 flex-1 flex flex-col min-h-[140px]">
          <div className="mb-1 flex-shrink-0">
            {product.is_weighted ? (
              <div className="space-y-0.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-xl md:text-2xl font-bold text-food-red">
                    ${product.price_per_unit.toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    / {product.unit_of_measure || 'lb'}
                  </span>
                </div>
                {weight > 0 && showTaxOnCards && (
                  <div className="space-y-0.5">
                    {hasValidTaxRate && itemTaxAmount > 0 && (
                      <p className="text-xs text-amber-600">
                        + Tax: ${itemTaxAmount.toFixed(2)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-0.5">
                <span className="text-xl md:text-2xl font-bold text-food-red">
                  ${product.price_per_unit.toFixed(2)}
                </span>
                {showTaxOnCards && hasValidTaxRate && itemTaxAmount > 0 && (
                  <p className="text-xs text-amber-600">
                    + Tax: ${itemTaxAmount.toFixed(2)}
                  </p>
                )}
                {hasMinimumOrder && minimumOrderPrice && (
                  <p className="text-xs text-muted-foreground">
                    Starting from ${minimumOrderPrice.toFixed(2)} ({product.min_order_value} {product.min_order_unit})
                  </p>
                )}
              </div>
            )}
          </div>

          <Separator className="my-2 flex-shrink-0" />
          
          <div className="mt-auto">
            {/* Weight Selector for Weighted Items */}
            {product.is_weighted ? (
              isInCart ? (
                // Use CartItemControls when item is already in cart
                <div className="mt-2">
                  <CartItemControls
                    productId={product.id}
                    quantity={1}
                    weight={cartWeight || weight}
                    isWeighted={true}
                    pricePerUnit={product.price_per_unit}
                    minOrderValue={product.min_order_value}
                    minOrderUnit={product.min_order_unit}
                    unitOfMeasure={product.unit_of_measure}
                    compact={false}
                  />
                </div>
              ) : (
                // Use WeightSelector when item is NOT in cart
                <div className="mt-2">
                  <WeightSelector
                    productId={product.id}
                    weight={weight}
                    unitOfMeasure={product.unit_of_measure}
                    pricePerUnit={product.price_per_unit}
                    onWeightChange={handleWeightChange}
                  />
                </div>
              )
            ) : (
              /* Quantity Selector for Non-Weighted Items */
              isInCart ? (
                // Use CartItemControls when item is already in cart
                <div className="mt-2">
                  <CartItemControls
                    productId={product.id}
                    quantity={quantity || localQuantity}
                    isWeighted={false}
                    pricePerUnit={product.price_per_unit}
                    minOrderValue={product.min_order_value}
                    minOrderUnit={product.min_order_unit}
                    compact={false}
                  />
                </div>
              ) : (
                // Use QuantitySelector when item is NOT in cart
                <div className="mt-2">
                  <QuantitySelector
                    productId={product.id}
                    quantity={localQuantity}
                    pricePerUnit={product.price_per_unit}
                    minOrderValue={product.min_order_value}
                    minOrderUnit={product.min_order_unit}
                    onQuantityChange={setLocalQuantity}
                  />
                </div>
              )
            )}
          </div>
        </CardContent>
      </div>

      {/* Footer with Add to Cart Button */}
      <CardFooter className="p-3 md:p-4 pt-0 flex-shrink-0">
        {isInCart ? (
          <Button 
            variant="outline" 
            size="default"
            className="w-full group/remove hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
            onClick={() => {
              removeFromCart(product.id);
              toast({
                title: "Removed from cart",
                description: `${product.name} has been removed from your cart`,
              });
            }}
          >
            <span className="group-hover/remove:hidden">
              <Badge variant="outline" className="text-sm font-normal border-0">
                ✓ In Cart
              </Badge>
            </span>
            <span className="hidden group-hover/remove:flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Remove from Cart
            </span>
          </Button>
        ) : (
          <AddToCartButton
            isDisabled={isDisabled}
            isLoading={isAdding}
            label={buttonLabel}
            onClick={handleAddToCart}
          />
        )}
      </CardFooter>
    </Card>
  );
});

// Add displayName for better debugging
ProductCard.displayName = 'ProductCard';

export default ProductCard;

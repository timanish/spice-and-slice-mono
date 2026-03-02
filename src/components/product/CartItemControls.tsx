import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Minus, Weight, Trash2 } from "lucide-react";
import { useCartStore } from "@/stores/cart";
import { usePostHogTracking } from "@/hooks/usePostHogTracking";

interface CartItemControlsProps {
  productId: string;
  quantity: number;
  weight?: number;
  isWeighted?: boolean;
  unitOfMeasure?: string;
  pricePerUnit: number;
  showRemove?: boolean;
  compact?: boolean;
  minOrderValue?: number | null;
  minOrderUnit?: 'pieces' | 'kg' | 'lbs' | null;
}

const CartItemControls = ({ 
  productId, 
  quantity, 
  weight, 
  isWeighted, 
  unitOfMeasure, 
  pricePerUnit,
  showRemove = false,
  compact = false,
  minOrderValue,
  minOrderUnit
}: CartItemControlsProps) => {
  const { updateQuantity, updateWeight, removeFromCart } = useCartStore();
  const { trackEvent } = usePostHogTracking();

  // Determine minimum allowed value
  const hasMinimum = minOrderValue && minOrderUnit;
  const minimumQuantity = hasMinimum && minOrderUnit === 'pieces' ? minOrderValue : 1;
  const minimumWeight = hasMinimum && (minOrderUnit === 'kg' || minOrderUnit === 'lbs') 
    ? minOrderValue 
    : 0.5;

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity <= 0) {
      trackEvent('cart_item_removed', {
        product_id: productId,
        product_name: 'Unknown', 
      });
      removeFromCart(productId);
    } else {
      updateQuantity(productId, newQuantity);
    }
  };

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWeight = parseFloat(e.target.value);
    if (newWeight >= minimumWeight) {
      updateWeight(productId, newWeight);
    }
  };

  const incrementWeight = () => {
    if (weight) {
      const step = minOrderUnit === 'kg' ? 1 : 0.5;
      const newWeight = Math.round((weight + step) * 100) / 100;
      updateWeight(productId, newWeight);
    }
  };

  const decrementWeight = () => {
    if (weight) {
      const step = minOrderUnit === 'kg' ? 1 : 0.5;
      const newWeight = Math.round((weight - step) * 100) / 100;
      
      // If new weight would be below minimum (or 0), remove from cart
      if (newWeight < minimumWeight || newWeight <= 0) {
        trackEvent('cart_item_removed', {
          product_id: productId,
          product_name: 'Unknown',
        });
        removeFromCart(productId);
      } else {
        updateWeight(productId, newWeight);
      }
    }
  };

  const itemTotal = isWeighted && weight
    ? weight * pricePerUnit
    : quantity * pricePerUnit;

  if (isWeighted && weight) {
    const isBelowMinimum = hasMinimum && weight < minimumWeight;
    
    return (
      <div className={`space-y-2 ${compact ? 'text-sm' : ''}`}>
        {isBelowMinimum && (
          <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
            ⚠️ Minimum: {minimumWeight} {minOrderUnit}
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Weight className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} mr-1 text-muted-foreground`} />
            <span className="text-muted-foreground">Weight:</span>
          </div>
          <span className="font-medium">${itemTotal.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="outline" 
            size="icon"
            className={compact ? "h-6 w-6 p-0" : "h-8 w-8 p-0"}
            onClick={decrementWeight}
          >
            <Minus className={compact ? "h-3 w-3" : "h-4 w-4"} />
          </Button>
          <Input
            type="number"
            min={minimumWeight}
            step={minOrderUnit === 'kg' ? 1 : 0.5}
            value={weight}
            onChange={handleWeightChange}
            className={compact ? "w-14 h-6 px-1 text-center text-xs" : "w-16 h-8 px-2 text-center"}
          />
          <Button 
            variant="outline" 
            size="icon"
            className={compact ? "h-6 w-6 p-0" : "h-8 w-8 p-0"}
            onClick={incrementWeight}
          >
            <Plus className={compact ? "h-3 w-3" : "h-4 w-4"} />
          </Button>
          <span className="text-xs text-muted-foreground ml-1">
            {unitOfMeasure || 'lb'}
          </span>
          {showRemove && (
            <Button
              variant="destructive"
              size="icon"
              className={compact ? "h-6 w-6 p-0 ml-2" : "h-8 w-8 p-0 ml-2"}
              onClick={() => removeFromCart(productId)}
            >
              <Trash2 className={compact ? "h-3 w-3" : "h-4 w-4"} />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${compact ? 'text-sm' : ''}`}>
      {hasMinimum && minOrderUnit === 'pieces' && quantity < minimumQuantity && (
        <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          ⚠️ Minimum: {minimumQuantity} pieces
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Quantity:</span>
      </div>
      <div className="flex items-center justify-center gap-2 w-full">
        <Button
          variant="outline"
          size="icon"
          className={compact ? "h-6 w-6 p-0" : "h-9 w-9 p-0"}
          onClick={() => handleQuantityChange(quantity - 1)}
          disabled={hasMinimum && minOrderUnit === 'pieces' && quantity <= minimumQuantity}
        >
          <Minus className={compact ? "h-3 w-3" : "h-4 w-4"} />
        </Button>
        <span className={`${compact ? 'text-sm px-3' : 'text-base px-4'} min-w-12 text-center font-medium`}>
          {quantity}
        </span>
        <Button
          variant="outline"
          size="icon"
          className={compact ? "h-6 w-6 p-0" : "h-9 w-9 p-0"}
          onClick={() => handleQuantityChange(quantity + 1)}
        >
          <Plus className={compact ? "h-3 w-3" : "h-4 w-4"} />
        </Button>
        {showRemove && (
          <Button
            variant="destructive"
            size="icon"
            className={compact ? "h-6 w-6 p-0 ml-2" : "h-9 w-9 p-0 ml-2"}
            onClick={() => removeFromCart(productId)}
          >
            <Trash2 className={compact ? "h-3 w-3" : "h-4 w-4"} />
          </Button>
        )}
      </div>
    </div>
  );
};

export default CartItemControls;

import React, { useState, useEffect } from 'react';
import { useCartStore } from '@/stores/cart';
import { useUser as useClerkUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import CartItemList from './cart-content/CartItemList';
import CartError from './CartError';
import EmptyCart from './cart-content/EmptyCart';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface CartContentProps {
  onClose: () => void;
}

const CartContent: React.FC<CartContentProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const { items, comboItems, removeFromCart, updateQuantity, removeCombo, updateComboQuantity, isLoading, hasError, errorMessage, retryFetchCart } = useCartStore();
  const [isRateLimited, setIsRateLimited] = useState(false);
  
  // Calculate subtotal with discounts
  const subtotal = items.reduce((sum, item) => {
    const basePrice = item.product.is_weighted && item.weight
      ? item.weight * item.product.price_per_unit
      : item.quantity * item.product.price_per_unit;

    // Apply discount if present
    const discount = item.discount_percentage || 0;
    const finalPrice = basePrice * (1 - discount / 100);

    return sum + finalPrice;
  }, 0);

  // Calculate combo subtotal
  const comboSubtotal = comboItems.reduce((sum, item) => {
    const addonTotal = item.combo.items
      .filter((ci) => ci.is_addon && item.selected_addon_ids.includes(ci.id))
      .reduce((s, ci) => s + (ci.addon_price || 0), 0);
    return sum + (item.combo.combo_price + addonTotal) * item.quantity;
  }, 0);

  const totalSubtotal = subtotal + comboSubtotal;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  const handleGoToCheckout = () => {
    onClose();
    navigate('/checkout');
  };
  
  // Check if the error is related to rate limiting
  useEffect(() => {
    if (errorMessage?.includes('Too many API requests') || errorMessage?.includes('rate limit')) {
      setIsRateLimited(true);
    } else {
      setIsRateLimited(false);
    }
  }, [errorMessage]);

  // Show error if there is one
  if (hasError) {
    return (
      <div className="p-4">
        <CartError 
          errorMessage={errorMessage} 
          retryFetch={retryFetchCart}
          isRateLimited={isRateLimited}
        />
        <EmptyCart onClose={onClose} />
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
        <p className="text-gray-600">Loading your cart...</p>
      </div>
    );
  }

  if (items.length === 0 && comboItems.length === 0) {
    return <EmptyCart onClose={onClose} />;
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-auto">
        <CartItemList
          items={items}
          comboItems={comboItems}
          onRemoveItem={removeFromCart}
          onUpdateQuantity={updateQuantity}
          onRemoveCombo={removeCombo}
          onUpdateComboQuantity={updateComboQuantity}
        />
      </div>
      
      <div className="border-t-2 p-6 bg-white shadow-lg">
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center pt-3">
              <p className="text-lg font-bold text-gray-900">Total</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalSubtotal)}</p>
            </div>
          </div>
          
          <Button 
            className="w-full h-12 text-base font-semibold bg-food-red hover:bg-food-red/90 shadow-lg hover:shadow-xl transition-all group"
            disabled={items.length === 0 && comboItems.length === 0}
            onClick={handleGoToCheckout}
          >
            <span className="flex items-center gap-2">
              Proceed to Checkout
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </Button>
          
          <p className="text-xs text-gray-500 text-center">
            Discounts and payment options on next page
          </p>
        </div>
      </div>
    </div>
  );
};

export default CartContent;

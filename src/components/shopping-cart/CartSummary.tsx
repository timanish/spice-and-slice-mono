import React from 'react';
import { Button } from "@/components/ui/button";
import { CartItem } from '@/stores/cart';

interface CartSummaryProps {
  items: CartItem[];
  onCheckout: () => void;
  isCheckingOut: boolean;
  paymentMethod: 'card' | 'cash';
  discount?: number;
}

const CartSummary: React.FC<CartSummaryProps> = ({ 
  items, 
  onCheckout, 
  isCheckingOut,
  paymentMethod,
  discount = 0
}) => {
  // Calculate the base subtotal, accounting for weighted items
  const subtotal = items.reduce((sum, item) => {
    // If it's a weighted item, calculate by weight
    if (item.product.is_weighted && item.weight) {
      return sum + (item.weight * item.product.price_per_unit);
    }
    // Otherwise calculate by quantity
    return sum + (item.quantity * item.product.price_per_unit);
  }, 0);

  // Calculate total after discount
  const total = Math.max(subtotal - discount, 0);
  
  // Format as currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <p className="text-gray-600">Subtotal</p>
          <p className="font-semibold text-gray-900">{formatCurrency(subtotal)}</p>
        </div>

        {discount > 0 && (
          <div className="flex justify-between items-center text-green-600">
            <p className="font-medium">Discount</p>
            <p className="font-semibold">-{formatCurrency(discount)}</p>
          </div>
        )}
        
        <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300">
          <p className="text-lg font-bold text-gray-900">Total</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</p>
        </div>
      </div>
      
      <Button 
        className="w-full h-12 text-base font-semibold bg-food-red hover:bg-food-red/90 shadow-lg hover:shadow-xl transition-all"
        disabled={items.length === 0 || isCheckingOut}
        onClick={onCheckout}
      >
        {isCheckingOut ? (
          <span className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            Processing...
          </span>
        ) : (
          `Checkout via ${paymentMethod === 'card' ? 'Credit Card' : 'Cash on Delivery'}`
        )}
      </Button>
    </div>
  );
};

export default CartSummary;

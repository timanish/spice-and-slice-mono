
import React, { useState, useEffect, useRef } from 'react';
import { useCartStore } from '@/stores/cart';
import { useUser as useClerkUser } from '@clerk/clerk-react';
import { supabase } from '@/integrations/supabase/client';
import CartItemList from './CartItemList';
import CartDeliverySection from './CartDeliverySection';
import PaymentMethodSelector from './PaymentMethodSelector';
import CartPromoSection from './CartPromoSection';
import CartSummary from '../CartSummary';
import EmptyCart from './EmptyCart';
import { useCheckout } from './useCheckout';
import CartError from '../CartError';

interface CartContentProps {
  onClose: () => void;
  paymentMethod: 'card' | 'cash';
  setPaymentMethod: (method: 'card' | 'cash') => void;
  isCheckingOut: boolean;
  handleCheckout: () => Promise<void>;
}

const CartContent: React.FC<CartContentProps> = ({ 
  onClose, 
  paymentMethod, 
  setPaymentMethod,
  isCheckingOut,
  handleCheckout
}) => {
  const { items, removeFromCart, updateQuantity, updateWeight, isLoading, hasError, errorMessage, retryFetchCart } = useCartStore();
  const { user, isSignedIn } = useClerkUser();
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoId, setPromoId] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  
  const {
    profileComplete,
    setProfileComplete,
    subtotal
  } = useCheckout();
  
  // Check if the error is related to rate limiting
  useEffect(() => {
    if (errorMessage?.includes('Too many API requests') || errorMessage?.includes('rate limit')) {
      setIsRateLimited(true);
    } else {
      setIsRateLimited(false);
    }
  }, [errorMessage]);
  
  // Calculate final total after discount
  const total = Math.max(subtotal - promoDiscount, 0);

  const handleApplyPromoCode = async (code: string) => {
    if (!code) return;
    
    // If a promo code is already applied, show an error
    if (promoDiscount > 0 || promoId) {
      return;
    }

    try {
      if (!user) {
        return;
      }

      // Convert code to lowercase for case-insensitive comparison
      const normalizedCode = code.trim().toLowerCase();

      const { data, error } = await supabase.rpc('validate_promo_code', {
        _code: normalizedCode,
        _user_id: user.id,
        _order_amount: subtotal
      });

      if (error) throw error;

      if (data && data[0]) {
        const result = data[0];
        
        if (result.valid) {
          setPromoDiscount(result.discount);
          setPromoId(result.promo_id);
        }
      }
    } catch (error) {
      console.error('Error applying promo code:', error instanceof Error ? error.message : 'Unknown error');
    }
  };

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

  if (items.length === 0) {
    return <EmptyCart onClose={onClose} />;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <CartItemList 
          items={items}
          onRemoveItem={removeFromCart}
          onUpdateQuantity={updateQuantity}
        />
        
        <CartDeliverySection />
        <PaymentMethodSelector 
          paymentMethod={paymentMethod} 
          setPaymentMethod={setPaymentMethod} 
        />
        
        <CartPromoSection 
          subtotal={subtotal}
          onApplyPromo={handleApplyPromoCode}
          showProfileWarning={!profileComplete && !!user}
        />
      </div>
      
      <div className="border-t p-4 bg-gray-50">
        <CartSummary 
          items={items}
          onCheckout={handleCheckout}
          isCheckingOut={isCheckingOut}
          paymentMethod={paymentMethod}
          discount={promoDiscount}
        />
      </div>
    </div>
  );
};

export default CartContent;

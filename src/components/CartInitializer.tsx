import { useEffect } from 'react';
import { useCartStore } from '@/stores/cart';
import { useUser } from '@clerk/clerk-react';
import { memoizationUtils } from '@/stores/cart/operations/memoization';

/**
 * CartInitializer component - Fetches cart data on app load
 * This ensures the cart is populated before any page renders
 */
export const CartInitializer = () => {
  const fetchCart = useCartStore((state) => state.fetchCart);
  const { user, isSignedIn, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && isSignedIn && user?.id) {
      memoizationUtils.setClerkUserId(user.id);
      fetchCart();
    } else if (isLoaded && !isSignedIn) {
      memoizationUtils.setClerkUserId(null);
    }
  }, [isLoaded, isSignedIn, user?.id]); 

  return null;
};

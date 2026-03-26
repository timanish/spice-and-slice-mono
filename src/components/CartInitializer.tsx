import { useEffect } from 'react';
import { useCartStore } from '@/stores/cart';
import { clearCartStorage } from '@/stores/cart/store';
import { useUser } from '@clerk/clerk-react';
import { memoizationUtils } from '@/stores/cart/operations/memoization';

/**
 * CartInitializer component - Fetches cart data on app load.
 * Cart is hydrated from localStorage instantly (no flash),
 * then synced with the server in the background.
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
      clearCartStorage();
    }
  }, [isLoaded, isSignedIn, user?.id]);

  return null;
};

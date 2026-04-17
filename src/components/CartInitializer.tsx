import { useEffect } from 'react';
import { useCartStore } from '@/stores/cart';
import { useUser } from '@clerk/clerk-react';
import { memoizationUtils } from '@/stores/cart/operations/memoization';

/**
 * CartInitializer component - Fetches cart data on app load.
 * Cart is hydrated from localStorage instantly (no flash), then synced with
 * the server for signed-in users. Signed-out users keep a localStorage-only
 * cart that drives guest checkout; on sign-in, fetchCart overwrites with
 * server state so cross-user contamination is impossible.
 */
export const CartInitializer = () => {
  const fetchCart = useCartStore((state) => state.fetchCart);
  const { user, isSignedIn, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && user?.id) {
      memoizationUtils.setClerkUserId(user.id);
      fetchCart();
    } else {
      memoizationUtils.setClerkUserId(null);
      // Release the initial isLoading flag so Add-to-Cart activates for
      // signed-out users (fetchCart never runs for guests — no server cart).
      useCartStore.setState({ isLoading: false });
    }
  }, [isLoaded, isSignedIn, user?.id]);

  return null;
};

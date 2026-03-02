import { CartStoreState } from "../store";
import { OPERATION_TIMEOUT, CartItem } from "../types";
import { createTimeout, fetchCartViaEdge } from "../utils";
import { memoizationUtils } from "./memoization";

export const fetchCart = async (
  set: (state: Partial<CartStoreState>) => void,
  get: () => CartStoreState,
  forceRefresh: boolean = false,
) => {
  try {
    set({ isLoading: true, hasError: false, errorMessage: null });

    const userId = memoizationUtils.getCurrentUserId();
    const cacheKey = `cart-items-${userId}`;

    // Check memoized cache
    if (!forceRefresh) {
      const cached = memoizationUtils.getMemoizedResult(cacheKey);
      if (cached) {
        set({ items: cached as CartItem[], isLoading: false });
        return;
      }
    }

    // Fetch from edge function with timeout
    const items = (await Promise.race([
      fetchCartViaEdge(),
      createTimeout(OPERATION_TIMEOUT),
    ])) as CartItem[];

    memoizationUtils.storeMemoizedResult(cacheKey, items);
    set({ items, isLoading: false });
  } catch (error: any) {
    console.error("Error in fetchCart:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to load your cart";
    set({
      isLoading: false,
      hasError: true,
      errorMessage,
      items: [],
    });
  }
};

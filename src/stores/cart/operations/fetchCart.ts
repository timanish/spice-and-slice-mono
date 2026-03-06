import { CartStoreState } from "../store";
import { OPERATION_TIMEOUT, CartItem, CartComboItem } from "../types";
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
        const cachedData = cached as { items: CartItem[]; comboItems: CartComboItem[] };
        set({
          items: cachedData.items || (cached as CartItem[]),
          comboItems: cachedData.comboItems || [],
          isLoading: false,
        });
        return;
      }
    }

    // Fetch from edge function with timeout
    const result = (await Promise.race([
      fetchCartViaEdge(),
      createTimeout(OPERATION_TIMEOUT),
    ])) as any;

    // Support both old format (CartItem[]) and new format ({ items, comboItems })
    let items: CartItem[];
    let comboItems: CartComboItem[] = [];

    if (Array.isArray(result)) {
      items = result;
    } else {
      items = result.items || [];
      comboItems = result.comboItems || [];
    }

    memoizationUtils.storeMemoizedResult(cacheKey, { items, comboItems });
    set({ items, comboItems, isLoading: false });
  } catch (error: any) {
    console.error("Error in fetchCart:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to load your cart";
    set({
      isLoading: false,
      hasError: true,
      errorMessage,
      items: [],
      comboItems: [],
    });
  }
};

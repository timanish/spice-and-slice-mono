import { fetchWithAuth } from "@/lib/auth-token";
import { CartStoreState } from "../store";
import { fetchCart } from "./fetchCart";
import { memoizationUtils } from "./memoization";

export const addToCart = async (
  productId: string,
  set: (state: Partial<CartStoreState>) => void,
  get: () => CartStoreState,
  weight?: number,
  quantity?: number,
  discountPercentage?: number,
  flashDealId?: string,
) => {
  try {
    set({ isLoading: true, hasError: false, errorMessage: null });

    // Clear cache so next fetch is fresh
    const userId = memoizationUtils.getCurrentUserId();
    memoizationUtils.clearMemoizedResult(`cart-items-${userId}`);

    // Optimistic update for existing items
    const currentItems = [...get().items];
    const existingIdx = currentItems.findIndex(
      (item) => item.product_id === productId,
    );

    if (existingIdx >= 0) {
      const updated = [...currentItems];
      const item = updated[existingIdx];
      if (weight !== undefined) {
        updated[existingIdx] = { ...item, weight };
      } else {
        updated[existingIdx] = {
          ...item,
          quantity: item.quantity + (quantity || 1),
        };
      }
      set({ items: updated });
    }

    // Call edge function
    const res = await fetchWithAuth("user-data", {
      action: "cart.addItem",
      product_id: productId,
      quantity: quantity || 1,
      weight: weight ?? null,
      discount_percentage: discountPercentage || null,
      flash_deal_id: flashDealId || null,
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || "Failed to add item to cart");
    }

    // Fetch fresh cart data
    await fetchCart(set, get);
  } catch (error) {
    console.error("Error adding to cart:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to add item to cart";
    set({
      isLoading: false,
      hasError: true,
      errorMessage,
    });

    // Revert by fetching fresh data
    await fetchCart(set, get);
  } finally {
    set({ isLoading: false });
  }
};

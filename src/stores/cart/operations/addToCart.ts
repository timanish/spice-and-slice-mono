import { fetchWithAuth } from "@/lib/auth-token";
import { CartStoreState } from "../store";
import { CartItem } from "../types";
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
  // Optimistic update — instant UI feedback
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
    set({ items: updated, hasError: false, errorMessage: null });
  } else {
    set({ hasError: false, errorMessage: null });
  }

  // Server sync in background — don't block UI
  syncAddToCart(productId, set, get, weight, quantity, discountPercentage, flashDealId);
};

async function syncAddToCart(
  productId: string,
  set: (state: Partial<CartStoreState>) => void,
  get: () => CartStoreState,
  weight?: number,
  quantity?: number,
  discountPercentage?: number,
  flashDealId?: string,
) {
  try {
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

    // Use the full cart returned by the edge function — no second round-trip
    if (json.data && Array.isArray(json.data)) {
      const userId = memoizationUtils.getCurrentUserId();
      memoizationUtils.storeMemoizedResult(`cart-items-${userId}`, json.data);
      set({ items: json.data as CartItem[] });
    }
  } catch (error) {
    console.error("Error adding to cart:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to add item to cart";
    set({ hasError: true, errorMessage });

    // Revert optimistic update by fetching server state
    await fetchCart(set, get, true);
  }
}

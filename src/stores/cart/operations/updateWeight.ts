import { fetchWithAuth } from "@/lib/auth-token";
import { CartStoreState } from "../store";
import { fetchCart } from "./fetchCart";
import { memoizationUtils } from "./memoization";

export const updateWeight = async (
  productId: string,
  weight: number,
  set: (state: Partial<CartStoreState>) => void,
  get: () => CartStoreState,
) => {
  try {
    set({ hasError: false, errorMessage: null });

    // Optimistic update
    const updatedItems = get().items.map((item) =>
      item.product_id === productId ? { ...item, weight } : item,
    );
    set({ items: updatedItems });

    // Clear cache
    const userId = memoizationUtils.getCurrentUserId();
    memoizationUtils.clearMemoizedResult(`cart-items-${userId}`);

    // Find the cart item id
    const item = get().items.find((i) => i.product_id === productId);
    if (!item?.id) return;

    // Guest cart is localStorage-only; optimistic update is all we need.
    if (memoizationUtils.isAnonymousUser()) return;

    const res = await fetchWithAuth("user-data", {
      action: "cart.updateWeight",
      id: item.id,
      weight,
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || "Failed to update weight");
    }
  } catch (error) {
    console.error("Error updating weight:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update weight";
    set({
      hasError: true,
      errorMessage,
    });

    // Revert
    await fetchCart(set, get);
  }
};

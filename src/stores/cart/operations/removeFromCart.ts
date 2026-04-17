import { fetchWithAuth } from "@/lib/auth-token";
import { CartStoreState } from "../store";
import { fetchCart } from "./fetchCart";
import { memoizationUtils } from "./memoization";

export const removeFromCart = async (
  productId: string,
  set: (state: Partial<CartStoreState>) => void,
  get: () => CartStoreState,
) => {
  try {
    set({ hasError: false, errorMessage: null });

    // Find the cart item id for this product
    const item = get().items.find((i) => i.product_id === productId);

    // Optimistic update
    const updatedItems = get().items.filter(
      (i) => i.product_id !== productId,
    );
    set({ items: updatedItems });

    // Clear cache
    const userId = memoizationUtils.getCurrentUserId();
    memoizationUtils.clearMemoizedResult(`cart-items-${userId}`);

    if (!item?.id) {
      // No server-side item to remove, optimistic update is enough
      return;
    }

    // Guest cart is localStorage-only — no server row to delete.
    if (memoizationUtils.isAnonymousUser()) {
      return;
    }

    const res = await fetchWithAuth("user-data", {
      action: "cart.removeItem",
      id: item.id,
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || "Failed to remove item");
    }
  } catch (error) {
    console.error("Error removing from cart:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to remove item from cart";
    set({
      hasError: true,
      errorMessage,
    });

    // Revert optimistic update
    await fetchCart(set, get);
  }
};

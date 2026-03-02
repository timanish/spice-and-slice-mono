import { fetchWithAuth } from "@/lib/auth-token";
import { CartStoreState } from "../store";
import { removeFromCart } from "./removeFromCart";
import { fetchCart } from "./fetchCart";
import { memoizationUtils } from "./memoization";

export const updateQuantity = async (
  productId: string,
  quantity: number,
  set: (state: Partial<CartStoreState>) => void,
  get: () => CartStoreState,
) => {
  try {
    set({ hasError: false, errorMessage: null });

    // Optimistic update
    const updatedItems = get()
      .items.map((item) =>
        item.product_id === productId ? { ...item, quantity } : item,
      )
      .filter((item) => item.quantity > 0);
    set({ items: updatedItems });

    // Clear cache
    const userId = memoizationUtils.getCurrentUserId();
    memoizationUtils.clearMemoizedResult(`cart-items-${userId}`);

    if (quantity <= 0) {
      await removeFromCart(productId, set, get);
      return;
    }

    // Find the cart item id
    const item = get().items.find((i) => i.product_id === productId);
    if (!item?.id) return;

    const res = await fetchWithAuth("user-data", {
      action: "cart.updateQuantity",
      id: item.id,
      quantity,
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || "Failed to update quantity");
    }
  } catch (error) {
    console.error("Error updating quantity:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update quantity";
    set({
      hasError: true,
      errorMessage,
    });

    // Revert
    await fetchCart(set, get);
  }
};

import { fetchWithAuth } from "@/lib/auth-token";
import { CartStoreState } from "../store";
import { CartComboItem } from "../types";
import { fetchCart } from "./fetchCart";
import { memoizationUtils } from "./memoization";

export const addCombo = async (
  comboId: string,
  selectedAddonIds: string[],
  set: (state: Partial<CartStoreState>) => void,
  get: () => CartStoreState,
) => {
  try {
    set({ hasError: false, errorMessage: null });

    // Clear cache
    const userId = memoizationUtils.getCurrentUserId();
    memoizationUtils.clearMemoizedResult(`cart-items-${userId}`);

    const res = await fetchWithAuth("user-data", {
      action: "cart.addCombo",
      combo_id: comboId,
      selected_addon_ids: selectedAddonIds,
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || "Failed to add combo to cart");
    }

    // Refresh cart to get the full updated state
    await fetchCart(set, get, true);
  } catch (error) {
    console.error("Error adding combo to cart:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to add combo to cart";
    set({ hasError: true, errorMessage });

    // Revert by fetching server state
    await fetchCart(set, get, true);
  }
};

export const removeCombo = async (
  cartComboItemId: string,
  set: (state: Partial<CartStoreState>) => void,
  get: () => CartStoreState,
) => {
  // Optimistic update
  const previousComboItems = [...get().comboItems];
  const updatedComboItems = previousComboItems.filter(
    (item) => item.id !== cartComboItemId,
  );
  set({ comboItems: updatedComboItems, hasError: false, errorMessage: null });

  // Clear cache
  const userId = memoizationUtils.getCurrentUserId();
  memoizationUtils.clearMemoizedResult(`cart-items-${userId}`);

  try {
    const res = await fetchWithAuth("user-data", {
      action: "cart.removeCombo",
      id: cartComboItemId,
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || "Failed to remove combo from cart");
    }
  } catch (error) {
    console.error("Error removing combo from cart:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to remove combo from cart";
    set({
      hasError: true,
      errorMessage,
      comboItems: previousComboItems,
    });

    // Revert optimistic update
    await fetchCart(set, get, true);
  }
};

export const updateComboQuantity = async (
  cartComboItemId: string,
  quantity: number,
  set: (state: Partial<CartStoreState>) => void,
  get: () => CartStoreState,
) => {
  if (quantity <= 0) {
    await removeCombo(cartComboItemId, set, get);
    return;
  }

  // Optimistic update
  const previousComboItems = [...get().comboItems];
  const updatedComboItems = previousComboItems.map((item) =>
    item.id === cartComboItemId ? { ...item, quantity } : item,
  );
  set({ comboItems: updatedComboItems, hasError: false, errorMessage: null });

  // Clear cache
  const userId = memoizationUtils.getCurrentUserId();
  memoizationUtils.clearMemoizedResult(`cart-items-${userId}`);

  try {
    const res = await fetchWithAuth("user-data", {
      action: "cart.updateComboQuantity",
      id: cartComboItemId,
      quantity,
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || "Failed to update combo quantity");
    }
  } catch (error) {
    console.error("Error updating combo quantity:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to update combo quantity";
    set({
      hasError: true,
      errorMessage,
      comboItems: previousComboItems,
    });

    // Revert optimistic update
    await fetchCart(set, get, true);
  }
};

export const toggleComboAddon = async (
  cartComboItemId: string,
  addonId: string,
  set: (state: Partial<CartStoreState>) => void,
  get: () => CartStoreState,
) => {
  // Optimistic update — toggle the addon in selected_addon_ids
  const previousComboItems = [...get().comboItems];
  const targetItem = previousComboItems.find(
    (item) => item.id === cartComboItemId,
  );

  if (!targetItem) {
    set({
      hasError: true,
      errorMessage: "Combo item not found in cart",
    });
    return;
  }

  const currentAddonIds = [...targetItem.selected_addon_ids];
  const addonIndex = currentAddonIds.indexOf(addonId);
  let newAddonIds: string[];

  if (addonIndex >= 0) {
    // Remove addon
    newAddonIds = currentAddonIds.filter((id) => id !== addonId);
  } else {
    // Add addon
    newAddonIds = [...currentAddonIds, addonId];
  }

  const updatedComboItems = previousComboItems.map((item) =>
    item.id === cartComboItemId
      ? { ...item, selected_addon_ids: newAddonIds }
      : item,
  );
  set({ comboItems: updatedComboItems, hasError: false, errorMessage: null });

  // Clear cache
  const userId = memoizationUtils.getCurrentUserId();
  memoizationUtils.clearMemoizedResult(`cart-items-${userId}`);

  try {
    const res = await fetchWithAuth("user-data", {
      action: "cart.toggleComboAddon",
      id: cartComboItemId,
      selected_addon_ids: newAddonIds,
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || "Failed to toggle combo addon");
    }
  } catch (error) {
    console.error("Error toggling combo addon:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to toggle combo addon";
    set({
      hasError: true,
      errorMessage,
      comboItems: previousComboItems,
    });

    // Revert optimistic update
    await fetchCart(set, get, true);
  }
};

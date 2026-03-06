import { create } from "zustand";
import { CartItem, CartStore } from "./types";
import {
  fetchCart,
  addToCart,
  removeFromCart,
  updateQuantity,
  updateWeight,
  addCombo,
  removeCombo,
  updateComboQuantity,
  toggleComboAddon,
} from "./operations";

// Extend the CartStore interface with implementation details
export interface CartStoreState extends CartStore {
  // No need for additional properties here as we moved them to CartStore interface
}

// Create the store using zustand
export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  comboItems: [],
  isLoading: false,
  hasError: false,
  errorMessage: null,
  lastFetchTime: null,
  isFetching: false,

  clearError: () => {
    set({ hasError: false, errorMessage: null });
  },

  retryFetchCart: async () => {
    // Check if we're currently rate limited
    const currentState = get();
    const errorMsg = currentState.errorMessage;

    // If we're rate limited, don't retry immediately
    if (
      errorMsg?.includes("Too many API requests") ||
      errorMsg?.includes("rate limit")
    ) {
      // Set a timer to automatically retry after a delay
      setTimeout(() => {
        set({ hasError: false, errorMessage: null });
        fetchCart(set as any, get as any);
      }, 5000); // Wait 5 seconds before retrying
      return;
    }

    set({ hasError: false, errorMessage: null });
    await fetchCart(set as any, get as any);
  },

  fetchCart: async () => {
    const state = get();

    // Prevent concurrent fetches and throttle repeated calls
    if (state.isFetching) {
      console.log("Cart fetch already in progress, skipping duplicate request");
      return;
    }

    // Implement cache strategy: don't fetch if we got data recently (30 seconds)
    const now = Date.now();
    if (
      state.lastFetchTime &&
      now - state.lastFetchTime < 30000 &&
      state.items.length > 0
    ) {
      console.log(
        "Using cached cart data, last fetch was less than 30 seconds ago"
      );
      return;
    }

    set({ isFetching: true });
    await fetchCart(set as any, get as any, false);

    // After fetch completes (success or error), update lastFetchTime and reset isFetching
    set({
      lastFetchTime: Date.now(),
      isFetching: false,
    });
  },

  forceRefreshCart: async () => {
    console.log("Force refreshing cart, bypassing all caches");
    set({ isFetching: true });
    await fetchCart(set as any, get as any, true);
    set({
      lastFetchTime: Date.now(),
      isFetching: false,
    });
  },

  addToCart: async (
    productId: string,
    weight?: number,
    discountPercentage?: number,
    flashDealId?: string
  ) => {
    await addToCart(
      productId,
      set as any,
      get as any,
      weight,
      undefined,
      discountPercentage,
      flashDealId
    );
  },

  removeFromCart: async (productId: string) => {
    await removeFromCart(productId, set as any, get as any);
  },

  updateQuantity: async (productId: string, quantity: number) => {
    await updateQuantity(productId, quantity, set as any, get as any);
  },

  updateWeight: async (productId: string, weight: number) => {
    await updateWeight(productId, weight, set as any, get as any);
  },

  addCombo: async (comboId: string, selectedAddonIds?: string[]) => {
    await addCombo(comboId, selectedAddonIds || [], set as any, get as any);
  },

  removeCombo: async (cartComboItemId: string) => {
    await removeCombo(cartComboItemId, set as any, get as any);
  },

  updateComboQuantity: async (cartComboItemId: string, quantity: number) => {
    await updateComboQuantity(cartComboItemId, quantity, set as any, get as any);
  },

  toggleComboAddon: async (cartComboItemId: string, addonId: string) => {
    await toggleComboAddon(cartComboItemId, addonId, set as any, get as any);
  },
}));

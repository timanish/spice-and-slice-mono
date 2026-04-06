import { create } from "zustand";
import { CartItem, CartComboItem, CartStore } from "./types";
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

// --- localStorage persistence helpers ---
const CART_STORAGE_KEY = "cart-cache";

function loadCartFromStorage(): { items: CartItem[]; comboItems: CartComboItem[] } {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.items)) {
        return { items: parsed.items, comboItems: parsed.comboItems || [] };
      }
    }
  } catch {
    // corrupt data — ignore
  }
  return { items: [], comboItems: [] };
}

function saveCartToStorage(items: CartItem[], comboItems: CartComboItem[]) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items, comboItems }));
  } catch {
    // storage full or unavailable — ignore
  }
}

export function clearCartStorage() {
  try {
    localStorage.removeItem(CART_STORAGE_KEY);
  } catch {
    // ignore
  }
}

// Hydrate from localStorage immediately so the UI never flashes empty
const hydrated = loadCartFromStorage();

// Create the store using zustand
export const useCartStore = create<CartStore>((set, get) => ({
  items: hydrated.items,
  comboItems: hydrated.comboItems,
  isLoading: hydrated.items.length === 0,
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
    flashDealId?: string,
    productSnapshot?: import('./types').ProductSnapshot
  ) => {
    await addToCart(
      productId,
      set as any,
      get as any,
      weight,
      undefined,
      discountPercentage,
      flashDealId,
      productSnapshot
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

// Persist cart to localStorage on every state change
useCartStore.subscribe((state) => {
  saveCartToStorage(state.items, state.comboItems);
});

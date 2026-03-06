export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  weight?: number; // Weight in pounds or other unit
  discount_percentage?: number; // Discount percentage (e.g., 20 for 20% off)
  flash_deal_id?: string; // Reference to flash deal if applicable
  product: {
    name: string;
    price_per_unit: number;
    is_weighted?: boolean;
    unit_of_measure?: string;
    image_url?: string;
    min_order_value?: number | null;
    min_order_unit?: "pieces" | "kg" | "lbs" | null;
    category: string;
    tax_rate?: number | null;
  };
  // Adding these fields to match usage in CartContent.tsx
  name?: string;
  description?: string;
  price?: number;
}

export interface ComboItemDetail {
  id: string;
  product_id: string;
  quantity: number;
  weight?: number;
  is_addon: boolean;
  addon_price?: number;
  position: number;
  product: {
    name: string;
    price_per_unit: number;
    image_url?: string;
    is_weighted?: boolean;
    unit_of_measure?: string;
  };
}

export interface CartComboItem {
  id: string;
  combo_id: string;
  quantity: number;
  selected_addon_ids: string[];
  combo: {
    name: string;
    description?: string;
    image_url?: string;
    combo_price: number;
    items: ComboItemDetail[];
  };
}

export interface CartStore {
  items: CartItem[];
  comboItems: CartComboItem[];
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string | null;
  lastFetchTime: number | null; // Added this property
  isFetching: boolean; // Added this property
  fetchCart: () => Promise<void>;
  forceRefreshCart: () => Promise<void>; // Force refresh bypassing cache
  addToCart: (
    productId: string,
    weight?: number,
    discountPercentage?: number,
    flashDealId?: string
  ) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  updateWeight: (productId: string, weight: number) => Promise<void>;
  retryFetchCart: () => Promise<void>;
  clearError: () => void;
  addCombo: (comboId: string, selectedAddonIds?: string[]) => Promise<void>;
  removeCombo: (cartComboItemId: string) => Promise<void>;
  updateComboQuantity: (cartComboItemId: string, quantity: number) => Promise<void>;
  toggleComboAddon: (cartComboItemId: string, addonId: string) => Promise<void>;
}

// Constants
export const OPERATION_TIMEOUT = 10000;
export const MAX_RETRIES = 3;
export const RETRY_DELAY = 1000;

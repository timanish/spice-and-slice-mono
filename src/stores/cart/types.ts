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

export interface CartStore {
  items: CartItem[];
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
}

// Constants
export const OPERATION_TIMEOUT = 10000;
export const MAX_RETRIES = 3;
export const RETRY_DELAY = 1000;

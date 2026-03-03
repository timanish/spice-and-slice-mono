import type { ProductFiltersType } from "@/components/product-filters";

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price_per_unit: number;
  inventory_count: number;
  inventory_weight: number;
  is_weighted: boolean;
  unit_of_measure: string | null;
  track_inventory: boolean;
  low_stock_threshold: number;
  low_stock_weight_threshold: number;
  upc_code: string | null;
  category_id: string;
  category?: { id: string; name: string; tax_rate: number | null };
  sub_category: string | null;
  brand: string | null;
  tags: string[] | null;
  is_active: boolean;
  priority: number;
  min_order_value: number | null;
  min_order_unit: "pieces" | "kg" | "lbs" | null;
  tax_rate: number | null;
  image_url?: string | null;
  has_default_image?: boolean;
  created_at?: string;
  updated_at?: string;
  discount_percentage?: number | null;
  flash_deal_id?: string | null;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
  category?: { id: string; name: string; tax_rate?: number | null } | null;
  sub_category: string | null;
  is_vegetarian: boolean | null;
  is_spicy: boolean | null;
  image_url: string | null;
  serves_people: number | null;
  created_at: string;
  updated_at: string;
}

// Number of products to display per page (client-side pagination)
export const PRODUCTS_PER_PAGE = 20;

export interface ProductQueryResult {
  products: Product[];
  allProducts: Product[];
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  hasMore: boolean;
  page: number;
  setPage: (page: number) => void;
  loadMore: () => void;
  refetch: () => void;
  itemCount: {
    showing: number;
    total: number;
  };
  totalPages: number;
}

export interface ProductMetadata {
  categories: string[];
  brands: string[];
  priceRange: [number, number];
}

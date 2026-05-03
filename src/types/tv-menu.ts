export interface TvMenuBoardTheme {
  background_color: string;
  text_color: string;
  accent_color: string;
  category_header_color: string;
  price_color: string;
  font_size_scale: number;
}

export interface TvMenuBoardConfig {
  data_source: "menu_items" | "products" | "both";
  category_ids: string[];
  excluded_item_ids: string[];
  layout: "classic" | "modern" | "grid" | "restaurant";
  show_images: boolean;
  show_descriptions: boolean;
  show_prices: boolean;
  columns: number;
  group_by_subcategory: boolean;
  display_mode: "scroll" | "pages" | "static";
  auto_scroll: boolean;
  scroll_speed: "slow" | "medium" | "fast";
  page_duration: number; // seconds per page for "pages" mode
  total_screens: number; // 1 = single screen, 2 = split across 2 TVs
  header_text: string;
  footer_text: string;
  // Restaurant layout: up to 4 hero dish photos placed at TL, TR, BR, BL.
  accent_images?: string[];
  theme: TvMenuBoardTheme;
}

export interface TvMenuBoard {
  id: string;
  name: string;
  is_published: boolean;
  config: TvMenuBoardConfig;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_THEME: TvMenuBoardTheme = {
  background_color: "#1a1a2e",
  text_color: "#e0e0e0",
  accent_color: "#FFD700",
  category_header_color: "#FFD700",
  price_color: "#4ade80",
  font_size_scale: 1,
};

// Warm, printed-menu palette tuned for the Restaurant layout.
export const RESTAURANT_THEME: TvMenuBoardTheme = {
  background_color: "#1a0f0a",
  text_color: "#FFF5E1",
  accent_color: "#FF8C00",
  category_header_color: "#FFD700",
  price_color: "#FFC83D",
  font_size_scale: 1,
};

export const DEFAULT_CONFIG: TvMenuBoardConfig = {
  data_source: "menu_items",
  category_ids: [],
  excluded_item_ids: [],
  layout: "classic",
  show_images: false,
  show_descriptions: false,
  show_prices: true,
  columns: 2,
  group_by_subcategory: true,
  display_mode: "pages",
  auto_scroll: true,
  scroll_speed: "medium",
  page_duration: 10,
  total_screens: 1,
  header_text: "Our Menu",
  footer_text: "",
  theme: DEFAULT_THEME,
};

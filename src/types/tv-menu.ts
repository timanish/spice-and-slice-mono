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
  layout: "classic" | "modern" | "grid" | "restaurant" | "static_images";
  show_images: boolean;
  show_descriptions: boolean;
  show_prices: boolean;
  columns: number;
  group_by_subcategory: boolean;
  // Per-board section header overrides: categoryId -> custom label (defaults to
  // the category name). Lets TV headers read "1. Appetizer - Veg" without
  // renaming store categories or re-exporting any background art.
  section_labels?: Record<string, string>;
  show_section_numbers?: boolean; // prefix headers with "1." etc. (default true)
  display_mode: "scroll" | "pages" | "static";
  auto_scroll: boolean;
  scroll_speed: "slow" | "medium" | "fast";
  page_duration: number; // seconds per page for "pages" mode
  total_screens: number; // 1 = single screen, 2 = split across 2 TVs
  header_text: string;
  footer_text: string;
  // Background template: a full-bleed image rendered BEHIND the menu (classic /
  // modern / grid / restaurant layouts). Lets a designer build a beautiful EMPTY
  // template (textures, frames, logo, hero photo) while live prices/items render
  // on top — designed-image quality with full editability.
  background_image_url?: string;
  background_size?: "cover" | "contain"; // default "cover"
  // Scrim drawn over the background image for text legibility.
  overlay_color?: string; // default "#000000"
  overlay_opacity?: number; // 0-1, default 0.4
  // Restaurant layout: up to 4 hero dish photos placed at TL, TR, BR, BL.
  accent_images?: string[];
  // static_images layout: full-bleed images shown directly. With ?screen=N&of=M
  // each TV shows static_images[N-1]; otherwise they cycle on page_duration.
  static_images?: string[];
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
  background_size: "cover",
  overlay_color: "#000000",
  overlay_opacity: 0.4,
  show_section_numbers: true,
  theme: DEFAULT_THEME,
};

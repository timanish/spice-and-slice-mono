export interface TvMenuBoardTheme {
  background_color: string;
  text_color: string;
  accent_color: string;
  category_header_color: string;
  price_color: string;
  font_size_scale: number;
}

export interface TvMenuBoardConfig {
  category_ids: string[];
  excluded_item_ids: string[];
  layout: "classic" | "modern" | "grid";
  show_images: boolean;
  show_descriptions: boolean;
  show_prices: boolean;
  columns: number;
  auto_scroll: boolean;
  scroll_speed: "slow" | "medium" | "fast";
  header_text: string;
  footer_text: string;
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

export const DEFAULT_CONFIG: TvMenuBoardConfig = {
  category_ids: [],
  excluded_item_ids: [],
  layout: "classic",
  show_images: false,
  show_descriptions: false,
  show_prices: true,
  columns: 2,
  auto_scroll: true,
  scroll_speed: "medium",
  header_text: "Our Menu",
  footer_text: "",
  theme: DEFAULT_THEME,
};

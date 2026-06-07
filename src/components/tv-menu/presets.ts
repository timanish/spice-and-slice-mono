import {
  TvMenuBoardConfig,
  TvMenuBoardTheme,
  DEFAULT_THEME,
  RESTAURANT_THEME,
} from "@/types/tv-menu";

export interface TvMenuPreset {
  id: string;
  name: string;
  description: string;
  // Presentation-only overrides. Content (categories, labels, images, logo,
  // header/footer text) is intentionally left untouched.
  config: Partial<TvMenuBoardConfig>;
}

const LIGHT_THEME: TvMenuBoardTheme = {
  background_color: "#faf7f2",
  text_color: "#2a2118",
  accent_color: "#B8001F",
  category_header_color: "#8B4513",
  price_color: "#1f7a1f",
  font_size_scale: 1,
};

export const TV_MENU_PRESETS: TvMenuPreset[] = [
  {
    id: "printed-dark",
    name: "Printed Menu (Dark)",
    description: "Black & gold, framed panels, Cinzel headings",
    config: {
      layout: "restaurant",
      theme: { ...RESTAURANT_THEME },
      heading_font: "Cinzel",
      body_font: "Inter",
      columns: 2,
      show_prices: true,
      show_section_numbers: true,
      group_by_subcategory: false,
      display_mode: "static",
      background_image_url: "/tv-menu/restaurant-template.png",
      background_size: "cover",
      overlay_color: "#000000",
      overlay_opacity: 0.2,
    },
  },
  {
    id: "modern-light",
    name: "Modern Light",
    description: "Bright airy cards — Playfair + Inter",
    config: {
      layout: "modern",
      theme: { ...LIGHT_THEME },
      heading_font: "Playfair Display",
      body_font: "Inter",
      columns: 2,
      show_prices: true,
      show_section_numbers: false,
      background_image_url: undefined,
      overlay_opacity: 0,
    },
  },
  {
    id: "classic-navy",
    name: "Classic Elegant",
    description: "Dark navy, typographic, no frames",
    config: {
      layout: "classic",
      theme: { ...DEFAULT_THEME },
      heading_font: "Cormorant Garamond",
      body_font: "Inter",
      columns: 2,
      show_prices: true,
      show_section_numbers: false,
      background_image_url: undefined,
      overlay_opacity: 0,
    },
  },
  {
    id: "grid-compact",
    name: "Grid Compact",
    description: "Dense 3-column grid for big menus",
    config: {
      layout: "grid",
      theme: { ...DEFAULT_THEME },
      heading_font: "Bebas Neue",
      body_font: "Inter",
      columns: 3,
      show_prices: true,
      show_section_numbers: true,
      background_image_url: undefined,
      overlay_opacity: 0,
    },
  },
];

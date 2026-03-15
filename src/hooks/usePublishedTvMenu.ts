import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TvMenuBoard, TvMenuBoardConfig } from "@/types/tv-menu";
import { MenuItem } from "@/hooks/products/types";

export interface TvMenuData {
  board: TvMenuBoard;
  itemsByCategory: Map<string, { categoryName: string; items: MenuItem[] }>;
}

// Normalize a product row to MenuItem shape for display
function productToMenuItem(p: any): MenuItem {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price_per_unit,
    category_id: p.category_id,
    category: p.category,
    sub_category: p.sub_category,
    is_vegetarian: null,
    is_spicy: null,
    image_url: p.image_url,
    serves_people: null,
    created_at: p.created_at,
    updated_at: p.updated_at,
  };
}

export function usePublishedTvMenu(boardId?: string) {
  return useQuery<TvMenuData | null>({
    queryKey: ["published-tv-menu", boardId ?? "published"],
    queryFn: async () => {
      // Fetch the board
      let boardQuery = supabase.from("tv_menu_boards" as any).select("*");

      if (boardId) {
        boardQuery = boardQuery.eq("id", boardId);
      } else {
        boardQuery = boardQuery.eq("is_published", true);
      }

      const { data: boardData, error: boardError } = await boardQuery.limit(1).single();

      if (boardError || !boardData) return null;

      const board = boardData as unknown as TvMenuBoard;
      const config = board.config as TvMenuBoardConfig;

      if (!config.category_ids || config.category_ids.length === 0) {
        return { board, itemsByCategory: new Map() };
      }

      const dataSource = config.data_source ?? "menu_items";
      const allItems: MenuItem[] = [];

      // Fetch menu items
      if (dataSource === "menu_items" || dataSource === "both") {
        const { data: menuItems, error: itemsError } = await supabase
          .from("menu_items")
          .select("*, category:categories(id, name)")
          .in("category_id", config.category_ids)
          .eq("is_available", true)
          .order("name");

        if (itemsError) throw itemsError;
        if (menuItems) allItems.push(...(menuItems as any as MenuItem[]));
      }

      // Fetch products
      if (dataSource === "products" || dataSource === "both") {
        const { data: products, error: productsError } = await supabase
          .from("products")
          .select("*, category:categories(id, name)")
          .in("category_id", config.category_ids)
          .eq("is_active", true)
          .order("name");

        if (productsError) throw productsError;
        if (products) {
          allItems.push(...products.map(productToMenuItem));
        }
      }

      // Filter out excluded items and group by category
      const excluded = new Set(config.excluded_item_ids ?? []);
      const grouped = new Map<string, { categoryName: string; items: MenuItem[] }>();

      // Initialize categories in the order specified by config
      for (const catId of config.category_ids) {
        grouped.set(catId, { categoryName: "", items: [] });
      }

      for (const item of allItems) {
        if (excluded.has(item.id)) continue;
        const catId = item.category_id;
        if (!catId) continue;

        const group = grouped.get(catId);
        if (group) {
          if (!group.categoryName && item.category?.name) {
            group.categoryName = item.category.name;
          }
          group.items.push(item);
        }
      }

      // Remove empty categories
      for (const [key, value] of grouped) {
        if (value.items.length === 0) grouped.delete(key);
      }

      return { board, itemsByCategory: grouped };
    },
    refetchInterval: 300000, // 5 min
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    staleTime: 60000,
  });
}

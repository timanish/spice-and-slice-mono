import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TvMenuBoard, TvMenuBoardConfig } from "@/types/tv-menu";
import { MenuItem } from "@/hooks/products/types";

export interface TvMenuData {
  board: TvMenuBoard;
  itemsByCategory: Map<string, { categoryName: string; items: MenuItem[] }>;
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

      // Fetch menu items for selected categories
      const { data: menuItems, error: itemsError } = await supabase
        .from("menu_items")
        .select("*, category:categories(id, name)")
        .in("category_id", config.category_ids)
        .eq("is_available", true)
        .order("name");

      if (itemsError) throw itemsError;

      // Filter out excluded items and group by category
      const excluded = new Set(config.excluded_item_ids ?? []);
      const grouped = new Map<string, { categoryName: string; items: MenuItem[] }>();

      // Initialize categories in the order specified by config
      for (const catId of config.category_ids) {
        grouped.set(catId, { categoryName: "", items: [] });
      }

      for (const item of (menuItems ?? []) as any[]) {
        if (excluded.has(item.id)) continue;
        const catId = item.category_id;
        if (!catId) continue;

        const group = grouped.get(catId);
        if (group) {
          if (!group.categoryName && item.category?.name) {
            group.categoryName = item.category.name;
          }
          group.items.push(item as MenuItem);
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

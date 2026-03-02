import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Product, MenuItem } from "./types";

export const fetchAllProducts = async (): Promise<Product[]> => {
  let allProducts: any[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("products")
      .select(
        `
        *,
        category:categories(id, name, tax_rate, is_active, priority)
      `
      )
      .eq("is_active", true)
      .eq("category.is_active", true)
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("Error fetching products:", error);
      throw error;
    }

    if (data) {
      const activeProducts = data.filter(
        (item: any) => item.category?.is_active !== false
      );
      // Sort by product priority DESC, then category priority DESC, then name ASC
      const sortedProducts = activeProducts.sort((a: any, b: any) => {
        const aPriority = a.priority ?? 0;
        const bPriority = b.priority ?? 0;
        const aCategoryPriority = a.category?.priority ?? 0;
        const bCategoryPriority = b.category?.priority ?? 0;

        // First sort by product priority (higher first)
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }

        // Then by category priority (higher first)
        if (aCategoryPriority !== bCategoryPriority) {
          return bCategoryPriority - aCategoryPriority;
        }

        // Finally by name alphabetically
        return (a.name || "").localeCompare(b.name || "");
      });
      allProducts = [...allProducts, ...sortedProducts];

      if (data.length < pageSize) {
        hasMore = false;
      } else {
        from += pageSize;
      }
    } else {
      hasMore = false;
    }
  }

  return allProducts as Product[];
};

export const fetchAllMenuItems = async (): Promise<MenuItem[]> => {
  let allMenuItems: any[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*, category:categories(id, name, tax_rate, is_active)")
      .eq("category.is_active", true)
      .order("name")
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("Error fetching menu_items:", error);
      throw error;
    }

    if (data) {
      const activeItems = data.filter(
        (item: any) => item.category?.is_active !== false
      );
      allMenuItems = [...allMenuItems, ...activeItems];

      if (data.length < pageSize) {
        hasMore = false;
      } else {
        from += pageSize;
      }
    } else {
      hasMore = false;
    }
  }
  return allMenuItems as MenuItem[];
};

export const useProductFetcher = () => {
  return useQuery<Product[]>({
    queryKey: ["all-products"],
    queryFn: fetchAllProducts,
    staleTime: 1000 * 60 * 15, // 15 minutes cache
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: false, // Don't refetch on reconnect
  });
};

export const useMenuItemFetcher = () => {
  return useQuery<MenuItem[]>({
    queryKey: ["all-menu_items"],
    queryFn: fetchAllMenuItems,
    staleTime: 1000 * 60 * 15, // 15 minutes cache
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: false, // Don't refetch on reconnect
  });
};

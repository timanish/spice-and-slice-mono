import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductMetadata } from "./types";

export const useProductMetadata = () => {
  return useQuery({
    queryKey: ["products-metadata"],
    queryFn: async (): Promise<ProductMetadata> => {
      // Fetch all distinct categories from categories table with active product count
      const { data: categories, error: categoriesError } = await supabase
        .from("categories")
        .select("name, display_order, products:products!category_id(count)")
        .eq("is_active", true)
        .eq("show_on_website", true)
        .eq("products.is_active", true)
        .order("display_order", { ascending: true });

      // Fetch all distinct brands
      const { data: brands, error: brandsError } = await supabase
        .from("products")
        .select("brand")
        .not("brand", "is", null);

      // Fetch price range
      const { data: priceRange, error: priceRangeError } = await supabase
        .from("products")
        .select("price_per_unit")
        .order("price_per_unit", { ascending: true });

      if (categoriesError || brandsError || priceRangeError) {
        throw new Error("Failed to fetch metadata");
      }

      const categoriesWithProducts =
        categories?.filter((c: any) => {
          const productCount = c.products?.[0]?.count || 0;
          return productCount > 0;
        }) || [];

      return {
        categories: categoriesWithProducts.map((c: any) => c.name),

        brands: [...new Set(brands?.map((b) => b.brand))]
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b)),

        priceRange: [0, 100],
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

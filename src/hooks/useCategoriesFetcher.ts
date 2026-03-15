import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Category {
  id: string;
  name: string;
  description: string | null;
  tax_rate: number | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useCategoriesFetcher = (options?: { includeHidden?: boolean }) => {
  const includeHidden = options?.includeHidden ?? false;

  return useQuery({
    queryKey: ["categories", { includeHidden }],
    queryFn: async (): Promise<Category[]> => {
      let query = supabase
        .from("categories")
        .select("*")
        .eq("is_active", true);

      if (!includeHidden) {
        query = query.eq("show_on_website", true);
      }

      const { data, error } = await query
        .order("display_order")
        .order("name");

      if (error) throw error;
      return data as Category[];
    },
    staleTime: 1000 * 60 * 5,
  });
};

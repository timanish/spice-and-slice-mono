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

export const useCategoriesFetcher = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .eq("show_on_website", true)
        .order("display_order")
        .order("name");

      if (error) throw error;
      return data as Category[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
};

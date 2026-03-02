import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StoreDisplaySettings {
  showTaxOnCards: boolean;
  lunchBoxEnabled: boolean;
}

export function useStoreDisplaySettings() {
  return useQuery({
    queryKey: ["storeDisplaySettings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_settings")
        .select("key, value")
        .in("key", ["show_tax_on_product_cards", "lunch_box_enabled"]);

      if (error) {
        console.error("Error fetching store display settings:", error);
        throw error;
      }

      const settingsMap = (data || []).reduce((acc, row) => {
        acc[row.key] = row.value;
        return acc;
      }, {} as Record<string, string>);

      return {
        showTaxOnCards: settingsMap.show_tax_on_product_cards !== "false",
        lunchBoxEnabled: settingsMap.lunch_box_enabled !== "false",
      } satisfies StoreDisplaySettings;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: { showTaxOnCards: true, lunchBoxEnabled: true },
  });
}

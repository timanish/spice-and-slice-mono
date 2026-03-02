import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DeliverySetting {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

export interface DeliverySettings {
  minDeliveryHours: number;
  deliveryCutoffHour: number;
  timezone: string;
  maxDaysAdvance: number;
}

export function useDeliverySettings() {
  return useQuery({
    queryKey: ["deliverySettings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_settings")
        .select("*");

      if (error) {
        console.error("Error fetching delivery settings:", error);
        throw error;
      }

      const settingsMap = (data as DeliverySetting[]).reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, string>);

      const settings: DeliverySettings = {
        minDeliveryHours: parseInt(settingsMap.min_delivery_hours || "2", 10),
        deliveryCutoffHour: parseInt(
          settingsMap.delivery_cutoff_hour || "18",
          10
        ),
        timezone: settingsMap.timezone || "America/Chicago",
        maxDaysAdvance: parseInt(settingsMap.max_days_advance || "7", 10),
      };

      return settings;
    },
    staleTime: 5 * 60 * 1000, 
    placeholderData: {
      minDeliveryHours: 2,
      deliveryCutoffHour: 18,
      timezone: "America/Chicago",
      maxDaysAdvance: 7,
    },
  });
}


export function useRawDeliverySettings() {
  return useQuery({
    queryKey: ["rawDeliverySettings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_settings")
        .select("*")
        .order("key");

      if (error) {
        console.error("Error fetching raw delivery settings:", error);
        throw error;
      }

      return data as DeliverySetting[];
    },
    staleTime: 30 * 1000, // 30 seconds for admin page
  });
}

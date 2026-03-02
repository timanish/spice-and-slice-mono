import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  validatePickupAvailability,
  type PickupSettings,
} from "@/utils/pickupUtils";

export interface PickupSettingsData extends PickupSettings {
  id: string;
  store_address_line1: string;
  store_address_line2?: string;
  store_city: string;
  store_state: string;
  store_postal_code: string;
  store_phone?: string;
  min_advance_hours: number;
  max_days_advance: number;
  use_delivery_slots: boolean;
  default_max_orders_per_slot: number;
  created_at: string;
  updated_at: string;
}

export function usePickupSettings() {
  const {
    data: settings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["pickup-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pickup_settings")
        .select("*")
        .single();

      if (error) throw error;
      return data as PickupSettingsData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Validate pickup availability based on settings
  const validation = settings ? validatePickupAvailability(settings) : null;

  return {
    settings,
    isLoading,
    error,
    validation,
    isPickupAvailable: validation?.isAvailable ?? false,
  };
}

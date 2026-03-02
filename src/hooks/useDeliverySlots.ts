import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DeliveryTimeSlot {
  id: string;
  start_hour: number;
  start_minute: number;
  end_hour: number;
  end_minute: number;
  label: string;
  is_active: boolean;
  display_order: number;
  day_of_week: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to fetch active delivery time slots from database
 * @param dayOfWeek Optional day filter (0=Sunday, 6=Saturday)
 * @returns Active delivery time slots ordered by display_order
 */
export function useDeliverySlots(dayOfWeek?: number) {
  return useQuery({
    queryKey: ["deliveryTimeSlots", dayOfWeek],
    queryFn: async () => {
      let query = supabase
        .from("delivery_time_slots")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      // Filter by day if specified, including slots that apply to all days (NULL)
      if (dayOfWeek !== undefined) {
        query = query.or(`day_of_week.is.null,day_of_week.eq.${dayOfWeek}`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching delivery time slots:", error);
        throw error;
      }

      return data as DeliveryTimeSlot[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch all delivery time slots (including inactive) for admin management
 */
export function useAllDeliverySlots() {
  return useQuery({
    queryKey: ["allDeliveryTimeSlots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_time_slots")
        .select("*")
        .order("display_order");

      if (error) {
        console.error("Error fetching all delivery time slots:", error);
        throw error;
      }

      return data as DeliveryTimeSlot[];
    },
    staleTime: 30 * 1000, // 30 seconds for admin page
  });
}

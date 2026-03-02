import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PickupSlot {
  id: string;
  label: string;
  start_hour: number;
  start_minute: number;
  end_hour: number;
  end_minute: number;
  is_active: boolean;
  max_orders_per_slot: number;
}

export interface DeliverySlot {
  id: string;
  label: string;
  start_hour: number;
  start_minute: number;
  end_hour: number;
  end_minute: number;
  is_active: boolean;
}

/**
 * Fetch pickup time slots based on admin configuration
 * Returns pickup_slots if use_delivery_slots = false, otherwise returns delivery_slots
 */
export function usePickupSlots() {
  return useQuery({
    queryKey: ["pickup-slots"],
    queryFn: async () => {
      const { data: settings, error: settingsError } = await supabase
        .from("pickup_settings")
        .select("use_delivery_slots, default_max_orders_per_slot")
        .single();

      if (settingsError) {
        console.error("Error fetching pickup settings:", settingsError);
        throw settingsError;
      }

      if (settings.use_delivery_slots) {
        const { data: deliverySlots, error: deliveryError } = await supabase
          .from("delivery_time_slots" as any)
          .select("*")
          .eq("is_active", true)
          .order("start_hour", { ascending: true })
          .order("start_minute", { ascending: true });

        if (deliveryError) {
          console.error("Error fetching delivery slots:", deliveryError);
          throw deliveryError;
        }
        return ((deliverySlots || []) as unknown as DeliverySlot[]).map((slot) => ({
          id: slot.id,
          label: slot.label,
          start_hour: slot.start_hour,
          start_minute: slot.start_minute,
          end_hour: slot.end_hour,
          end_minute: slot.end_minute,
          is_active: slot.is_active,
          max_orders_per_slot: settings.default_max_orders_per_slot,
        })) as PickupSlot[];
      } else {
        const { data: pickupSlots, error: pickupError } = await supabase
          .from("pickup_slots")
          .select("*")
          .eq("is_active", true)
          .order("start_hour", { ascending: true })
          .order("start_minute", { ascending: true });

        if (pickupError) {
          console.error("Error fetching pickup slots:", pickupError);
          throw pickupError;
        }
        return pickupSlots as PickupSlot[];
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Check current capacity for a specific pickup date and time slot
 *
 * SECURITY NOTE: This hook has been simplified to only return max capacity.
 * The actual capacity check (counting existing orders) is performed server-side
 * in the Edge Functions to prevent leaking business metrics to clients.
 *
 * Clients only need to know the max capacity for UI display purposes.
 * The server will validate availability when creating orders.
 */
export function usePickupCapacity(pickupDate?: string, pickupTime?: string) {
  return useQuery({
    queryKey: ["pickup-capacity", pickupDate, pickupTime],
    queryFn: async () => {
      if (!pickupDate || !pickupTime) {
        return { current: 0, max: 0, isAvailable: true };
      }

      // Fetch settings and slot capacity (public configuration data)
      const { data: settings, error: settingsError } = await supabase
        .from("pickup_settings")
        .select("use_delivery_slots, default_max_orders_per_slot")
        .single();

      if (settingsError) throw settingsError;

      let maxCapacity = settings.default_max_orders_per_slot;

      if (!settings.use_delivery_slots) {
        const { data: slots } = await supabase
          .from("pickup_slots")
          .select("max_orders_per_slot")
          .eq("label", pickupTime)
          .single();

        if (slots) {
          maxCapacity = slots.max_orders_per_slot;
        }
      }

      return {
        current: 0, 
        max: maxCapacity,
        isAvailable: true,
      };
    },
    enabled: !!pickupDate && !!pickupTime,
    staleTime: 30 * 1000,
  });
}

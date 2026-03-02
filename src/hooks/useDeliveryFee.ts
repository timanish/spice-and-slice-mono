import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DeliveryZone {
  id: string;
  zone_name: string;
  min_distance: number;
  max_distance: number;
  free_shipping_threshold: number;
  delivery_fee: number;
}

export interface DeliveryFeeResult {
  deliveryFee: number;
  isFreeShipping: boolean;
  amountNeededForFreeShipping: number;
  zone: DeliveryZone | null;
  isWithinDeliveryRange: boolean;
  distance: number | null;
  freeShippingThreshold: number;
  isLoading: boolean;
}

/**
 * Hook to calculate delivery fee based on user's distance and order total
 * @param orderTotal Order total (subtotal + tax, before delivery fee)
 * @param userDistance Distance from store in miles (from user profile)
 * @returns Delivery fee calculation results
 */
export function useDeliveryFee(
  orderTotal: number,
  userDistance: number | null
): DeliveryFeeResult {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch delivery zones from database
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const { data, error } = await supabase
          .from("delivery_zones")
          .select("*")
          .eq("is_active", true)
          .order("display_order");

        if (error) throw error;
        setZones(data || []);
      } catch (error) {
        console.error("Error fetching delivery zones:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchZones();
  }, []);

  // Calculate delivery fee
  const calculateFee = (): DeliveryFeeResult => {
    // Default result
    const defaultResult: DeliveryFeeResult = {
      deliveryFee: 0,
      isFreeShipping: true,
      amountNeededForFreeShipping: 0,
      zone: null,
      isWithinDeliveryRange: false,
      distance: userDistance,
      freeShippingThreshold: 0,
      isLoading,
    };

    if (userDistance === null || zones.length === 0) {
      return defaultResult;
    }

    // Find applicable zone based on distance
    const applicableZone = zones.find(
      (zone) =>
        userDistance >= zone.min_distance && userDistance < zone.max_distance
    );

    // If no zone matches, user is outside delivery range
    if (!applicableZone) {
      return {
        ...defaultResult,
        isWithinDeliveryRange: false,
      };
    }

    // Check if order qualifies for free shipping based on threshold
    const isFreeShipping = orderTotal >= applicableZone.free_shipping_threshold;
    const deliveryFee = isFreeShipping ? 0 : applicableZone.delivery_fee;
    const amountNeededForFreeShipping = isFreeShipping
      ? 0
      : applicableZone.free_shipping_threshold - orderTotal;

    return {
      deliveryFee,
      isFreeShipping,
      amountNeededForFreeShipping: Math.max(0, amountNeededForFreeShipping),
      zone: applicableZone,
      isWithinDeliveryRange: true,
      distance: userDistance,
      freeShippingThreshold: applicableZone.free_shipping_threshold,
      isLoading,
    };
  };

  return calculateFee();
}

/**
 * Format distance for display
 */
export function formatDistance(distance: number | null): string {
  if (distance === null) return "Unknown";
  return `${distance.toFixed(1)} miles`;
}

/**
 * Get delivery zone description
 */
export function getZoneDescription(zone: DeliveryZone | null): string {
  if (!zone) return "";
  return zone.zone_name;
}

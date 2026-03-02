import { useState, useEffect, useRef } from "react";
import { useCartStore } from "@/stores/cart";
import { useUser as useClerkUser } from "@clerk/clerk-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const profileCache = new Map<
  string,
  {
    isComplete: boolean;
    timestamp: number;
  }
>();
const PROFILE_CACHE_TTL = 60000;

export const useCheckout = () => {
  const { items } = useCartStore();
  const { user, isSignedIn } = useClerkUser();
  const [profileComplete, setProfileComplete] = useState(true);
  const [deliveryTimeSelected, setDeliveryTimeSelected] = useState(false);
  const profileCheckedRef = useRef(false);
  const profileCheckInProgressRef = useRef(false);
  const { toast } = useToast();
  const subtotal = items.reduce(
    (sum, item) => sum + (item.quantity * item.product?.price_per_unit || 0),
    0
  );

  useEffect(() => {
    const hasDeliveryDate = !!localStorage.getItem("selectedDeliveryDate");
    const hasDeliveryTime = !!localStorage.getItem("selectedDeliveryTime");
    setDeliveryTimeSelected(hasDeliveryDate && hasDeliveryTime);
  }, []);

  useEffect(() => {
    if (
      !isSignedIn ||
      !user?.id ||
      profileCheckedRef.current ||
      profileCheckInProgressRef.current
    )
      return;

    const getUserProfile = async () => {
      try {
        profileCheckInProgressRef.current = true;
        const cacheKey = user.id;
        const cachedProfile = profileCache.get(cacheKey);

        if (
          cachedProfile &&
          Date.now() - cachedProfile.timestamp < PROFILE_CACHE_TTL
        ) {
          setProfileComplete(cachedProfile.isComplete);
          profileCheckedRef.current = true;
          profileCheckInProgressRef.current = false;
          return;
        }

        const localStorageKey = `profile_complete_${user.id}`;
        const localStorageData = localStorage.getItem(localStorageKey);
        if (localStorageData) {
          try {
            const parsed = JSON.parse(localStorageData);
            if (parsed && Date.now() - parsed.timestamp < PROFILE_CACHE_TTL) {
              setProfileComplete(parsed.isComplete);
              profileCache.set(cacheKey, {
                isComplete: parsed.isComplete,
                timestamp: parsed.timestamp,
              });

              profileCheckedRef.current = true;
              profileCheckInProgressRef.current = false;
              return;
            }
          } catch (e) {
            console.error("Error parsing localStorage profile cache", e);
          }
        }
        const { data, error } = await supabase
          .from("profiles")
          .select("phone_number, profile_completed")
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;

        const isComplete = !!(data?.phone_number && data?.profile_completed);
        setProfileComplete(isComplete);

        const timestamp = Date.now();
        profileCache.set(cacheKey, {
          isComplete,
          timestamp,
        });

        localStorage.setItem(
          localStorageKey,
          JSON.stringify({
            isComplete,
            timestamp,
          })
        );

        profileCheckedRef.current = true;
      } catch (error) {
        console.error(
          "Error checking profile:",
          error instanceof Error ? error.message : "Unknown error"
        );
        setProfileComplete(false);
      } finally {
        profileCheckInProgressRef.current = false;
      }
    };

    getUserProfile();
  }, [user, isSignedIn]);

  useEffect(() => {
    if (!isSignedIn || !user?.id) {
      profileCheckedRef.current = false;
      profileCheckInProgressRef.current = false;
    }
  }, [user, isSignedIn]);

  const validateCheckout = () => {
    if (!isSignedIn || !user?.id) {
      toast({
        title: "Login Required",
        description: "Please login to checkout",
        variant: "destructive",
      });
      return false;
    }

    if (!profileComplete) {
      toast({
        title: "Profile Incomplete",
        description:
          "Please complete your profile with address and phone number before checkout",
        variant: "destructive",
      });
      return false;
    }

    if (!deliveryTimeSelected) {
      toast({
        variant: "destructive",
        title: "Delivery Time Required",
        description: "Please select a delivery date and time",
      });
      return false;
    }

    return true;
  };

  return {
    profileComplete,
    setProfileComplete,
    deliveryTimeSelected,
    subtotal,
    validateCheckout,
  };
};

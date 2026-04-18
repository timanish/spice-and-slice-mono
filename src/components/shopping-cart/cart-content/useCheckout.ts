import { useState, useEffect, useRef } from "react";
import { useCartStore } from "@/stores/cart";
import { useUser as useClerkUser } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";
import { checkProfileComplete } from "@/utils/profileUtils";

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
        // Single source of truth — same util AuthGuard uses. Requires phone
        // + at least one address; ignores the profile_completed flag, which
        // can drift out of sync with reality.
        const isComplete = await checkProfileComplete(user.id);
        setProfileComplete(isComplete);
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

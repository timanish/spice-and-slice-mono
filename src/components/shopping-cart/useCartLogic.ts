import { useState, useEffect } from "react";
import { useCartStore } from "@/stores/cart";
import { useUser as useClerkUser, useAuth } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase, SUPABASE_URL } from "@/integrations/supabase/client";
import { memoizationUtils } from "@/stores/cart/operations/memoization";

export const useCartLogic = (
  isOpen: boolean,
  setIsOpen: (isOpen: boolean) => void,
) => {
  const { items, comboItems, fetchCart, isLoading } = useCartStore();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash">("card");
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, isSignedIn } = useClerkUser();
  const { getToken } = useAuth();

  useEffect(() => {
    if (isSignedIn && user?.id) {
      memoizationUtils.setClerkUserId(user.id);
    } else {
      memoizationUtils.setClerkUserId(null);
    }
  }, [isSignedIn, user?.id]);

  useEffect(() => {
    if (isOpen && isSignedIn && user?.id) {
      fetchCart();
    }
  }, [isOpen, isSignedIn, user?.id]);

  useEffect(() => {
    if (isOpen && items.length > 0) {
      const timer = setTimeout(() => {
        setShowMap(true);
      }, 300);

      return () => clearTimeout(timer);
    } else {
      setShowMap(false);
    }
  }, [isOpen, items.length]);

  const handleCheckout = async () => {
    try {
      if (items.length === 0 && comboItems.length === 0) {
        toast({
          title: "Cart is empty",
          description: "Add some items to your cart before checking out",
          variant: "destructive",
        });
        return;
      }

      if (!user || !user.id) {
        console.error("User not authenticated or missing ID:", {
          user,
          userId: user?.id,
        });
        toast({
          title: "Please log in",
          description: "You need to be logged in to checkout",
          variant: "destructive",
        });
        setIsOpen(false);
        navigate("/auth");
        return;
      }
      setIsCheckingOut(true);

      const deliveryDate = localStorage.getItem("selectedDeliveryDate");
      const deliveryTime = localStorage.getItem("selectedDeliveryTime");

      if (!deliveryDate || !deliveryTime) {
        toast({
          title: "Delivery information missing",
          description: "Please select a delivery date and time",
          variant: "destructive",
        });
        setIsCheckingOut(false);
        return;
      }

      const paymentMethodValue = paymentMethod;

      if (paymentMethodValue === "cash") {
        const requestBody = {
          cartItems: items,
          deliveryDate,
          deliveryTime,
        };

        const token = await getToken();
        if (!token) {
          throw new Error("Authentication token not available");
        }

        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/create-cash-order`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          },
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.details || "Failed to create order");
        }

        const order = await response.json();

        toast({
          title: "Order placed successfully!",
          description:
            "Your order has been placed with cash on delivery option.",
        });

        navigate("/order-success");
        fetchCart();
      } else {
        const successUrl = `${window.location.origin}/order-success`;
        const cancelUrl = `${window.location.origin}/order-canceled`;

        const requestBody = {
          cartItems: items,
          successUrl,
          cancelUrl,
          deliveryDate,
          deliveryTime,
        };

        const token = await getToken();
        if (!token) {
          throw new Error("Authentication token not available");
        }

        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/create-checkout`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          },
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(
            error.details || error.error || "Failed to create checkout",
          );
        }

        const data = await response.json();

        if (data?.url) {
          window.location.href = data.url;
        } else {
          console.error("Missing URL in checkout response:", data);
          throw new Error("No checkout URL returned");
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An error occurred during checkout";
      console.error("Checkout error:", error);
      toast({
        title: "Checkout failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  return {
    isCheckingOut,
    showMap,
    handleCheckout,
    items,
    comboItems,
    paymentMethod,
    setPaymentMethod,
    isLoading,
  };
};

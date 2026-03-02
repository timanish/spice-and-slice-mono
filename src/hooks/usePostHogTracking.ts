import { usePostHog } from "posthog-js/react";
import { useCallback } from "react";
import {
  ANALYTICS_EVENTS,
  AnalyticsEventProperties,
  AnalyticsEvent,
} from "@/types/analytics";

export const usePostHogTracking = () => {
  const posthog = usePostHog();

  const trackEvent = useCallback(
    <T extends AnalyticsEvent>(
      event: T,
      properties?: AnalyticsEventProperties[T]
    ) => {
      try {
        if (!posthog) {
          if (import.meta.env.MODE === "development") {
            console.log(
              "[PostHog] Event not tracked (PostHog not configured):",
              event,
              properties
            );
          }
          return;
        }
        posthog.capture(event, properties);
        if (import.meta.env.MODE === "development") {
          console.log("[PostHog] Event tracked:", event, properties);
        }
      } catch (error) {
        console.error("[PostHog] Tracking error:", error);
      }
    },
    [posthog]
  );

  const trackProductViewed = useCallback(
    (
      product: {
        id: string;
        name: string;
        category?: { name: string } | string;
        price_per_unit: number;
        is_weighted?: boolean;
      },
      fromPage?: string
    ) => {
      trackEvent(ANALYTICS_EVENTS.PRODUCT_VIEWED, {
        product_id: product.id,
        product_name: product.name,
        category:
          typeof product.category === "string"
            ? product.category
            : product.category?.name || "Unknown",
        price: product.price_per_unit,
        is_weighted: product.is_weighted,
        from_page: fromPage,
      });
    },
    [trackEvent]
  );

  const trackProductAddedToCart = useCallback(
    (
      product: {
        id: string;
        name: string;
        category?: { name: string } | string;
        price_per_unit: number;
        is_weighted?: boolean;
      },
      options: {
        quantity?: number;
        weight?: number;
        fromPage: string;
        hasFlashDeal?: boolean;
        discountPercentage?: number;
      }
    ) => {
      trackEvent(ANALYTICS_EVENTS.PRODUCT_ADDED_TO_CART, {
        product_id: product.id,
        product_name: product.name,
        category:
          typeof product.category === "string"
            ? product.category
            : product.category?.name || "Unknown",
        price: product.price_per_unit,
        quantity: options.quantity,
        weight: options.weight,
        is_weighted: product.is_weighted || false,
        from_page: options.fromPage,
        has_flash_deal: options.hasFlashDeal,
        discount_percentage: options.discountPercentage,
      });
    },
    [trackEvent]
  );

  const trackCartViewed = useCallback(
    (itemsCount: number, totalValue: number) => {
      trackEvent(ANALYTICS_EVENTS.CART_VIEWED, {
        items_count: itemsCount,
        total_value: totalValue,
      });
    },
    [trackEvent]
  );

  const trackCheckoutStarted = useCallback(
    (
      cartValue: number,
      itemsCount: number,
      fulfillmentType: "delivery" | "pickup"
    ) => {
      trackEvent(ANALYTICS_EVENTS.CHECKOUT_STARTED, {
        cart_value: cartValue,
        items_count: itemsCount,
        fulfillment_type: fulfillmentType,
      });
    },
    [trackEvent]
  );

  const trackCheckoutCompleted = useCallback(
    (orderDetails: {
      orderId: string;
      totalAmount: number;
      paymentMethod: "card" | "cash";
      fulfillmentType: "delivery" | "pickup";
      itemsCount: number;
      hadPromoCode: boolean;
      discountAmount?: number;
      deliveryFee?: number;
      taxAmount?: number;
    }) => {
      trackEvent(ANALYTICS_EVENTS.CHECKOUT_COMPLETED, {
        order_id: orderDetails.orderId,
        total_amount: orderDetails.totalAmount,
        payment_method: orderDetails.paymentMethod,
        fulfillment_type: orderDetails.fulfillmentType,
        items_count: orderDetails.itemsCount,
        had_promo_code: orderDetails.hadPromoCode,
        discount_amount: orderDetails.discountAmount,
        delivery_fee: orderDetails.deliveryFee,
        tax_amount: orderDetails.taxAmount,
      });
    },
    [trackEvent]
  );

  const identifyUser = useCallback(
    (userId: string, properties?: Record<string, unknown>) => {
      try {
        if (posthog) {
          posthog.identify(userId, properties);
        }
      } catch (error) {
        console.error("PostHog identify error:", error);
      }
    },
    [posthog]
  );

  const resetUser = useCallback(() => {
    try {
      if (posthog) {
        posthog.reset();
      }
    } catch (error) {
      console.error("PostHog reset error:", error);
    }
  }, [posthog]);

  return {
    trackEvent,
    trackProductViewed,
    trackProductAddedToCart,
    trackCartViewed,
    trackCheckoutStarted,
    trackCheckoutCompleted,
    identifyUser,
    resetUser,
  };
};

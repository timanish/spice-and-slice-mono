import { CartItem } from "@/stores/cart/types";

export interface MinimumOrderValidation {
  isValid: boolean;
  errors: Array<{
    productName: string;
    currentValue: number;
    requiredValue: number;
    unit: string;
  }>;
}

/**
 * Validates that all cart items meet their minimum order requirements
 */
export function validateMinimumOrders(
  items: CartItem[]
): MinimumOrderValidation {
  const errors: MinimumOrderValidation["errors"] = [];

  for (const item of items) {
    const { product, quantity, weight } = item;
    const { min_order_value, min_order_unit } = product;

    // Skip if no minimum order requirement
    if (!min_order_value || !min_order_unit) continue;

    // Check based on unit type
    if (min_order_unit === "pieces") {
      if (quantity < min_order_value) {
        errors.push({
          productName: product.name,
          currentValue: quantity,
          requiredValue: min_order_value,
          unit: "pieces",
        });
      }
    } else if (min_order_unit === "kg" || min_order_unit === "lbs") {
      const currentWeight = weight || 0;
      if (currentWeight < min_order_value) {
        errors.push({
          productName: product.name,
          currentValue: currentWeight,
          requiredValue: min_order_value,
          unit: min_order_unit,
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates that all cart items are eligible for the selected fulfillment type.
 * When nationwide shipping is selected, local-only items are flagged.
 */
export function validateShippingEligibility(
  items: CartItem[],
  fulfillmentType: "delivery" | "pickup" | "nationwide"
): { isValid: boolean; localOnlyItems: string[] } {
  if (fulfillmentType !== "nationwide") {
    return { isValid: true, localOnlyItems: [] };
  }

  const localOnly = items.filter(
    (item) => !item.product.shippable_nationwide
  );
  return {
    isValid: localOnly.length === 0,
    localOnlyItems: localOnly.map((item) => item.product.name),
  };
}

/**
 * Generates a user-friendly error message for minimum order validation failures
 */
export function formatMinimumOrderErrors(
  validation: MinimumOrderValidation
): string {
  if (validation.isValid) return "";

  const errorMessages = validation.errors.map(
    (error) =>
      `• ${error.productName}: requires at least ${error.requiredValue} ${error.unit} (currently ${error.currentValue})`
  );

  return `Some items don't meet minimum order requirements:\n\n${errorMessages.join(
    "\n"
  )}`;
}

/**
 * Shared helpers for order creation and validation
 * Used by: create-pending-order, create-cash-order (legacy), create-checkout (legacy)
 */

/**
 * Parse pickup time string (e.g., "2:00 PM - 4:00 PM") to get start time
 */
export function parsePickupTimeStart(pickupTime: string): string | null {
  try {
    const match = pickupTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return null;

    let hours = parseInt(match[1]);
    const minutes = match[2];
    const period = match[3].toUpperCase();

    // Convert to 24-hour format
    if (period === "PM" && hours !== 12) {
      hours += 12;
    } else if (period === "AM" && hours === 12) {
      hours = 0;
    }

    return `${hours.toString().padStart(2, "0")}:${minutes}:00`;
  } catch (error) {
    console.error("Error parsing pickup time:", error);
    return null;
  }
}

/**
 * Calculate when reminder should be sent (1 hour before pickup window starts)
 */
export function calculatePickupReminderTime(
  pickupDate: string,
  pickupTime: string,
): string | null {
  try {
    const startTime = parsePickupTimeStart(pickupTime);
    if (!startTime) {
      console.error("Could not parse pickup time:", pickupTime);
      return null;
    }

    // Combine date and time in Central Time
    const pickupDateTime = new Date(`${pickupDate}T${startTime}-06:00`); // CST/CDT

    if (isNaN(pickupDateTime.getTime())) {
      console.error("Invalid pickup datetime:", pickupDate, startTime);
      return null;
    }

    // Subtract 1 hour for reminder
    const reminderTime = new Date(pickupDateTime.getTime() - 60 * 60 * 1000);

    return reminderTime.toISOString();
  } catch (error) {
    console.error("Error calculating reminder time:", error);
    return null;
  }
}

/**
 * Validate input data structure for order creation
 */
export function validateInput(
  cartItems: any[],
  deliveryDate: string | null,
  deliveryTime: string | null,
  pickupDate: string | null,
  pickupTime: string | null,
  fulfillmentType: string,
  comboCartItems?: any[],
) {
  const hasRegularItems =
    cartItems && Array.isArray(cartItems) && cartItems.length > 0;
  const hasComboItems =
    comboCartItems && Array.isArray(comboCartItems) && comboCartItems.length > 0;
  if (!hasRegularItems && !hasComboItems) {
    return { valid: false, error: "Invalid cart items" };
  }

  // Only validate delivery date/time for delivery orders (not nationwide)
  if (fulfillmentType === "delivery" && (!deliveryDate || !deliveryTime)) {
    return { valid: false, error: "Missing delivery date or time" };
  }

  // Only validate pickup date/time for pickup orders
  if (fulfillmentType === "pickup" && (!pickupDate || !pickupTime)) {
    return { valid: false, error: "Missing pickup date or time" };
  }

  return { valid: true };
}

/**
 * Calculate order total from components
 */
export function calculateOrderTotal(
  cartItems: any[],
  promoDiscount = 0,
  deliveryFee = 0,
  taxAmount = 0,
  comboSubtotal = 0,
) {
  const subtotal = (cartItems || []).reduce((sum: number, item: any) => {
    if (item.product.is_weighted && item.weight) {
      return sum + item.weight * item.product.price_per_unit;
    }
    return sum + item.quantity * item.product.price_per_unit;
  }, 0);

  return Math.max(subtotal + comboSubtotal - promoDiscount + deliveryFee + taxAmount, 0);
}

/**
 * Server-side price validation: fetch real prices from DB and replace client values.
 * Returns enriched cart items with server-side prices and computed tax.
 */
export async function validateAndEnrichCartItems(
  serviceClient: any,
  cartItems: any[],
): Promise<{ items: any[]; serverSubtotal: number; serverTaxAmount: number }> {
  const productIds = cartItems.map((item: any) => item.product_id);

  const { data: products, error } = await serviceClient
    .from("products")
    .select(
      "id, name, price_per_unit, is_weighted, is_active, tax_rate, unit_of_measure, image_url, category_id"
    )
    .in("id", productIds);

  if (error) {
    throw new Error("Failed to fetch product prices: " + error.message);
  }

  const priceMap = new Map<string, any>();
  for (const p of products || []) {
    priceMap.set(p.id, p);
  }

  let serverSubtotal = 0;
  let serverTaxAmount = 0;

  const enrichedItems = cartItems.map((item: any) => {
    const dbProduct = priceMap.get(item.product_id);
    if (!dbProduct) {
      throw new Error(`Product not found: ${item.product_id}`);
    }
    if (!dbProduct.is_active) {
      throw new Error(`Product is no longer available: ${dbProduct.name}`);
    }

    // Use server-side price
    const serverPrice = dbProduct.price_per_unit;
    const isWeighted = dbProduct.is_weighted && item.weight;
    const lineTotal = isWeighted
      ? item.weight * serverPrice
      : item.quantity * serverPrice;

    serverSubtotal += lineTotal;

    // Compute per-item tax from server-side tax_rate
    const taxRate = dbProduct.tax_rate || 0;
    const itemTax = lineTotal * (taxRate / 100);
    serverTaxAmount += itemTax;

    return {
      ...item,
      product: {
        ...item.product,
        name: dbProduct.name,
        price_per_unit: serverPrice,
        is_weighted: dbProduct.is_weighted,
        tax_rate: dbProduct.tax_rate,
        unit_of_measure: dbProduct.unit_of_measure,
        image_url: dbProduct.image_url,
        category_id: dbProduct.category_id,
      },
      tax_amount: Math.round(itemTax * 100) / 100,
    };
  });

  return {
    items: enrichedItems,
    serverSubtotal: Math.round(serverSubtotal * 100) / 100,
    serverTaxAmount: Math.round(serverTaxAmount * 100) / 100,
  };
}

/**
 * Zone label used when an address is beyond all configured delivery zones
 * but still within the hard delivery cap. Order is accepted; admin sets a
 * custom delivery fee during pending_review.
 */
export const QUOTE_REQUIRED_ZONE = "Outside Zone (Quote Required)";

/**
 * Hard upper bound on delivery distance. Addresses past this cap are rejected
 * at checkout — admin cannot viably deliver that far.
 */
export const MAX_DELIVERY_DISTANCE_MILES = 100;

/**
 * Look up delivery fee from delivery_zones based on address distance.
 */
export async function lookupDeliveryFee(
  serviceClient: any,
  userId: string,
  addressId: string | null,
): Promise<{ fee: number; distance: number | null; zone: string | null }> {
  if (!addressId) return { fee: 0, distance: null, zone: null };

  // Get the user's address distance
  const { data: address } = await serviceClient
    .from("user_addresses")
    .select("distance_from_store")
    .eq("id", addressId)
    .eq("user_id", userId)
    .single();

  if (!address?.distance_from_store) return { fee: 0, distance: null, zone: null };

  const distance = address.distance_from_store;

  // Find matching delivery zone
  const { data: zones } = await serviceClient
    .from("delivery_zones")
    .select("delivery_fee, min_distance, max_distance, zone_name")
    .lte("min_distance", distance)
    .gte("max_distance", distance)
    .limit(1);

  if (zones && zones.length > 0) {
    return {
      fee: zones[0].delivery_fee || 0,
      distance,
      zone: zones[0].zone_name || null,
    };
  }

  // Beyond configured zones but within the hard cap — admin will quote a fee.
  if (distance <= MAX_DELIVERY_DISTANCE_MILES) {
    return { fee: 0, distance, zone: QUOTE_REQUIRED_ZONE };
  }

  // Past the hard cap — let caller reject (zone=null signals "undeliverable").
  return { fee: 0, distance, zone: null };
}

/**
 * Validate promo code via RPC
 */
export async function validatePromoCode(
  supabase: any,
  code: string,
  userId: string,
  orderAmount: number,
) {
  if (!code) return { valid: false, discount: 0, promoId: null, message: "" };

  try {
    const { data, error } = await supabase.rpc("validate_promo_code", {
      _code: code,
      _user_id: userId,
      _order_amount: orderAmount,
    });

    if (error) throw error;

    if (data && data.length > 0) {
      return {
        valid: data[0].valid,
        discount: data[0].discount || 0,
        promoId: data[0].promo_id,
        message: data[0].message,
      };
    }

    return {
      valid: false,
      discount: 0,
      promoId: null,
      message: "Error validating promo code",
    };
  } catch (error) {
    console.error("Error validating promo code:", error);
    return { valid: false, discount: 0, promoId: null, message: error.message };
  }
}

/**
 * Fetch and snapshot address data for the order
 */
export async function fetchAddressSnapshot(
  serviceClient: any,
  userId: string,
  addressId: string | null,
) {
  if (!addressId) return null;

  const { data: address } = await serviceClient
    .from("user_addresses")
    .select("address_line1, city, state, postal_code, label")
    .eq("id", addressId)
    .eq("user_id", userId)
    .single();

  return address || null;
}

/**
 * Validate pickup slot capacity
 */
export async function validatePickupSlotCapacity(
  serviceClient: any,
  pickupDate: string,
  pickupTime: string,
): Promise<boolean> {
  // Get the max orders per slot setting
  const { data: settings } = await serviceClient
    .from("pickup_settings")
    .select("default_max_orders_per_slot")
    .single();

  const maxOrders = settings?.default_max_orders_per_slot || 10;

  // Count existing orders in this slot
  const { data: existingOrders, error } = await serviceClient
    .from("orders")
    .select("id")
    .eq("pickup_date", pickupDate)
    .eq("pickup_time", pickupTime)
    .in("fulfillment_status", ["pending", "pending_review", "awaiting_customer_confirmation", "confirmed", "preparing"]);

  if (error) {
    console.error("Error checking pickup capacity:", error);
    return false;
  }

  const currentCount = existingOrders?.length || 0;
  return currentCount < maxOrders;
}

/**
 * Generate a cryptographically random confirmation token
 */
export function generateConfirmationToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Get confirmation token expiry (48 hours from now)
 */
export function getConfirmationTokenExpiry(): string {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 48);
  return expiry.toISOString();
}

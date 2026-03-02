import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { isRateLimitedByIp, getClientIp } from "../_shared/rate-limiter.ts";
import { authenticateRequest } from "../_shared/clerk-auth.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const ADMIN_EMAIL = "spiceandslicedfw@gmail.com";
const SENDER_EMAIL = "SpiceAndSlice <orders@management.spiceandslice.shop>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const getSupabaseClient = (authHeader: string) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
};

// Create a service role client to bypass RLS
const getServiceRoleClient = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  return createClient(supabaseUrl, serviceRoleKey);
};

// Function to send email with better error handling
async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
  isAdminEmail = false,
) {
  try {
    console.log(`Attempting to send email to: ${to} with subject: ${subject}`);

    if (!Deno.env.get("RESEND_API_KEY")) {
      console.error("RESEND_API_KEY is not set in environment variables");
      return { success: false, error: "API key not configured" };
    }

    // Using your verified domain for all emails
    const response = await resend.emails.send({
      from: SENDER_EMAIL,
      to: to,
      replyTo: ADMIN_EMAIL,
      subject: subject,
      html: htmlContent,
      // Add admin email as BCC to ensure customer emails are received by the admin as well
      bcc: isAdminEmail ? undefined : ADMIN_EMAIL,
    });

    console.log(`Email send attempt result for ${to}:`, response);

    return {
      success: !response.error,
      response,
    };
  } catch (error) {
    console.error(
      `Failed to send ${isAdminEmail ? "admin" : "customer"} email:`,
      error,
    );
    return { success: false, error: error.message || "Unknown error" };
  }
}

/**
 * Parse pickup time string (e.g., "2:00 PM - 4:00 PM") to get start time
 */
function parsePickupTimeStart(pickupTime: string): string | null {
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
function calculatePickupReminderTime(
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

// Function to validate input data
function validateInput(
  cartItems: any[],
  deliveryDate: string | null,
  deliveryTime: string | null,
  pickupDate: string | null,
  pickupTime: string | null,
  fulfillmentType: string,
) {
  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    return { valid: false, error: "Invalid cart items" };
  }

  // Only validate delivery date/time for delivery orders
  if (fulfillmentType === "delivery" && (!deliveryDate || !deliveryTime)) {
    return { valid: false, error: "Missing delivery date or time" };
  }

  // Only validate pickup date/time for pickup orders
  if (fulfillmentType === "pickup" && (!pickupDate || !pickupTime)) {
    return { valid: false, error: "Missing pickup date or time" };
  }

  return { valid: true };
}

function calculateOrderTotal(
  cartItems: any[],
  promoDiscount = 0,
  deliveryFee = 0,
  taxAmount = 0,
) {
  const subtotal = cartItems.reduce((sum: number, item: any) => {
    if (item.product.is_weighted && item.weight) {
      return sum + item.weight * item.product.price_per_unit;
    }
    return sum + item.quantity * item.product.price_per_unit;
  }, 0);

  return Math.max(subtotal - promoDiscount + deliveryFee + taxAmount, 0);
}

/**
 * Server-side price validation: fetch real prices from DB and replace client values.
 * Returns enriched cart items with server-side prices and computed tax.
 */
async function validateAndEnrichCartItems(
  serviceClient: any,
  cartItems: any[],
): Promise<{ items: any[]; serverSubtotal: number; serverTaxAmount: number }> {
  const productIds = cartItems.map((item: any) => item.product_id);

  const { data: products, error } = await serviceClient
    .from("products")
    .select("id, name, price_per_unit, is_weighted, is_active, tax_rate, unit_of_measure, image_url, category_id")
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
 * Look up delivery fee from delivery_zones based on address distance.
 */
async function lookupDeliveryFee(
  serviceClient: any,
  userId: string,
  addressId: string | null,
): Promise<number> {
  if (!addressId) return 0;

  // Get the user's address distance
  const { data: address } = await serviceClient
    .from("user_addresses")
    .select("distance_from_store")
    .eq("id", addressId)
    .eq("user_id", userId)
    .single();

  if (!address?.distance_from_store) return 0;

  const distance = address.distance_from_store;

  // Find matching delivery zone
  const { data: zones } = await serviceClient
    .from("delivery_zones")
    .select("delivery_fee, min_distance, max_distance")
    .lte("min_distance", distance)
    .gte("max_distance", distance)
    .limit(1);

  if (zones && zones.length > 0) {
    return zones[0].delivery_fee || 0;
  }

  return 0;
}

async function validatePromoCode(
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    console.log("Cash order function called");

    const clientIp = getClientIp(req);

    if (isRateLimitedByIp(clientIp, 20, 60)) {
      console.error(`Rate limit exceeded for IP: ${clientIp}`);
      return new Response(
        JSON.stringify({ error: "Too many requests, please try again later" }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const serviceClient = getServiceRoleClient();

    const authHeader = req.headers.get("Authorization");
    let verifiedUserId: string;

    try {
      verifiedUserId = await authenticateRequest(
        authHeader,
        serviceClient,
        false,
      );
      console.log("User authenticated via JWT:", verifiedUserId);
    } catch (authError) {
      console.error("Authentication failed:", authError);
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          details: authError.message,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("Parsing request body");
    let requestData;
    try {
      requestData = await req.json();

      requestData.userId = verifiedUserId;
      console.log("Using verified user ID:", verifiedUserId);

      const validation = validateInput(
        requestData.cartItems,
        requestData.deliveryDate,
        requestData.deliveryTime,
        requestData.pickupDate,
        requestData.pickupTime,
        requestData.fulfillmentType || "delivery",
      );

      if (!validation.valid) {
        console.error(validation.error, requestData);
        return new Response(JSON.stringify({ error: validation.error }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Order details:", {
        userId: requestData.userId,
        deliveryDate: requestData.deliveryDate,
        deliveryTime: requestData.deliveryTime,
        itemCount: requestData.cartItems.length,
        promoCode: requestData.promoCode || "none",
      });
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({
          error: "Invalid request body",
          details: parseError.message,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const {
      cartItems: rawCartItems,
      deliveryDate,
      deliveryTime,
      promoCode,
      userId,
      addressId,
    } = requestData;

    // --- SERVER-SIDE PRICE VALIDATION ---
    // Never trust client-sent prices. Fetch real prices from DB.
    let cartItems: any[];
    let subtotal: number;
    let taxAmount: number;

    try {
      const enriched = await validateAndEnrichCartItems(serviceClient, rawCartItems);
      cartItems = enriched.items;
      subtotal = enriched.serverSubtotal;
      taxAmount = enriched.serverTaxAmount;
      console.log("Server-side prices validated. Subtotal:", subtotal, "Tax:", taxAmount);
    } catch (priceError: any) {
      console.error("Price validation failed:", priceError);
      return new Response(
        JSON.stringify({ error: priceError.message }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // --- SERVER-SIDE DELIVERY FEE ---
    const fulfillmentType = requestData.fulfillmentType || "delivery";
    let deliveryFee = 0;
    let deliveryDistance = requestData.deliveryDistance || null;
    let deliveryZone = requestData.deliveryZone || null;

    if (fulfillmentType === "delivery" && addressId) {
      deliveryFee = await lookupDeliveryFee(serviceClient, userId, addressId);
      console.log("Server-side delivery fee:", deliveryFee);
    }

    // Get user's address (either from user_addresses table or profile)
    let addressData = null;
    if (addressId && fulfillmentType === "delivery") {
      const { data: userAddress, error: addressError } = await serviceClient
        .from("user_addresses")
        .select("*")
        .eq("id", addressId)
        .eq("user_id", userId)
        .single();

      if (addressError) {
        console.error("Error fetching user address:", addressError);
        return new Response(
          JSON.stringify({
            error: "Address not found or does not belong to user",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      addressData = userAddress;
      deliveryDistance = userAddress.distance_from_store || deliveryDistance;
      console.log("User address retrieved:", addressData.label);
    }

    // Get the user's profile information for email
    const { data: profileData, error: profileError } = await serviceClient
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
    } else {
      console.log("User profile retrieved:", profileData?.full_name);
    }

    const userEmail = profileData?.email || "";
    console.log("User email:", userEmail);

    if (!userEmail) {
      console.warn(
        "No email address found for user. Cannot send order confirmation.",
      );
    }

    const formatShippingAddress = () => {
      const address = addressData || profileData;
      if (!address) return "No address provided";

      const addressParts = [
        address.address_line1,
        `${address.city}, ${address.state} ${address.postal_code}`,
      ].filter(Boolean);

      return addressParts.join("<br>");
    };

    console.log("Order subtotal calculated:", subtotal);

    // --- SERVER-SIDE PROMO CODE VALIDATION ---
    // Always re-validate promo code server-side, never trust client discount
    let finalPromoDiscount = 0;
    let finalPromoCodeId = null;

    if (promoCode) {
      console.log("Validating promo code server-side:", promoCode);
      const promoResult = await validatePromoCode(
        serviceClient,
        promoCode,
        userId,
        subtotal,
      );
      console.log("Promo code validation result:", promoResult);

      if (promoResult.valid) {
        finalPromoDiscount = promoResult.discount;
        finalPromoCodeId = promoResult.promoId;
      }
    }

    // Calculate final order total with server-side values
    const totalAmount = calculateOrderTotal(
      cartItems,
      finalPromoDiscount,
      deliveryFee,
      taxAmount,
    );
    console.log(
      "Final order total with discount, delivery fee, and tax:",
      totalAmount,
      "Discount applied:",
      finalPromoDiscount,
    );

    // Create an order in the database
    console.log("Creating order in database");
    const pickupDate = requestData.pickupDate || null;
    const pickupTime = requestData.pickupTime || null;

    console.log("Fulfillment details:", {
      fulfillmentType,
      deliveryDate,
      deliveryTime,
      pickupDate,
      pickupTime,
    });

    // Validate pickup slot capacity for pickup orders
    if (fulfillmentType === "pickup" && pickupDate && pickupTime) {
      console.log("Validating pickup slot capacity");

      // Count existing orders for this slot
      const { count, error: countError } = await serviceClient
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("fulfillment_type", "pickup")
        .eq("pickup_date", pickupDate)
        .eq("pickup_time", pickupTime)
        .in("fulfillment_status", ["pending", "confirmed", "preparing"]);

      if (countError) {
        console.error("Error checking capacity:", countError);
      } else {
        // Get max capacity for this slot
        const { data: settings } = await serviceClient
          .from("pickup_settings")
          .select("use_delivery_slots, default_max_orders_per_slot")
          .single();

        let maxCapacity = settings?.default_max_orders_per_slot || 10;

        if (!settings?.use_delivery_slots) {
          // Get specific slot capacity
          const { data: slot } = await serviceClient
            .from("pickup_slots")
            .select("max_orders_per_slot")
            .eq("label", pickupTime)
            .single();

          if (slot) {
            maxCapacity = slot.max_orders_per_slot;
          }
        }

        if ((count || 0) >= maxCapacity) {
          return new Response(
            JSON.stringify({
              error:
                "This pickup time slot is fully booked. Please select another time.",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      }
    }

    let pickupReminderScheduledFor = null;
    if (fulfillmentType === "pickup" && pickupDate && pickupTime) {
      pickupReminderScheduledFor = calculatePickupReminderTime(
        pickupDate,
        pickupTime,
      );
      console.log("Pickup reminder scheduled for:", pickupReminderScheduledFor);
    }

    const { data: order, error: orderError } = await serviceClient
      .from("orders")
      .insert({
        user_id: userId,
        total_amount: totalAmount,
        status: "pending",
        payment_method: "cash",
        fulfillment_type: fulfillmentType,
        address_id: addressId || null,
        delivery_address_line1: addressData?.address_line1 || null,
        delivery_city: addressData?.city || null,
        delivery_state: addressData?.state || null,
        delivery_postal_code: addressData?.postal_code || null,
        delivery_address_label: addressData?.label || null,
        delivery_date: deliveryDate,
        delivery_time: deliveryTime,
        pickup_date: pickupDate,
        pickup_time: pickupTime,
        pickup_reminder_scheduled_for: pickupReminderScheduledFor,
        promo_code_id: finalPromoCodeId,
        discount_amount: finalPromoDiscount,
        delivery_fee: deliveryFee,
        delivery_distance: deliveryDistance,
        delivery_zone: deliveryZone,
        tax_amount: taxAmount,
        taxable_amount: subtotal,
      })
      .select()
      .single();

    console.log("Order inserted:", order?.id, "Error:", orderError);

    if (orderError) {
      console.error("Error creating order:", orderError);
      return new Response(
        JSON.stringify({
          error: "Failed to create order",
          details: orderError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("Order created successfully:", order.id);

    // Create print job for store printer
    const { error: printJobError } = await serviceClient
      .from("print_jobs")
      .insert({ order_id: order.id });

    if (printJobError) {
      console.error("Error creating print job:", printJobError);
      // Non-blocking - don't fail the order if print job creation fails
    } else {
      console.log("Print job created for order:", order.id);
    }

    console.log("Adding order items");
    console.log("Cart items received:", JSON.stringify(cartItems, null, 2));

    const orderItems = cartItems.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity:
        item.product.is_weighted && item.weight ? item.weight : item.quantity,
      price_per_unit: item.product.price_per_unit,
      tax_rate: item.product.tax_rate || null,
      tax_amount: item.tax_amount || 0,
    }));

    console.log("Order items to insert:", JSON.stringify(orderItems, null, 2));

    const { data: insertedItems, error: orderItemsError } = await serviceClient
      .from("order_items")
      .insert(orderItems)
      .select();

    if (orderItemsError) {
      console.error("Error creating order items:", orderItemsError);
    } else {
      console.log("Order items created successfully:", insertedItems);
    }

    console.log("Clearing user's cart");
    const { data: userCart } = await serviceClient
      .from("carts")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (userCart?.id) {
      const { error: clearCartError } = await serviceClient
        .from("cart_items")
        .delete()
        .eq("cart_id", userCart.id);

      if (clearCartError) {
        console.error("Error clearing cart:", clearCartError);
      } else {
        console.log("Cart cleared successfully");
      }
    } else {
      console.log("No cart found to clear");
    }

    const formattedCartItems = cartItems
      .map((item: any) => {
        const isWeighted = item.product.is_weighted && item.weight;
        const displayQuantity = isWeighted
          ? `${item.weight}${item.product.unit_of_measure || "lb"}`
          : `${item.quantity}x`;
        const itemTotal = isWeighted
          ? item.weight * item.product.price_per_unit
          : item.quantity * item.product.price_per_unit;

        return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${displayQuantity} ${
            item.product.name
          }</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${itemTotal.toFixed(
            2,
          )}</td>
        </tr>
      `;
      })
      .join("");

    const deliveryFeeRow =
      deliveryFee && deliveryFee > 0
        ? `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Delivery Fee</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${deliveryFee.toFixed(
          2,
        )}</td>
      </tr>
    `
        : "";

    const taxRow =
      taxAmount && taxAmount > 0
        ? `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Tax</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${taxAmount.toFixed(
          2,
        )}</td>
      </tr>
    `
        : "";

    const discountRow =
      finalPromoDiscount > 0
        ? `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Promo Discount</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; color: #e53e3e;">-$${finalPromoDiscount.toFixed(
          2,
        )}</td>
      </tr>
    `
        : "";

    let customerEmailResult = { success: false };
    if (userEmail) {
      console.log("Sending confirmation email to customer:", userEmail);
      const customerEmailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4CAF50;">Thank you for your order!</h1>
          <p>Hi ${profileData?.full_name || "there"},</p>
          <p>We've received your order #${order.id.substring(
            0,
            8,
          )} and are processing it now.</p>
          
          <h2>Order Summary:</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th style="padding: 10px; text-align: left;">Item</th>
                <th style="padding: 10px; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${formattedCartItems}
            </tbody>
            <tfoot>
              <tr>
                <td style="padding: 10px; font-weight: bold; border-top: 2px solid #ddd;">Subtotal</td>
                <td style="padding: 10px; text-align: right; border-top: 2px solid #ddd;">$${cartItems
                  .reduce((sum: number, item: any) => {
                    if (item.product.is_weighted && item.weight) {
                      return sum + item.weight * item.product.price_per_unit;
                    }
                    return sum + item.quantity * item.product.price_per_unit;
                  }, 0)
                  .toFixed(2)}</td>
              </tr>
              ${discountRow}
              ${deliveryFeeRow}
              ${taxRow}
              <tr style="font-weight: bold; font-size: 1.1em;">
                <td style="padding: 10px; border-top: 2px solid #333;">Total</td>
                <td style="padding: 10px; border-top: 2px solid #333; text-align: right;">$${totalAmount.toFixed(
                  2,
                )}</td>
              </tr>
            </tfoot>
          </table>
          
          <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
            <p><strong>Payment Method: ${
              fulfillmentType === "delivery"
                ? "Cash on Delivery"
                : "Cash on Pickup"
            }</strong></p>
            ${
              fulfillmentType === "delivery"
                ? `
            <p><strong>Delivery Date:</strong> ${
              deliveryDate || "Not specified"
            }</p>
            <p><strong>Delivery Time:</strong> ${
              deliveryTime || "Not specified"
            }</p>
            <p><strong>Delivery Address:</strong><br>${formatShippingAddress()}</p>
            `
                : `
            <p><strong>Pickup Date:</strong> ${
              pickupDate || "Not specified"
            }</p>
            <p><strong>Pickup Time:</strong> ${
              pickupTime || "Not specified"
            }</p>
            <p><strong>Pickup Location:</strong> Spice & Slice Restaurant</p>
            `
            }
          </div>
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="${
              Deno.env.get("SITE_URL") || "https://spiceandslice.shop"
            }/order/${order.id}" 
               style="display: inline-block; padding: 15px 30px; background-color: #FF5722; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
              View Order Details
            </a>
          </div>
          
          <p style="margin-top: 20px;">You can also check the status of your order anytime by visiting your profile.</p>
          <p>Thank you for shopping with us!</p>
          <p style="color: #666;">SpiceAndSlice Bazaar Team</p>
        </div>
      `;

      customerEmailResult = await sendEmail(
        userEmail,
        `Your SpiceAndSlice Bazaar Order Confirmation #${order.id.substring(
          0,
          8,
        )} - ${
          fulfillmentType === "delivery" ? "Cash on Delivery" : "Cash on Pickup"
        }`,
        customerEmailContent,
      );

      console.log("Customer email sending result:", customerEmailResult);
    } else {
      console.warn("No user email found, skipping customer confirmation email");
    }

    console.log("Sending notification email to admin:", ADMIN_EMAIL);
    const adminEmailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #FF5722;">New ${
          fulfillmentType === "delivery" ? "Cash on Delivery" : "Cash on Pickup"
        } Order Received</h1>
        <p>A new order has been placed with ${
          fulfillmentType === "delivery" ? "cash on delivery" : "cash on pickup"
        }.</p>
        
        <h2>Customer Information:</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px; font-weight: bold;">Name:</td>
            <td style="padding: 8px;">${
              profileData?.full_name || "Unknown"
            }</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Email:</td>
            <td style="padding: 8px;">${userEmail || "Unknown"}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Phone:</td>
            <td style="padding: 8px;">${
              profileData?.phone_number || "Not provided"
            }</td>
          </tr>
          ${
            fulfillmentType === "delivery"
              ? `
          <tr>
            <td style="padding: 8px; font-weight: bold;">Delivery Address:</td>
            <td style="padding: 8px;">${formatShippingAddress()}</td>
          </tr>
          `
              : ""
          }
        </table>
        
        <h2>Order Details:</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px; font-weight: bold;">Order ID:</td>
            <td style="padding: 8px;">${order.id}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Date:</td>
            <td style="padding: 8px;">${new Date().toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Fulfillment Type:</td>
            <td style="padding: 8px;">${
              fulfillmentType === "delivery" ? "Delivery" : "Pickup"
            }</td>
          </tr>
          ${
            fulfillmentType === "delivery"
              ? `
          <tr>
            <td style="padding: 8px; font-weight: bold;">Delivery Date:</td>
            <td style="padding: 8px;">${deliveryDate || "Not specified"}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Delivery Time:</td>
            <td style="padding: 8px;">${deliveryTime || "Not specified"}</td>
          </tr>
          `
              : `
          <tr>
            <td style="padding: 8px; font-weight: bold;">Pickup Date:</td>
            <td style="padding: 8px;">${pickupDate || "Not specified"}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Pickup Time:</td>
            <td style="padding: 8px;">${pickupTime || "Not specified"}</td>
          </tr>
          `
          }
          ${
            finalPromoDiscount > 0
              ? `
          <tr>
            <td style="padding: 8px; font-weight: bold;">Promo Code:</td>
            <td style="padding: 8px;">${promoCode} (Discount: $${finalPromoDiscount.toFixed(
              2,
            )})</td>
          </tr>
          `
              : ""
          }
        </table>
        
        <h2>Order Items:</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th style="padding: 10px; text-align: left;">Item</th>
              <th style="padding: 10px; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${formattedCartItems}
          </tbody>
          <tfoot>
            <tr>
              <td style="padding: 10px; font-weight: bold; border-top: 2px solid #ddd;">Subtotal</td>
              <td style="padding: 10px; text-align: right; border-top: 2px solid #ddd;">$${cartItems
                .reduce((sum: number, item: any) => {
                  if (item.product.is_weighted && item.weight) {
                    return sum + item.weight * item.product.price_per_unit;
                  }
                  return sum + item.quantity * item.product.price_per_unit;
                }, 0)
                .toFixed(2)}</td>
            </tr>
            ${discountRow}
            ${deliveryFeeRow}
            ${taxRow}
            <tr style="font-weight: bold; font-size: 1.1em;">
              <td style="padding: 10px; border-top: 2px solid #333;">Total</td>
              <td style="padding: 10px; border-top: 2px solid #333; text-align: right;">$${totalAmount.toFixed(
                2,
              )}</td>
            </tr>
          </tfoot>
        </table>
        
        <p style="margin-top: 20px;"><strong>Payment Method: ${
          fulfillmentType === "delivery" ? "Cash on Delivery" : "Cash on Pickup"
        }</strong></p>
      </div>
    `;

    const adminEmailResult = await sendEmail(
      ADMIN_EMAIL,
      `New ${
        fulfillmentType === "delivery" ? "Cash on Delivery" : "Cash on Pickup"
      } Order Received #${order.id.substring(0, 8)} - ${
        profileData?.full_name || "Customer"
      }`,
      adminEmailContent,
      true,
    );

    console.log("Admin email sending result:", adminEmailResult);

    // Return success response
    console.log("Returning success response");
    return new Response(
      JSON.stringify({
        success: true,
        orderId: order.id,
        customerEmailSent: customerEmailResult.success,
        adminEmailSent: adminEmailResult.success,
        promoApplied: finalPromoDiscount > 0,
        discountAmount: finalPromoDiscount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error processing checkout:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "An error occurred during checkout",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

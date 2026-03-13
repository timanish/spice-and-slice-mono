import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import Stripe from "https://esm.sh/stripe@13.8.0";
import { isRateLimitedByIp, getClientIp } from "../_shared/rate-limiter.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { authenticateRequest } from "../_shared/clerk-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const ADMIN_EMAIL = "spiceandslicedfw@gmail.com";
const SENDER_EMAIL = "SpiceAndSlice <orders@management.spiceandslice.shop>";

const getSupabaseClient = (authHeader: string) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
};

const getServiceRoleClient = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  return createClient(supabaseUrl, serviceRoleKey);
};

async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
  isAdminEmail = false,
) {
  try {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      console.error("RESEND_API_KEY is not configured");
      return { success: false, error: "API key not configured" };
    }

    const response = await resend.emails.send({
      from: SENDER_EMAIL,
      to: to,
      replyTo: ADMIN_EMAIL,
      subject: subject,
      html: htmlContent,
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

async function validatePromoCode(
  supabase: any,
  code: string,
  userId: string,
  orderAmount: number,
) {
  if (!code) return { valid: false, discount: 0, promoId: null };

  try {
    const normalizedCode = code.trim().toLowerCase();

    const { data, error } = await supabase.rpc("validate_promo_code", {
      _code: normalizedCode,
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
 * Server-side price validation for Stripe checkout.
 * Fetches real prices from DB, rejects inactive products.
 */
async function validateCartPrices(
  serviceClient: any,
  cartItems: any[],
): Promise<{
  validatedItems: any[];
  serverSubtotal: number;
  serverTaxAmount: number;
}> {
  const productIds = cartItems.map((item: any) => item.product_id);

  const { data: products, error } = await serviceClient
    .from("products")
    .select("id, name, price_per_unit, is_weighted, is_active, tax_rate, unit_of_measure, description, image_url")
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

  const validatedItems = cartItems.map((item: any) => {
    const dbProduct = priceMap.get(item.product_id);
    if (!dbProduct) {
      throw new Error(`Product not found: ${item.product_id}`);
    }
    if (!dbProduct.is_active) {
      throw new Error(`Product is no longer available: ${dbProduct.name}`);
    }

    const serverPrice = dbProduct.price_per_unit;
    const isWeighted = dbProduct.is_weighted && item.weight;
    const lineTotal = isWeighted
      ? item.weight * serverPrice
      : item.quantity * serverPrice;

    serverSubtotal += lineTotal;

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
        description: dbProduct.description,
        image_url: dbProduct.image_url,
      },
    };
  });

  return {
    validatedItems,
    serverSubtotal: Math.round(serverSubtotal * 100) / 100,
    serverTaxAmount: Math.round(serverTaxAmount * 100) / 100,
  };
}

/**
 * Look up delivery fee from delivery_zones based on address distance.
 */
async function lookupDeliveryFeeForCheckout(
  serviceClient: any,
  userId: string,
  addressId: string | null,
): Promise<{ fee: number; distance: number | null; zone: string | null }> {
  if (!addressId) return { fee: 0, distance: null, zone: null };

  const { data: address } = await serviceClient
    .from("user_addresses")
    .select("distance_from_store")
    .eq("id", addressId)
    .eq("user_id", userId)
    .single();

  if (!address?.distance_from_store) return { fee: 0, distance: null, zone: null };

  const distance = address.distance_from_store;

  const { data: zones } = await serviceClient
    .from("delivery_zones")
    .select("delivery_fee, min_distance, max_distance, name")
    .lte("min_distance", distance)
    .gte("max_distance", distance)
    .limit(1);

  if (zones && zones.length > 0) {
    return {
      fee: zones[0].delivery_fee || 0,
      distance,
      zone: zones[0].name || null,
    };
  }

  return { fee: 0, distance, zone: null };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const clientIp = getClientIp(req);
    if (isRateLimitedByIp(clientIp, 30, 60)) {
      console.error(`Rate limit exceeded for IP: ${clientIp}`);
      return new Response(
        JSON.stringify({ error: "Too many requests, please try again later" }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const serviceClient = getServiceRoleClient();

    const authHeader = req.headers.get("Authorization");
    const userId = await authenticateRequest(authHeader, serviceClient, false);

    const requestBody = await req.json();
    const {
      cartItems: rawCartItems,
      comboCartItems,
      successUrl,
      cancelUrl,
      deliveryDate,
      deliveryTime,
      addressId,
      promoCode,
    } = requestBody;

    const fulfillmentType = requestBody.fulfillmentType || "delivery";

    console.log("Checkout request for user:", userId);

    const hasRegularItems = rawCartItems && Array.isArray(rawCartItems) && rawCartItems.length > 0;
    const hasComboItems = comboCartItems && Array.isArray(comboCartItems) && comboCartItems.length > 0;
    if (!hasRegularItems && !hasComboItems) {
      return new Response(JSON.stringify({ error: "Invalid cart items" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- SERVER-SIDE PRICE VALIDATION ---
    let cartItems: any[] = [];
    let subtotal = 0;
    let taxAmount = 0;

    if (hasRegularItems) {
      try {
        const validated = await validateCartPrices(serviceClient, rawCartItems);
        cartItems = validated.validatedItems;
        subtotal = validated.serverSubtotal;
        taxAmount = validated.serverTaxAmount;
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
    }

    // --- SERVER-SIDE COMBO PRICE CALCULATION ---
    let comboSubtotal = 0;
    if (hasComboItems) {
      const comboIds = comboCartItems.map((ci: any) => ci.combo_id);
      const { data: dbCombos } = await serviceClient
        .from("product_combos")
        .select("id, combo_price, combo_items(id, is_addon, addon_price)")
        .in("id", comboIds);

      const comboMap = new Map<string, any>();
      for (const c of dbCombos || []) comboMap.set(c.id, c);

      for (const comboItem of comboCartItems) {
        const dbCombo = comboMap.get(comboItem.combo_id);
        if (!dbCombo) continue;
        let itemTotal = dbCombo.combo_price;
        const addonMap = new Map<string, number>();
        for (const ci of dbCombo.combo_items || []) {
          if (ci.is_addon) addonMap.set(ci.id, ci.addon_price || 0);
        }
        for (const addonId of comboItem.selected_addon_ids || []) {
          itemTotal += addonMap.get(addonId) || 0;
        }
        comboSubtotal += itemTotal * comboItem.quantity;
      }
      console.log("Server-side combo subtotal:", comboSubtotal);
    }

    // --- SERVER-SIDE DELIVERY FEE ---
    let deliveryFee = 0;
    let deliveryDistance: number | null = null;
    let deliveryZone: string | null = null;

    if (fulfillmentType === "delivery" && addressId) {
      const deliveryInfo = await lookupDeliveryFeeForCheckout(serviceClient, userId, addressId);
      deliveryFee = deliveryInfo.fee;
      deliveryDistance = deliveryInfo.distance;
      deliveryZone = deliveryInfo.zone;
      console.log("Server-side delivery fee:", deliveryFee);
    }

    // Fetch user address if provided
    let addressData = null;
    if (addressId && fulfillmentType === "delivery") {
      const { data: userAddress } = await serviceClient
        .from("user_addresses")
        .select("*")
        .eq("id", addressId)
        .eq("user_id", userId)
        .single();

      addressData = userAddress;
    }

    const { data: profileData } = await serviceClient
      .from("profiles")
      .select("email, full_name, phone_number")
      .eq("id", userId)
      .single();

    const userEmail = (profileData && profileData.email) || null;

    if (!userEmail) {
      console.warn("No email address found for user with ID:", userId);
    } else {
      console.log("User email found:", userEmail);
    }

    // --- SERVER-SIDE PROMO CODE VALIDATION ---
    let validPromoCode: string | null = null;
    let validPromoCodeId: string | null = null;
    let discountAmount = 0;

    if (promoCode) {
      console.log("Validating promo code server-side:", promoCode);
      const promoResult = await validatePromoCode(
        serviceClient,
        promoCode,
        userId,
        subtotal + comboSubtotal,
      );

      if (promoResult.valid) {
        console.log("Promo code valid:", promoResult);
        validPromoCode = promoCode;
        validPromoCodeId = promoResult.promoId;
        discountAmount = promoResult.discount;
      } else {
        console.log("Promo code invalid:", promoResult);
      }
    }

    const lineItems = cartItems.map((item: any) => {
      const isWeighted = item.product.is_weighted && item.weight;
      const quantity = isWeighted
        ? Math.round(item.weight * 100)
        : item.quantity;
      const unitAmount = isWeighted
        ? Math.round(item.product.price_per_unit)
        : Math.round(item.product.price_per_unit * 100);

      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: isWeighted
              ? `${item.product.name} (${item.weight}${
                  item.product.unit_of_measure || "lb"
                })`
              : item.product.name,
            description: item.product.description || undefined,
            images: item.product.image_url
              ? [item.product.image_url]
              : undefined,
          },
          unit_amount: unitAmount,
        },
        quantity: quantity,
      };
    });

    // Add combo line items for Stripe
    if (hasComboItems) {
      for (const comboItem of comboCartItems) {
        const comboIds = [comboItem.combo_id];
        // We already fetched combo prices above, recalculate unit price
        const dbCombosForLine = await serviceClient
          .from("product_combos")
          .select("id, name, combo_price, image_url, combo_items(id, is_addon, addon_price)")
          .eq("id", comboItem.combo_id)
          .single();

        if (dbCombosForLine.data) {
          const dbCombo = dbCombosForLine.data;
          let unitPrice = dbCombo.combo_price;
          for (const addonId of comboItem.selected_addon_ids || []) {
            const addon = (dbCombo.combo_items || []).find((ci: any) => ci.id === addonId && ci.is_addon);
            if (addon) unitPrice += addon.addon_price || 0;
          }

          const selectedAddonCount = (comboItem.selected_addon_ids || []).length;
          lineItems.push({
            price_data: {
              currency: "usd",
              product_data: {
                name: `${dbCombo.name} (Combo)`,
                description: selectedAddonCount > 0 ? `Includes ${selectedAddonCount} add-on(s)` : undefined,
                images: dbCombo.image_url ? [dbCombo.image_url] : undefined,
              },
              unit_amount: Math.round(unitPrice * 100),
            },
            quantity: comboItem.quantity,
          });
        }
      }
    }

    // Add delivery fee as a line item only for delivery orders
    if (deliveryFee > 0 && fulfillmentType === "delivery") {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Delivery Fee",
            description: deliveryZone
              ? `${deliveryZone} (${deliveryDistance} miles)`
              : undefined,
          },
          unit_amount: Math.round(deliveryFee * 100),
        },
        quantity: 1,
      });
    }

    // Add tax as a line item
    if (taxAmount > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Tax",
            description: "Sales tax on taxable items",
          },
          unit_amount: Math.round(taxAmount * 100),
        },
        quantity: 1,
      });
    }

    // Add discount coupon if applicable
    let discountObject = {};
    if (discountAmount > 0) {
      try {
        const coupon = await stripe.coupons.create({
          name: validPromoCode || "Discount",
          amount_off: Math.round(discountAmount * 100),
          currency: "usd",
          duration: "once",
        });

        discountObject = {
          discounts: [
            {
              coupon: coupon.id,
            },
          ],
        };
      } catch (error) {
        console.error("Error creating Stripe coupon:", error);
      }
    }

    // Create a checkout session with server-validated values
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${cancelUrl}`,
      ...discountObject,
      customer_email: userEmail,
      metadata: {
        user_id: userId,
        user_email: userEmail || "",
        fulfillment_type: fulfillmentType,
        address_id: addressId || "",
        delivery_date: deliveryDate || "",
        delivery_time: deliveryTime || "",
        pickup_date: requestBody.pickupDate || "",
        pickup_time: requestBody.pickupTime || "",
        pickup_ready_at: requestBody.pickupReadyAt || "",
        promo_code: validPromoCode || "",
        promo_code_id: validPromoCodeId || "",
        discount_amount: discountAmount.toString(),
        delivery_fee: deliveryFee.toString(),
        delivery_distance: deliveryDistance?.toString() || "",
        delivery_zone: deliveryZone || "",
        tax_amount: taxAmount.toString(),
        taxable_amount: (subtotal + comboSubtotal).toString(),
        combo_subtotal: comboSubtotal.toString(),
      },
    });

    // Return the checkout session URL - Order will be created after successful payment
    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


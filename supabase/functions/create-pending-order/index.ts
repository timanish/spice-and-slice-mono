/**
 * create-pending-order
 *
 * Creates an order in "pending_review" status for admin review before payment.
 * Handles both card and cash payments, all fulfillment types (delivery, pickup, nationwide).
 *
 * Replaces: create-checkout and create-cash-order
 * Called from: CheckoutPage (both card and cash flows)
 *
 * Returns: { orderId, status: 'pending_review' }
 *
 * No payment is processed here. Admin reviews, adjusts, then customer confirms.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { isRateLimitedByIp, getClientIp } from "../_shared/rate-limiter.ts";
import { authenticateRequest } from "../_shared/clerk-auth.ts";
import {
  validateInput,
  validateAndEnrichCartItems,
  lookupDeliveryFee,
  validatePromoCode,
  calculateOrderTotal,
  fetchAddressSnapshot,
  validatePickupSlotCapacity,
  calculatePickupReminderTime,
} from "../_shared/order-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const getServiceRoleClient = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  return createClient(supabaseUrl, serviceRoleKey);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    console.log("Create pending order function called");

    const clientIp = getClientIp(req);

    // Rate limit: 30 requests per 60 seconds (accounts for both card and cash flows)
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

    const serviceClient = getServiceRoleClient();

    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
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
        requestData.comboCartItems,
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
        fulfillmentType: requestData.fulfillmentType,
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
      comboCartItems,
      fulfillmentType,
      addressId,
      deliveryDate,
      deliveryTime,
      pickupDate,
      pickupTime,
      paymentMethod,
      promoCode,
      userId,
    } = requestData;

    // --- SERVER-SIDE PRICE VALIDATION ---
    let cartItems: any[] = [];
    let subtotal = 0;
    let taxAmount = 0;

    if (rawCartItems && rawCartItems.length > 0) {
      try {
        const enriched = await validateAndEnrichCartItems(serviceClient, rawCartItems);
        cartItems = enriched.items;
        subtotal = enriched.serverSubtotal;
        taxAmount = enriched.serverTaxAmount;
      } catch (error) {
        console.error("Cart validation error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- COMBO ITEMS ---
    let comboSubtotal = 0;
    let enrichedComboItems: any[] = [];

    if (comboCartItems && comboCartItems.length > 0) {
      console.log("Processing combo cart items, length:", comboCartItems.length);
      for (const comboItem of comboCartItems) {
        console.log("Fetching combo:", comboItem.combo_id);
        const { data: combo, error: comboFetchError } = await serviceClient
          .from("product_combos")
          .select("id, name, combo_price, items:combo_items(product_id)")
          .eq("id", comboItem.combo_id)
          .single();

        if (comboFetchError) {
          console.error("Error fetching combo:", comboFetchError);
        }

        console.log("Combo fetched:", {
          combo_id: comboItem.combo_id,
          found: !!combo,
          combo_name: combo?.name,
          combo_price: combo?.combo_price,
          has_items_array: !!combo?.items,
          items_count: combo?.items?.length || 0,
        });

        if (combo) {
          comboSubtotal += combo.combo_price || 0;
          enrichedComboItems.push({
            ...comboItem,
            combo: {
              ...combo,
              name: combo.name,
              price: combo.combo_price,
            },
          });
        }
      }
      console.log("Enriched combo items total:", enrichedComboItems.length);
    }

    // --- DELIVERY FEE & ZONE ---
    let deliveryFee = 0;
    let deliveryDistance: number | null = null;
    let deliveryZone: string | null = null;

    if (fulfillmentType === "delivery" && addressId) {
      try {
        const feeData = await lookupDeliveryFee(serviceClient, userId, addressId);
        deliveryFee = feeData.fee;
        deliveryDistance = feeData.distance;
        deliveryZone = feeData.zone;
      } catch (error) {
        console.error("Delivery fee lookup error:", error);
        // Continue without delivery fee rather than fail
      }
    }

    // --- ADDRESS SNAPSHOT ---
    let addressData = null;
    if (fulfillmentType === "delivery" && addressId) {
      addressData = await fetchAddressSnapshot(serviceClient, userId, addressId);
    }

    // --- PROMO CODE ---
    let finalPromoCodeId: string | null = null;
    let finalPromoDiscount = 0;

    const combinedSubtotal = subtotal + comboSubtotal;
    if (promoCode) {
      try {
        const promoValidation = await validatePromoCode(
          serviceClient,
          promoCode,
          userId,
          combinedSubtotal,
        );

        if (promoValidation.valid) {
          finalPromoCodeId = promoValidation.promoId;
          finalPromoDiscount = promoValidation.discount;
          console.log(`Promo code applied: ${promoCode}, discount: ${finalPromoDiscount}`);
        } else {
          console.warn(`Promo code invalid: ${promoCode}`);
        }
      } catch (error) {
        console.error("Promo validation error:", error);
        // Continue without promo rather than fail
      }
    }

    // --- PICKUP VALIDATION ---
    if (fulfillmentType === "pickup") {
      const canBook = await validatePickupSlotCapacity(
        serviceClient,
        pickupDate || "",
        pickupTime || "",
      );

      if (!canBook) {
        return new Response(
          JSON.stringify({
            error: "Pickup slot is full. Please select a different time.",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // --- CALCULATE TOTAL ---
    const totalAmount = calculateOrderTotal(
      cartItems,
      finalPromoDiscount,
      deliveryFee,
      taxAmount,
      comboSubtotal,
    );

    // --- PICKUP REMINDER TIME ---
    let pickupReminderScheduledFor: string | null = null;
    if (fulfillmentType === "pickup" && pickupDate && pickupTime) {
      pickupReminderScheduledFor = calculatePickupReminderTime(
        pickupDate,
        pickupTime,
      );
    }

    console.log("Creating order with total:", totalAmount);

    // --- INSERT ORDER WITH pending_review STATUS ---
    const { data: order, error: orderError } = await serviceClient
      .from("orders")
      .insert({
        user_id: userId,
        total_amount: totalAmount,
        fulfillment_status: "pending_review", // NEW: Admin must review first
        payment_status: "pending", // No payment until confirmation
        payment_method: paymentMethod, // "card" or "cash"
        fulfillment_type: fulfillmentType,
        address_id: addressId || null,
        delivery_address_line1: addressData?.address_line1 || null,
        delivery_city: addressData?.city || null,
        delivery_state: addressData?.state || null,
        delivery_postal_code: addressData?.postal_code || null,
        delivery_address_label: addressData?.label || null,
        delivery_date: deliveryDate || null,
        delivery_time: deliveryTime || null,
        pickup_date: pickupDate || null,
        pickup_time: pickupTime || null,
        pickup_reminder_scheduled_for: pickupReminderScheduledFor,
        promo_code_id: finalPromoCodeId,
        discount_amount: finalPromoDiscount,
        delivery_fee: deliveryFee,
        delivery_distance: deliveryDistance,
        delivery_zone: deliveryZone,
        tax_amount: taxAmount,
        taxable_amount: subtotal + comboSubtotal,
      })
      .select()
      .single();

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

    // --- INSERT ORDER ITEMS ---
    const orderItems = cartItems.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.product.is_weighted && item.weight ? item.weight : item.quantity,
      original_quantity: item.product.is_weighted && item.weight ? item.weight : item.quantity,
      price_per_unit: item.product.price_per_unit,
      tax_rate: item.product.tax_rate || null,
      tax_amount: item.tax_amount || 0,
    }));

    if (orderItems.length > 0) {
      const { error: orderItemsError } = await serviceClient
        .from("order_items")
        .insert(orderItems);

      if (orderItemsError) {
        console.error("Error creating order items:", orderItemsError);
        // Non-blocking error - order is created
      } else {
        console.log("Order items created successfully");
      }
    }

    // --- INSERT COMBO ITEMS ---
    if (enrichedComboItems && enrichedComboItems.length > 0) {
      console.log("Processing combo items, enrichedComboItems.length:", enrichedComboItems.length);
      const comboOrderItems: any[] = [];

      for (const comboItem of enrichedComboItems) {
        console.log("Processing combo item:", {
          combo_id: comboItem.combo_id,
          combo_name: comboItem.combo?.name,
          has_items: !!comboItem.combo?.items,
          items_length: comboItem.combo?.items?.length || 0,
          items_preview: comboItem.combo?.items?.slice(0, 2),
        });

        const comboProducts = comboItem.combo?.items || [];
        const comboName = comboItem.combo?.name || "Combo";

        console.log("Combo products to insert:", {
          length: comboProducts.length,
          products: comboProducts,
        });

        for (let index = 0; index < comboProducts.length; index++) {
          comboOrderItems.push({
            order_id: order.id,
            product_id: comboProducts[index].product_id,
            quantity: 1,
            original_quantity: 1,
            price_per_unit: index === 0 ? comboItem.combo.price : 0,
            tax_rate: null,
            tax_amount: 0,
            combo_id: comboItem.combo_id,
            combo_name: comboName,
          });
        }
      }

      console.log("Total combo order items to insert:", comboOrderItems.length);
      console.log("Combo order items structure:", comboOrderItems.slice(0, 2));

      if (comboOrderItems.length > 0) {
        const { error: comboError } = await serviceClient
          .from("order_items")
          .insert(comboOrderItems);

        if (comboError) {
          console.error("Error creating combo items:", comboError);
          console.error("Failed items sample:", comboOrderItems.slice(0, 1));
        } else {
          console.log("Combo items created successfully, count:", comboOrderItems.length);
        }
      } else {
        console.warn("No combo order items to insert (comboProducts was empty or null for all combos)");
      }
    } else {
      console.log("No enriched combo items to process");
    }

    // --- CLEAR CART ---
    // Get user's cart_id from profiles
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("cart_id")
      .eq("id", userId)
      .single();

    if (profile?.cart_id) {
      await serviceClient
        .from("cart_items")
        .delete()
        .eq("cart_id", profile.cart_id);

      await serviceClient
        .from("cart_combo_items")
        .delete()
        .eq("cart_id", profile.cart_id);

      console.log("Cart cleared for user");
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId: order.id,
        status: "pending_review",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

/**
 * create-guest-pending-order
 *
 * Guest (no-login) variant of create-pending-order.
 * Differences from the authenticated flow:
 *   - No Clerk JWT; rejects any promo code; card-only payment
 *   - Inline address (not addressId); geocodes + zone-validates before insert
 *   - Creates/reuses a `is_guest=true` profile row, then proceeds identically
 *
 * Called from: CheckoutPage when signed out
 * Returns: { orderId, guestProfileId, status: 'pending_review' }
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getClientIp } from "../_shared/rate-limiter.ts";
import { alertError } from "../_shared/alert.ts";
import {
  validateInput,
  validateAndEnrichCartItems,
  calculateOrderTotal,
  validatePickupSlotCapacity,
  calculatePickupReminderTime,
  generateConfirmationToken,
} from "../_shared/order-helpers.ts";
import {
  findOrCreateGuestProfile,
  isGuestRateLimited,
  geocodeAndCalculateDistance,
  findDeliveryZoneByDistance,
  EMAIL_BELONGS_TO_REAL_USER,
} from "../_shared/guest-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GUEST_RATE_LIMIT = 5;
const GUEST_RATE_WINDOW_SECONDS = 3600; // 1 hour

const getServiceRoleClient = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  return createClient(supabaseUrl, serviceRoleKey);
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  let requestData: any = null;

  try {
    console.log("create-guest-pending-order called");

    const serviceClient = getServiceRoleClient();

    const clientIp = getClientIp(req);
    if (await isGuestRateLimited(serviceClient, clientIp, GUEST_RATE_LIMIT, GUEST_RATE_WINDOW_SECONDS)) {
      console.error(`Guest rate limit exceeded for IP: ${clientIp}`);
      return json(
        { error: "Too many checkout attempts. Please try again later." },
        429,
      );
    }

    try {
      requestData = await req.json();
    } catch (parseError: any) {
      return json({ error: "Invalid request body", details: parseError.message }, 400);
    }

    const {
      guest,
      address,
      cartItems: rawCartItems,
      comboCartItems,
      fulfillmentType,
      deliveryDate,
      deliveryTime,
      pickupDate,
      pickupTime,
      paymentMethod,
      promoCode,
    } = requestData;

    // --- GUEST FLOW GUARDS ---
    if (paymentMethod !== "card") {
      return json(
        { error: "Guest checkout only supports card payment. Please sign in to pay by cash." },
        400,
      );
    }

    if (promoCode) {
      return json(
        { error: "Promo codes are available for signed-in customers only." },
        400,
      );
    }

    if (!["delivery", "pickup"].includes(fulfillmentType)) {
      return json(
        { error: "Guest checkout supports delivery and pickup only." },
        400,
      );
    }

    // --- SHARED INPUT VALIDATION ---
    const validation = validateInput(
      rawCartItems,
      deliveryDate,
      deliveryTime,
      pickupDate,
      pickupTime,
      fulfillmentType,
      comboCartItems,
    );
    if (!validation.valid) {
      return json({ error: validation.error }, 400);
    }

    // --- GUEST CONTACT VALIDATION ---
    const guestEmail = (guest?.email || "").trim().toLowerCase();
    const guestPhone = (guest?.phone || "").trim();
    const guestFullName = (guest?.fullName || "").trim();

    if (!EMAIL_RE.test(guestEmail)) {
      return json({ error: "A valid email is required." }, 400);
    }
    if (guestPhone.length < 7) {
      return json({ error: "A valid phone number is required." }, 400);
    }
    if (guestFullName.length < 2) {
      return json({ error: "Full name is required." }, 400);
    }

    // --- DELIVERY ZONE PRE-CHECK (before creating profile/address) ---
    let deliveryFee = 0;
    let deliveryDistance: number | null = null;
    let deliveryZone: string | null = null;
    let geo: { latitude: number; longitude: number; distanceMiles: number } | null = null;

    if (fulfillmentType === "delivery") {
      if (!address?.addressLine1 || !address?.city || !address?.state || !address?.postalCode) {
        return json({ error: "Complete delivery address is required." }, 400);
      }

      const mapboxToken = Deno.env.get("MAPBOX_ACCESS_TOKEN") || "";
      if (!mapboxToken) {
        console.error("MAPBOX_ACCESS_TOKEN not configured");
        return json({ error: "Delivery unavailable at this time." }, 500);
      }

      try {
        const geoResult = await geocodeAndCalculateDistance(
          {
            addressLine1: address.addressLine1,
            addressLine2: address.addressLine2,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
          },
          mapboxToken,
        );
        geo = {
          latitude: geoResult.latitude,
          longitude: geoResult.longitude,
          distanceMiles: geoResult.distanceMiles,
        };
      } catch (geoError: any) {
        console.error("Geocoding failed:", geoError);
        return json({ error: geoError.message || "Address could not be located." }, 400);
      }

      const zoneMatch = await findDeliveryZoneByDistance(serviceClient, geo.distanceMiles);
      if (!zoneMatch) {
        return json(
          {
            error: "Delivery unavailable",
            details: `Your location (${geo.distanceMiles.toFixed(
              1,
            )} miles) is outside our delivery range. Please select pickup.`,
          },
          400,
        );
      }
      deliveryFee = zoneMatch.fee;
      deliveryDistance = geo.distanceMiles;
      deliveryZone = zoneMatch.zone;
    }

    // --- CART PRICE VALIDATION ---
    let cartItems: any[] = [];
    let subtotal = 0;
    let taxAmount = 0;

    if (rawCartItems && rawCartItems.length > 0) {
      try {
        const enriched = await validateAndEnrichCartItems(serviceClient, rawCartItems);
        cartItems = enriched.items;
        subtotal = enriched.serverSubtotal;
        taxAmount = enriched.serverTaxAmount;
      } catch (error: any) {
        return json({ error: error.message }, 400);
      }
    }

    // --- COMBO ITEMS (mirrors create-pending-order) ---
    let comboSubtotal = 0;
    const enrichedComboItems: any[] = [];

    if (comboCartItems && comboCartItems.length > 0) {
      for (const comboItem of comboCartItems) {
        const { data: combo, error: comboFetchError } = await serviceClient
          .from("product_combos")
          .select("id, name, combo_price")
          .eq("id", comboItem.combo_id)
          .single();

        if (comboFetchError || !combo) {
          return json({ error: `Combo not found: ${comboItem.combo_id}` }, 400);
        }

        const { data: comboItemsData, error: comboItemsError } = await serviceClient
          .from("combo_items")
          .select("id, product_id, is_addon, addon_price")
          .eq("combo_id", comboItem.combo_id);

        if (comboItemsError || !comboItemsData || comboItemsData.length === 0) {
          return json({ error: `Combo has no items: ${comboItem.combo_id}` }, 400);
        }

        const selectedAddonIds: string[] = comboItem.selected_addon_ids || [];
        const filteredItems = comboItemsData.filter(
          (ci: any) => !ci.is_addon || selectedAddonIds.includes(ci.id),
        );
        const addonSurcharge = filteredItems
          .filter((ci: any) => ci.is_addon)
          .reduce((sum: number, ci: any) => sum + (ci.addon_price || 0), 0);

        if (filteredItems.length > 0) {
          const totalComboPrice = (combo.combo_price || 0) + addonSurcharge;
          comboSubtotal += totalComboPrice;
          enrichedComboItems.push({
            ...comboItem,
            combo: {
              ...combo,
              name: combo.name,
              price: totalComboPrice,
              items: filteredItems,
            },
          });
        }
      }
    }

    // --- PICKUP CAPACITY CHECK ---
    if (fulfillmentType === "pickup") {
      const canBook = await validatePickupSlotCapacity(
        serviceClient,
        pickupDate || "",
        pickupTime || "",
      );
      if (!canBook) {
        return json(
          { error: "Pickup slot is full. Please select a different time." },
          400,
        );
      }
    }

    // --- FIND OR CREATE GUEST PROFILE ---
    let guestProfileId: string;
    try {
      const result = await findOrCreateGuestProfile(serviceClient, {
        email: guestEmail,
        phone: guestPhone,
        fullName: guestFullName,
      });
      guestProfileId = result.id;
    } catch (error: any) {
      if (error.code === EMAIL_BELONGS_TO_REAL_USER) {
        return json(
          {
            error: "ACCOUNT_EXISTS",
            details: "An account already exists for this email. Please sign in to continue.",
          },
          409,
        );
      }
      throw error;
    }

    // --- INSERT GUEST ADDRESS (delivery only) ---
    let addressId: string | null = null;
    let addressSnapshot: {
      address_line1: string;
      city: string;
      state: string;
      postal_code: string;
      label: string;
    } | null = null;

    if (fulfillmentType === "delivery" && address && geo) {
      const label = address.label?.trim() || "Delivery";
      const { data: addressRow, error: addressError } = await serviceClient
        .from("user_addresses")
        .insert({
          user_id: guestProfileId,
          label,
          address_line1: address.addressLine1,
          city: address.city,
          state: address.state,
          postal_code: address.postalCode,
          distance_from_store: geo.distanceMiles,
          latitude: geo.latitude,
          longitude: geo.longitude,
          distance_calculated_at: new Date().toISOString(),
          is_default: true,
          is_active: true,
        })
        .select("id, address_line1, city, state, postal_code, label")
        .single();

      if (addressError || !addressRow) {
        console.error("Failed to insert guest address:", addressError);
        return json({ error: "Failed to save delivery address." }, 500);
      }
      addressId = addressRow.id;
      addressSnapshot = {
        address_line1: addressRow.address_line1,
        city: addressRow.city,
        state: addressRow.state,
        postal_code: addressRow.postal_code,
        label: addressRow.label,
      };
    }

    // --- TOTAL + REMINDER TIME ---
    const totalAmount = calculateOrderTotal(
      cartItems,
      0, // no promo discount for guests
      deliveryFee,
      taxAmount,
      comboSubtotal,
    );

    let pickupReminderScheduledFor: string | null = null;
    if (fulfillmentType === "pickup" && pickupDate && pickupTime) {
      pickupReminderScheduledFor = calculatePickupReminderTime(pickupDate, pickupTime);
    }

    // --- INSERT ORDER ---
    const guestTrackingToken = generateConfirmationToken();

    const { data: order, error: orderError } = await serviceClient
      .from("orders")
      .insert({
        user_id: guestProfileId,
        total_amount: totalAmount,
        fulfillment_status: "pending_review",
        payment_status: "pending",
        payment_method: "card",
        fulfillment_type: fulfillmentType,
        address_id: addressId,
        guest_tracking_token: guestTrackingToken,
        delivery_address_line1: addressSnapshot?.address_line1 || null,
        delivery_city: addressSnapshot?.city || null,
        delivery_state: addressSnapshot?.state || null,
        delivery_postal_code: addressSnapshot?.postal_code || null,
        delivery_address_label: addressSnapshot?.label || null,
        delivery_date: deliveryDate || null,
        delivery_time: deliveryTime || null,
        pickup_date: pickupDate || null,
        pickup_time: pickupTime || null,
        pickup_reminder_scheduled_for: pickupReminderScheduledFor,
        promo_code_id: null,
        discount_amount: 0,
        delivery_fee: deliveryFee,
        delivery_distance: deliveryDistance,
        delivery_zone: deliveryZone,
        tax_amount: taxAmount,
        taxable_amount: subtotal + comboSubtotal,
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error("Error creating guest order:", orderError);
      return json(
        { error: "Failed to create order", details: orderError?.message },
        500,
      );
    }

    console.log("Guest order created:", order.id, "profile:", guestProfileId);

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
        // Non-blocking (same posture as create-pending-order)
      }
    }

    // --- INSERT COMBO ORDER ITEMS ---
    if (enrichedComboItems.length > 0) {
      const comboOrderItems: any[] = [];
      for (const comboItem of enrichedComboItems) {
        const comboProducts = comboItem.combo?.items || [];
        const comboName = comboItem.combo?.name || "Combo";
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
            is_addon: comboProducts[index].is_addon ?? false,
          });
        }
      }
      if (comboOrderItems.length > 0) {
        const { error: comboError } = await serviceClient
          .from("order_items")
          .insert(comboOrderItems);
        if (comboError) {
          console.error("Error creating combo order items:", comboError);
        }
      }
    }

    // --- SEND PENDING REVIEW EMAILS (non-blocking) ---
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    fetch(`${supabaseUrl}/functions/v1/send-order-status-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        orderId: order.id,
        newStatus: "pending_review",
        isAdminEmail: false,
      }),
    }).catch((e) => console.error("Failed to send customer email:", e));

    fetch(`${supabaseUrl}/functions/v1/send-order-status-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        orderId: order.id,
        newStatus: "pending_review",
        isAdminEmail: true,
      }),
    }).catch((e) => console.error("Failed to send admin email:", e));

    return json(
      {
        success: true,
        orderId: order.id,
        guestProfileId,
        guestTrackingToken,
        status: "pending_review",
      },
      200,
    );
  } catch (error: any) {
    console.error("Unexpected error in create-guest-pending-order:", error);
    await alertError(
      "create-guest-pending-order",
      error,
      {
        ip: requestData ? "captured" : "unknown",
        fulfillmentType: requestData?.fulfillmentType,
        hasAddress: !!requestData?.address,
      },
      "critical",
    );
    return json(
      { error: "Internal server error", details: error.message },
      500,
    );
  }
});

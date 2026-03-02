import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import Stripe from "https://esm.sh/stripe@13.8.0";
import { authenticateRequest } from "../_shared/clerk-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Create a service role client to bypass RLS
const getServiceRoleClient = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  return createClient(supabaseUrl, serviceRoleKey);
};

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const requestBody = await req.json();
    const { sessionId } = requestBody;

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "Missing sessionId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = getServiceRoleClient();

    // SECURITY: Authenticate request and get verified userId from JWT
    const authHeader = req.headers.get("Authorization");
    const userId = await authenticateRequest(authHeader, serviceClient, false);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    console.log("Stripe session retrieved:", {
      id: session.id,
      payment_status: session.payment_status,
      status: session.status,
    });

    if (session.payment_status !== "paid") {
      console.warn("Payment not completed:", session.payment_status);
      return new Response(
        JSON.stringify({
          error: "Payment not completed",
          payment_status: session.payment_status,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (session.status !== "complete") {
      console.warn("Session not complete:", session.status);
      return new Response(
        JSON.stringify({
          error: "Session not complete",
          status: session.status,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const {
      user_id,
      fulfillment_type,
      address_id,
      delivery_date,
      delivery_time,
      pickup_date,
      pickup_time,
      pickup_ready_at,
      promo_code,
      promo_code_id,
      discount_amount,
      delivery_fee,
      delivery_distance,
      delivery_zone,
      tax_amount,
      taxable_amount,
    } = session.metadata || {};

    if (user_id !== userId) {
      return new Response(JSON.stringify({ error: "User ID mismatch" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: cartItemsData, error: cartFetchError } = await serviceClient
      .from("cart_items")
      .select(
        `
        product_id,
        quantity,
        weight,
        tax_amount,
        product:products (
          id,
          name,
          price_per_unit,
          is_weighted,
          unit_of_measure,
          description,
          image_url,
          tax_rate,
          category:categories(id, name, tax_rate)
        )
      `,
      )
      .eq("user_id", userId);

    if (cartFetchError) {
      console.error("Error fetching cart items:", cartFetchError);
      throw new Error("Failed to fetch cart items");
    }

    const cartItems = cartItemsData || [];
    const discountAmt = discount_amount ? parseFloat(discount_amount) : 0;
    const deliveryFeeAmt = delivery_fee ? parseFloat(delivery_fee) : 0;
    const deliveryDistanceVal = delivery_distance
      ? parseFloat(delivery_distance)
      : null;
    const taxAmt = tax_amount ? parseFloat(tax_amount) : 0;
    const taxableAmt = taxable_amount ? parseFloat(taxable_amount) : 0;

    const totalAmount = session.amount_total ? session.amount_total / 100 : 0;

    let promoCodeId = promo_code_id || null;
    if (!promoCodeId && promo_code) {
      const { data: promoData } = await serviceClient
        .from("promo_codes")
        .select("id")
        .ilike("code", promo_code)
        .single();

      promoCodeId = promoData?.id || null;
    }

    let pickupReminderScheduledFor = null;
    if (fulfillment_type === "pickup" && pickup_date && pickup_time) {
      pickupReminderScheduledFor = calculatePickupReminderTime(
        pickup_date,
        pickup_time,
      );
      console.log("Pickup reminder scheduled for:", pickupReminderScheduledFor);
    }

    let addressSnapshot = {
      delivery_address_line1: null,
      delivery_city: null,
      delivery_state: null,
      delivery_postal_code: null,
      delivery_address_label: null,
    };

    if (fulfillment_type === "delivery" && address_id) {
      const { data: userAddress } = await serviceClient
        .from("user_addresses")
        .select("address_line1, city, state, postal_code, label")
        .eq("id", address_id)
        .eq("user_id", userId)
        .single();

      if (userAddress) {
        addressSnapshot = {
          delivery_address_line1: userAddress.address_line1,
          delivery_city: userAddress.city,
          delivery_state: userAddress.state,
          delivery_postal_code: userAddress.postal_code,
          delivery_address_label: userAddress.label,
        };
      }
    }

    // Retrieve payment method details from Stripe
    let cardDetails = {
      card_last4: null,
      card_brand: null,
      card_exp_month: null,
      card_exp_year: null,
    };

    if (session.payment_intent) {
      try {
        // Retrieve the PaymentIntent to get payment method
        const paymentIntent = await stripe.paymentIntents.retrieve(
          session.payment_intent as string,
        );

        if (paymentIntent.payment_method) {
          // Retrieve the PaymentMethod to get card details
          const paymentMethod = await stripe.paymentMethods.retrieve(
            paymentIntent.payment_method as string,
          );

          if (paymentMethod.card) {
            cardDetails = {
              card_last4: paymentMethod.card.last4,
              card_brand: paymentMethod.card.brand,
              card_exp_month: paymentMethod.card.exp_month,
              card_exp_year: paymentMethod.card.exp_year,
            };
            console.log("Card details retrieved:", cardDetails);
          }
        }
      } catch (error) {
        console.error("Error retrieving payment method details:", error);
        // Continue without card details - non-critical
      }
    }

    // Create the order
    const { data: order, error: orderError } = await serviceClient
      .from("orders")
      .insert({
        user_id: userId,
        total_amount: totalAmount,
        status: "confirmed", // Already paid via Stripe
        payment_method: "card",
        fulfillment_type: fulfillment_type || "delivery",
        address_id: address_id || null,
        // Save address snapshot (immutable)
        delivery_address_line1: addressSnapshot.delivery_address_line1,
        delivery_city: addressSnapshot.delivery_city,
        delivery_state: addressSnapshot.delivery_state,
        delivery_postal_code: addressSnapshot.delivery_postal_code,
        delivery_address_label: addressSnapshot.delivery_address_label,
        // Save card details (minimal info for display)
        card_last4: cardDetails.card_last4,
        card_brand: cardDetails.card_brand,
        card_exp_month: cardDetails.card_exp_month,
        card_exp_year: cardDetails.card_exp_year,
        delivery_date: delivery_date || null,
        delivery_time: delivery_time || null,
        pickup_date: pickup_date || null,
        pickup_time: pickup_time || null,
        pickup_ready_at: pickup_ready_at || null,
        pickup_reminder_scheduled_for: pickupReminderScheduledFor,
        promo_code_id: promoCodeId,
        discount_amount: discountAmt,
        delivery_fee: deliveryFeeAmt,
        delivery_distance: deliveryDistanceVal,
        delivery_zone: delivery_zone || null,
        tax_amount: taxAmt,
        taxable_amount: taxableAmt,
      })
      .select()
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      throw new Error("Failed to create order");
    }

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

    // Insert order items
    if (cartItems.length > 0) {
      const orderItems = cartItems.map((item: any) => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity:
          item.product.is_weighted && item.weight ? item.weight : item.quantity,
        price_per_unit: item.product.price_per_unit,
        tax_rate: item.product.tax_rate || null,
        tax_amount: item.tax_amount || 0,
      }));

      const { error: orderItemsError } = await serviceClient
        .from("order_items")
        .insert(orderItems);

      if (orderItemsError) {
        console.error("Error inserting order items:", orderItemsError);
      }
    }

    const { error: cartError } = await serviceClient
      .from("cart_items")
      .delete()
      .eq("user_id", userId);

    if (cartError) {
      console.error("Error clearing cart:", cartError);
    }

    return new Response(JSON.stringify({ success: true, orderId: order.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error completing order:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

/**
 * confirm-customer-order
 *
 * Validates confirmation token and initiates payment or confirms cash order.
 * Works with or without JWT (token-based access from email links).
 *
 * For cash orders: Sets fulfillment_status="confirmed", creates print job
 * For card orders: Creates Stripe checkout session, returns URL for redirect
 *
 * Called from: OrderConfirmPage (via email link or logged-in customer)
 *
 * Returns:
 * - Cash: { success: true, paymentMethod: 'cash', orderId }
 * - Card: { success: true, paymentMethod: 'card', stripeUrl, orderId }
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import Stripe from "https://esm.sh/stripe@14.15.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "");

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
    console.log("Confirm customer order function called");

    const serviceClient = getServiceRoleClient();

    // Note: confirm-customer-order does NOT use authHeader - token-based validation only
    let requestData;
    try {
      requestData = await req.json();
    } catch (parseError) {
      console.error("Error parsing request:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { orderId, token, action } = requestData;

    if (!orderId || !token) {
      return new Response(
        JSON.stringify({ error: "Missing orderId or token" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Fetch the order
    const { data: order, error: orderError } = await serviceClient
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("Order not found:", orderError);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // --- TOKEN VALIDATION ---
    if (order.confirmation_token !== token) {
      console.error("Invalid confirmation token");
      return new Response(
        JSON.stringify({ error: "Invalid confirmation token" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check expiration
    if (
      order.confirmation_token_expires_at &&
      new Date(order.confirmation_token_expires_at) < new Date()
    ) {
      console.error("Confirmation token expired");
      return new Response(
        JSON.stringify({
          error: "Confirmation link has expired. Please contact support.",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check status
    if (order.fulfillment_status !== "awaiting_customer_confirmation") {
      console.error("Order not awaiting confirmation:", order.fulfillment_status);
      return new Response(
        JSON.stringify({
          error: "Order is not awaiting confirmation",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // --- GET ORDER DETAILS (no confirmation) ---
    if (action === "get") {
      console.log("Fetching order details for:", orderId);

      // Fetch order items
      const { data: orderItems, error: itemsError } = await serviceClient
        .from("order_items")
        .select("id, product_id, quantity, original_quantity, price_per_unit, tax_amount, combo_id, combo_name, products(name)")
        .eq("order_id", orderId);

      if (itemsError) {
        console.error("Error fetching order items:", itemsError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch order items" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          order,
          orderItems: orderItems || [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // --- CASH PAYMENT FLOW ---
    if (order.payment_method === "cash") {
      console.log("Confirming cash order:", orderId);

      // Update order status to confirmed
      const { error: confirmError } = await serviceClient
        .from("orders")
        .update({
          fulfillment_status: "confirmed",
          payment_status: "completed",
          confirmation_token: null,
          confirmation_token_expires_at: null,
        })
        .eq("id", orderId);

      if (confirmError) {
        console.error("Error confirming order:", confirmError);
        return new Response(
          JSON.stringify({ error: "Failed to confirm order" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Create print job
      const { error: printError } = await serviceClient
        .from("print_jobs")
        .insert({ order_id: orderId });

      if (printError) {
        console.error("Error creating print job:", printError);
        // Non-blocking
      } else {
        console.log("Print job created for order:", orderId);
      }

      // Trigger confirmation email
      const origin = Deno.env.get("SUPABASE_URL") || "";
      await fetch(`${origin}/functions/v1/send-order-status-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          orderId,
          newStatus: "confirmed",
        }),
      });

      return new Response(
        JSON.stringify({
          success: true,
          paymentMethod: "cash",
          orderId,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // --- CARD PAYMENT FLOW ---
    if (order.payment_method === "card") {
      console.log("Creating Stripe session for card order:", orderId);

      // Fetch order items
      const { data: orderItems, error: itemsError } = await serviceClient
        .from("order_items")
        .select("*, product:products(name, is_weighted, unit_of_measure)")
        .eq("order_id", orderId);

      if (itemsError) {
        console.error("Error fetching order items:", itemsError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch order items" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Build Stripe line items
      const lineItems: any[] = [];
      const itemSet = new Set<string>();

      for (const item of orderItems || []) {
        if (itemSet.has(item.product_id)) continue;
        itemSet.add(item.product_id);

        const name = item.product?.name || "Product";
        const unitOfMeasure = item.product?.unit_of_measure || "unit";
        const isWeighted = item.product?.is_weighted;

        const displayName = isWeighted
          ? `${name} (${item.quantity}${unitOfMeasure})`
          : name;

        const quantity = isWeighted
          ? Math.round(item.quantity * 100)
          : item.quantity;
        const unitAmount = isWeighted
          ? Math.round(item.price_per_unit * 100)
          : Math.round(item.price_per_unit * 100 * item.quantity);

        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: { name: displayName },
            unit_amount: isWeighted ? unitAmount : Math.round(item.price_per_unit * 100),
          },
          quantity: isWeighted ? quantity : item.quantity,
        });
      }

      // Add delivery fee if applicable
      if (order.delivery_fee > 0) {
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: { name: "Delivery Fee" },
            unit_amount: Math.round(order.delivery_fee * 100),
          },
          quantity: 1,
        });
      }

      // Create Stripe session
      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: lineItems,
          mode: "payment",
          success_url: `${Deno.env.get("FRONTEND_URL") || "http://localhost:5173"}/order-success?session_id={CHECKOUT_SESSION_ID}&orderId=${orderId}`,
          cancel_url: `${Deno.env.get("FRONTEND_URL") || "http://localhost:5173"}/order-confirm/${orderId}?token=${token}`,
          metadata: {
            order_id: orderId,
            user_id: order.user_id,
          },
        });

        // Store session ID on order
        const { error: sessionError } = await serviceClient
          .from("orders")
          .update({
            stripe_session_id: session.id,
          })
          .eq("id", orderId);

        if (sessionError) {
          console.error("Error storing session ID:", sessionError);
          // Non-blocking
        }

        console.log("Stripe session created:", session.id);

        return new Response(
          JSON.stringify({
            success: true,
            paymentMethod: "card",
            stripeUrl: session.url,
            orderId,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          },
        );
      } catch (stripeError) {
        console.error("Stripe error:", stripeError);
        return new Response(
          JSON.stringify({
            error: "Failed to create payment session",
            details: stripeError.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    return new Response(
      JSON.stringify({ error: "Invalid payment method" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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

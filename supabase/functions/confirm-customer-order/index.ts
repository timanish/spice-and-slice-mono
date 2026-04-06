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
        .select("id, product_id, quantity, original_quantity, price_per_unit, tax_amount, combo_id, combo_name, original_product_id, original_product_name, products!product_id(name)")
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

    // --- CANCEL ORDER ACTION ---
    if (action === "cancel") {
      console.log("Customer cancelling order:", orderId);

      const { error: cancelError } = await serviceClient
        .from("orders")
        .update({
          fulfillment_status: "cancelled",
          cancelled_at: new Date().toISOString(),
          confirmation_token: null,
          confirmation_token_expires_at: null,
        })
        .eq("id", orderId);

      if (cancelError) {
        console.error("Error cancelling order:", cancelError);
        return new Response(
          JSON.stringify({ error: "Failed to cancel order" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const origin = Deno.env.get("SUPABASE_URL") || "";
      fetch(`${origin}/functions/v1/send-order-status-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
        body: JSON.stringify({ orderId, newStatus: "cancelled" }),
      }).catch((e) => console.error("Failed to send customer cancellation email:", e));

      fetch(`${origin}/functions/v1/send-order-status-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
        body: JSON.stringify({ orderId, newStatus: "cancelled", isAdminEmail: true }),
      }).catch((e) => console.error("Failed to send admin cancellation email:", e));

      return new Response(
        JSON.stringify({ success: true, orderId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // --- SUBMIT MODIFICATIONS ACTION ---
    // Customer rejects some admin changes and/or adds new items, sends back for review
    if (action === "submit_modifications") {
      const { modifications } = requestData;

      if (!modifications) {
        return new Response(
          JSON.stringify({ error: "Missing modifications" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { rejectedItemIds = [], deletedItemIds = [], newItems = [], customerNotes } = modifications;

      if (rejectedItemIds.length === 0 && deletedItemIds.length === 0 && newItems.length === 0 && !customerNotes?.trim()) {
        return new Response(
          JSON.stringify({ error: "No modifications provided" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Fetch current order items to validate ownership
      const { data: currentItems, error: currentItemsError } = await serviceClient
        .from("order_items")
        .select("id, product_id, quantity, original_quantity, original_product_id, price_per_unit")
        .eq("order_id", orderId);

      if (currentItemsError || !currentItems) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch order items" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const currentItemMap = new Map(currentItems.map((i: any) => [i.id, i]));

      // Process rejected items: revert to original quantity/product
      for (const itemId of rejectedItemIds) {
        const item = currentItemMap.get(itemId);

        // Security: item must belong to this order
        if (!item) {
          return new Response(
            JSON.stringify({ error: `Item ${itemId} not found in this order` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        if (!item.original_quantity) {
          return new Response(
            JSON.stringify({ error: `Item ${itemId} was not admin-adjusted and cannot be reverted` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        // Determine original product (may have been substituted)
        const originalProductId = item.original_product_id ?? item.product_id;
        const revertedQty = item.original_quantity;

        // Fetch tax rate for original product
        const { data: origProduct } = await serviceClient
          .from("products")
          .select("tax_rate")
          .eq("id", originalProductId)
          .single();

        const taxRate = origProduct?.tax_rate ?? 0;
        const newTaxAmount = Math.round(revertedQty * item.price_per_unit * (taxRate / 100) * 100) / 100;

        await serviceClient
          .from("order_items")
          .update({
            quantity: revertedQty,
            product_id: originalProductId,
            original_quantity: null,
            original_product_id: null,
            original_product_name: null,
            tax_amount: newTaxAmount,
          })
          .eq("id", itemId);
      }

      // Process deleted items: remove from order_items entirely
      if (deletedItemIds.length > 0) {
        // Security: all IDs must belong to this order
        const validIds = currentItems.map((i: any) => i.id);
        for (const itemId of deletedItemIds) {
          if (!validIds.includes(itemId)) {
            return new Response(
              JSON.stringify({ error: `Item ${itemId} not found in this order` }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
        }

        // Prevent deleting all items (must have at least 1 remaining)
        const remainingCount = currentItems.length - deletedItemIds.length + newItems.length;
        if (remainingCount < 1) {
          return new Response(
            JSON.stringify({ error: "Cannot remove all items from the order. Cancel the order instead." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        await serviceClient
          .from("order_items")
          .delete()
          .in("id", deletedItemIds);
      }

      // Process new items: insert into order_items
      for (const newItem of newItems) {
        const { data: product } = await serviceClient
          .from("products")
          .select("name, price_per_unit, tax_rate, is_active")
          .eq("id", newItem.productId)
          .single();

        if (!product || !product.is_active) {
          return new Response(
            JSON.stringify({ error: `Product ${newItem.productId} not found or unavailable` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const taxAmount = Math.round(newItem.quantity * product.price_per_unit * ((product.tax_rate || 0) / 100) * 100) / 100;

        await serviceClient
          .from("order_items")
          .insert({
            order_id: orderId,
            product_id: newItem.productId,
            quantity: newItem.quantity,
            price_per_unit: product.price_per_unit,
            tax_amount: taxAmount,
          });
      }

      // Recalculate order totals from fresh data
      const { data: updatedItems } = await serviceClient
        .from("order_items")
        .select("quantity, price_per_unit, tax_amount")
        .eq("order_id", orderId);

      const newSubtotal = (updatedItems || []).reduce(
        (sum: number, item: any) => sum + item.quantity * item.price_per_unit,
        0,
      );
      const newTax = (updatedItems || []).reduce(
        (sum: number, item: any) => sum + (item.tax_amount || 0),
        0,
      );
      const newTotal = Math.max(
        newSubtotal + newTax + order.delivery_fee - (order.discount_amount || 0),
        0,
      );

      // Set order back to pending_review and invalidate token
      await serviceClient
        .from("orders")
        .update({
          fulfillment_status: "pending_review",
          confirmation_token: null,
          confirmation_token_expires_at: null,
          taxable_amount: newSubtotal,
          tax_amount: newTax,
          total_amount: newTotal,
          customer_notes: customerNotes?.trim() || null,
        })
        .eq("id", orderId);

      // Notify admin (non-blocking)
      const origin = Deno.env.get("SUPABASE_URL") || "";
      fetch(`${origin}/functions/v1/send-order-status-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ orderId, newStatus: "pending_review", isAdminEmail: true }),
      }).catch((e) => console.error("Failed to send admin notification:", e));

      return new Response(
        JSON.stringify({ success: true, orderId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
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

      // Trigger confirmation emails (customer + admin)
      const origin = Deno.env.get("SUPABASE_URL") || "";

      // Customer confirmation email
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

      // Admin notification email
      await fetch(`${origin}/functions/v1/send-order-status-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          orderId,
          newStatus: "confirmed",
          isAdminEmail: true,
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
        .select("*, products!product_id(name, is_weighted, unit_of_measure)")
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

        const name = item.products?.name || "Product";
        const unitOfMeasure = item.products?.unit_of_measure || "unit";
        const isWeighted = item.products?.is_weighted;

        const displayName = isWeighted
          ? `${name} (${item.quantity}${unitOfMeasure})`
          : name;

        // For weighted items: Stripe can't handle decimal quantities, so use qty=1 with
        // the full line total as the unit_amount (e.g. 2.5kg × $10/kg → qty=1, $25.00).
        // For non-weighted: use the per-unit price and integer quantity normally.
        const stripeUnitAmount = isWeighted
          ? Math.round(item.quantity * item.price_per_unit * 100)
          : Math.round(item.price_per_unit * 100);
        const stripeQuantity = isWeighted ? 1 : item.quantity;

        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: { name: displayName },
            unit_amount: stripeUnitAmount,
          },
          quantity: stripeQuantity,
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

        // Notify admin that customer confirmed and is proceeding to payment
        const origin = Deno.env.get("SUPABASE_URL") || "";
        try {
          await fetch(`${origin}/functions/v1/send-order-status-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              orderId,
              newStatus: "confirmed",
              isAdminEmail: true,
            }),
          });
        } catch (emailError) {
          console.error("Failed to send admin notification:", emailError);
          // Non-blocking
        }

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

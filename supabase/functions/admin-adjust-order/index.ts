/**
 * admin-adjust-order
 *
 * Allows admin to:
 * 1. Adjust item quantities before customer confirmation
 * 2. Send order for customer confirmation (generates token, triggers email)
 * 3. Cancel the order
 *
 * Called from: AdminOrdersManagementPage (admin panel)
 *
 * Three actions:
 * - adjust_items: Update quantities, recalculate totals
 * - send_for_confirmation: Generate token, set status, send email
 * - cancel: Cancel the order
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { authenticateRequest } from "../_shared/clerk-auth.ts";
import {
  generateConfirmationToken,
  getConfirmationTokenExpiry,
} from "../_shared/order-helpers.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const SENDER_EMAIL = "SpiceAndSlice <orders@management.spiceandslice.shop>";

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
    console.log("Admin adjust order function called");

    const serviceClient = getServiceRoleClient();

    const authHeader = req.headers.get("Authorization");
    let verifiedUserId: string;

    try {
      verifiedUserId = await authenticateRequest(
        authHeader,
        serviceClient,
        true, // Require admin
      );
      console.log("Admin authenticated:", verifiedUserId);
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

    const { action, orderId, itemAdjustments, adminNotes } = requestData;

    if (!action || !orderId) {
      return new Response(
        JSON.stringify({ error: "Missing action or orderId" }),
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
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // --- ADJUST_ITEMS ACTION ---
    if (action === "adjust_items") {
      if (!itemAdjustments || itemAdjustments.length === 0) {
        return new Response(
          JSON.stringify({ error: "No item adjustments provided" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Verify order is in a state that allows adjustments
      if (!["pending_review", "awaiting_customer_confirmation"].includes(order.fulfillment_status)) {
        return new Response(
          JSON.stringify({
            error: "Order cannot be adjusted in current status",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Apply adjustments to order_items
      for (const adj of itemAdjustments) {
        const { orderItemId, newQuantity, newPricePerUnit } = adj;

        // Fetch the order item to check if original_quantity is already set
        const { data: item } = await serviceClient
          .from("order_items")
          .select("original_quantity, quantity")
          .eq("id", orderItemId)
          .single();

        // Set original_quantity if this is the first adjustment
        const originalQty = item?.original_quantity || item?.quantity;

        const updateData: any = {
          quantity: newQuantity,
        };

        if (item && !item.original_quantity) {
          updateData.original_quantity = originalQty;
        }

        if (newPricePerUnit !== undefined) {
          updateData.price_per_unit = newPricePerUnit;
        }

        const { error: updateError } = await serviceClient
          .from("order_items")
          .update(updateData)
          .eq("id", orderItemId);

        if (updateError) {
          console.error("Error updating order item:", updateError);
          return new Response(
            JSON.stringify({
              error: "Failed to update order item",
              details: updateError.message,
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      }

      // Recalculate order total
      const { data: items } = await serviceClient
        .from("order_items")
        .select("quantity, price_per_unit, tax_amount")
        .eq("order_id", orderId);

      if (items && items.length > 0) {
        const newSubtotal = items.reduce(
          (sum: number, item: any) => sum + item.quantity * item.price_per_unit,
          0,
        );
        const newTax = items.reduce(
          (sum: number, item: any) => sum + (item.tax_amount || 0),
          0,
        );
        const newTotal = Math.max(
          newSubtotal + newTax + order.delivery_fee - order.discount_amount,
          0,
        );

        const { error: updateTotalError } = await serviceClient
          .from("orders")
          .update({
            total_amount: newTotal,
            taxable_amount: newSubtotal,
          })
          .eq("id", orderId);

        if (updateTotalError) {
          console.error("Error updating order total:", updateTotalError);
        } else {
          console.log("Order total recalculated:", newTotal);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Order items adjusted",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // --- SEND_FOR_CONFIRMATION ACTION ---
    if (action === "send_for_confirmation") {
      if (order.fulfillment_status !== "pending_review") {
        return new Response(
          JSON.stringify({
            error: "Order must be in pending_review status to send for confirmation",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Apply any adjustments first if provided
      if (itemAdjustments && itemAdjustments.length > 0) {
        for (const adj of itemAdjustments) {
          const { orderItemId, newQuantity, newPricePerUnit } = adj;

          const { data: item } = await serviceClient
            .from("order_items")
            .select("original_quantity, quantity")
            .eq("id", orderItemId)
            .single();

          const originalQty = item?.original_quantity || item?.quantity;

          const updateData: any = { quantity: newQuantity };
          if (item && !item.original_quantity) {
            updateData.original_quantity = originalQty;
          }
          if (newPricePerUnit !== undefined) {
            updateData.price_per_unit = newPricePerUnit;
          }

          await serviceClient
            .from("order_items")
            .update(updateData)
            .eq("id", orderItemId);
        }

        // Recalculate totals
        const { data: items } = await serviceClient
          .from("order_items")
          .select("quantity, price_per_unit, tax_amount")
          .eq("order_id", orderId);

        if (items && items.length > 0) {
          const newSubtotal = items.reduce(
            (sum: number, item: any) => sum + item.quantity * item.price_per_unit,
            0,
          );
          const newTax = items.reduce(
            (sum: number, item: any) => sum + (item.tax_amount || 0),
            0,
          );
          const newTotal = Math.max(
            newSubtotal + newTax + order.delivery_fee - order.discount_amount,
            0,
          );

          await serviceClient
            .from("orders")
            .update({
              total_amount: newTotal,
              taxable_amount: newSubtotal,
            })
            .eq("id", orderId);
        }
      }

      // Generate confirmation token
      const token = generateConfirmationToken();
      const expiresAt = getConfirmationTokenExpiry();

      const { error: tokenError } = await serviceClient
        .from("orders")
        .update({
          confirmation_token: token,
          confirmation_token_expires_at: expiresAt,
          fulfillment_status: "awaiting_customer_confirmation",
        })
        .eq("id", orderId);

      if (tokenError) {
        console.error("Error setting confirmation token:", tokenError);
        return new Response(
          JSON.stringify({
            error: "Failed to generate confirmation token",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Fetch customer email
      const { data: profile } = await serviceClient
        .from("profiles")
        .select("email, full_name")
        .eq("id", order.user_id)
        .single();

      if (!profile?.email) {
        console.error("Customer email not found");
        return new Response(
          JSON.stringify({ error: "Customer email not found" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Trigger send-order-status-email via fetch
      const origin = Deno.env.get("SUPABASE_URL") || "";
      const emailResponse = await fetch(
        `${origin}/functions/v1/send-order-status-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            orderId,
            newStatus: "awaiting_customer_confirmation",
            confirmationToken: token,
          }),
        },
      );

      if (!emailResponse.ok) {
        const errorBody = await emailResponse.text();
        console.error("Email send failed:", emailResponse.status, errorBody);
        // Non-blocking - order is still created, email can be retried
      } else {
        console.log("Confirmation email sent successfully");
      }

      return new Response(
        JSON.stringify({
          success: true,
          confirmationToken: token,
          tokenExpiresAt: expiresAt,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // --- CANCEL ACTION ---
    if (action === "cancel") {
      const { error: cancelError } = await serviceClient
        .from("orders")
        .update({
          fulfillment_status: "cancelled",
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (cancelError) {
        console.error("Error cancelling order:", cancelError);
        return new Response(
          JSON.stringify({ error: "Failed to cancel order" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Trigger cancellation email
      const origin = Deno.env.get("SUPABASE_URL") || "";
      await fetch(`${origin}/functions/v1/send-order-status-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          orderId,
          newStatus: "cancelled",
        }),
      });

      return new Response(
        JSON.stringify({ success: true, message: "Order cancelled" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
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

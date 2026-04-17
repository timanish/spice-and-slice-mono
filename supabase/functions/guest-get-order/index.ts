/**
 * guest-get-order
 *
 * Read-only fetch of a guest order by { orderId, token }. The token is the
 * long-lived orders.guest_tracking_token set at creation by
 * create-guest-pending-order. Stays valid for the order's lifetime so the
 * guest can revisit the tracking page at any stage.
 *
 * Returns the order row, its items, and the guest profile's display name.
 * Rejects if the order is not a guest order (no tracking token set) or the
 * supplied token does not match — prevents token-less enumeration and
 * scoping a tracking token to an authenticated order.
 *
 * Called from: GuestOrderTrackingPage
 * Returns: { order, orderItems, customerName }
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { alertError } from "../_shared/alert.ts";

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

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const serviceClient = getServiceRoleClient();

    let requestData: { orderId?: string; token?: string };
    try {
      requestData = await req.json();
    } catch (parseError: any) {
      return json({ error: "Invalid request body", details: parseError.message }, 400);
    }

    const { orderId, token } = requestData;

    if (!orderId || !token) {
      return json({ error: "Missing orderId or token" }, 400);
    }

    const { data: order, error: orderError } = await serviceClient
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return json({ error: "Order not found" }, 404);
    }

    if (!order.guest_tracking_token || order.guest_tracking_token !== token) {
      return json({ error: "Invalid tracking token" }, 403);
    }

    const { data: orderItems } = await serviceClient
      .from("order_items")
      .select(
        "id, product_id, quantity, original_quantity, price_per_unit, tax_amount, combo_id, combo_name, is_addon, original_product_name, products!product_id(name, image_url, unit_of_measure, is_weighted)",
      )
      .eq("order_id", orderId);

    const { data: profile } = await serviceClient
      .from("profiles")
      .select("full_name, email")
      .eq("id", order.user_id)
      .maybeSingle();

    return json(
      {
        success: true,
        order,
        orderItems: orderItems || [],
        customerName: profile?.full_name || "",
        customerEmail: profile?.email || "",
      },
      200,
    );
  } catch (error: any) {
    console.error("Unexpected error in guest-get-order:", error);
    await alertError("guest-get-order", error, {}, "warning");
    return json({ error: "Internal server error", details: error.message }, 500);
  }
});

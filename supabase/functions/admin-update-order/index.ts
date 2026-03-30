import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { authenticateRequest } from "../_shared/clerk-auth.ts";

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
    const serviceClient = getServiceRoleClient();

    const authHeader = req.headers.get("Authorization");
    await authenticateRequest(authHeader, serviceClient, true);

    const { orderId, status, estimatedTime, notes } = await req.json();

    if (!orderId || !status) {
      return new Response(
        JSON.stringify({ error: "Missing orderId or status" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Build update data
    const updateData: any = { fulfillment_status: status };

    if (status === "delivered") {
      updateData.status = "completed";
    }

    if (status === "cancelled") {
      updateData.cancelled_at = new Date().toISOString();
    }

    // Update order
    const { error: updateError } = await serviceClient
      .from("orders")
      .update(updateData)
      .eq("id", orderId);

    if (updateError) {
      console.error("Error updating order:", updateError);
      return new Response(
        JSON.stringify({
          error: "Failed to update order",
          details: updateError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Send status update email (fire and forget - don't block response)
    try {
      console.log("Attempting to send order status email:", { orderId, status });
      const emailResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-order-status-email`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId,
            newStatus: status,
            estimatedTime,
            driverNotes: notes,
          }),
        },
      );

      const emailData = await emailResponse.text();
      if (!emailResponse.ok) {
        console.error("Error sending status email - Status:", emailResponse.status, "Response:", emailData);
      } else {
        console.log("Order status email sent successfully:", emailData);
      }
    } catch (emailError) {
      console.error("Failed to send status email - Network error:", emailError);
      // Don't fail the request if email fails
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Authentication failed:", error);
    return new Response(
      JSON.stringify({
        error: "Authentication failed",
        details: error.message,
      }),
      {
        status: error.message.includes("Admin access required") ? 403 : 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

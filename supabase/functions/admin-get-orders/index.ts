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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const serviceClient = getServiceRoleClient();

    // SECURITY: Authenticate and verify admin role
    const authHeader = req.headers.get("Authorization");
    let adminUserId: string;

    try {
      // requireAdmin = true for server-side admin verification
      adminUserId = await authenticateRequest(authHeader, serviceClient, true);
      console.log("Admin authenticated:", adminUserId);
    } catch (authError) {
      console.error("Admin authentication failed:", authError);
      return new Response(
        JSON.stringify({
          error:
            authError.message === "Admin access required"
              ? "Forbidden - Admin access required"
              : "Unauthorized",
          details: authError.message,
        }),
        {
          status: authError.message === "Admin access required" ? 403 : 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Parse request parameters
    const { filters } = await req.json();

    // Build query with filters
    let query = serviceClient
      .from("orders")
      .select(
        `
        *,
        profiles:user_id (
          full_name,
          email,
          phone_number
        ),
        user_addresses (
          label,
          address_line1,
          city,
          state,
          postal_code
        ),
        order_items (
          id,
          quantity,
          original_quantity,
          original_product_name,
          price_per_unit,
          combo_id,
          combo_name,
          product_id,
          products!product_id (
            name,
            image_url
          )
        )
      `,
      )
      .order("created_at", { ascending: false });

    // Apply filters if provided
    if (filters?.status && filters.status !== "all") {
      query = query.eq("fulfillment_status", filters.status);
    }

    if (filters?.fulfillmentType && filters.fulfillmentType !== "all") {
      query = query.eq("fulfillment_type", filters.fulfillmentType);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error("Error fetching orders:", error);
      throw error;
    }

    // Debug logging for first order (if exists)
    if (orders && orders.length > 0) {
      const firstOrder = orders[0];
      console.log("First order fetched:", {
        orderId: firstOrder.id,
        fulfillment_status: firstOrder.fulfillment_status,
        itemsCount: firstOrder.order_items?.length || 0,
        itemsSample: firstOrder.order_items?.slice(0, 2),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        orders,
        adminUserId, // Include admin ID for audit trail
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in admin-get-orders:", error);
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

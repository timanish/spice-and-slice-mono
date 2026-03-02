import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-printer-api-key",
};

const getServiceRoleClient = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  return createClient(supabaseUrl, serviceRoleKey);
};

const validatePrinterApiKey = (req: Request): boolean => {
  const apiKey = req.headers.get("x-printer-api-key");
  const expectedKey = Deno.env.get("PRINTER_API_KEY");

  if (!expectedKey) {
    console.error("PRINTER_API_KEY not configured");
    return false;
  }

  return apiKey === expectedKey;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Validate printer API key
    if (!validatePrinterApiKey(req)) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing API key" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const serviceClient = getServiceRoleClient();

    // Fetch pending print jobs with full order details
    const { data: jobs, error } = await serviceClient
      .from("print_jobs")
      .select(`
        id,
        order_id,
        created_at,
        order:orders (
          id,
          total_amount,
          fulfillment_type,
          delivery_date,
          delivery_time,
          pickup_date,
          pickup_time,
          delivery_address_line1,
          delivery_city,
          delivery_state,
          delivery_postal_code,
          payment_method,
          discount_amount,
          tax_amount,
          delivery_fee,
          card_last4,
          card_brand,
          created_at,
          profiles:user_id (
            full_name,
            phone_number,
            email
          ),
          order_items (
            quantity,
            price_per_unit,
            products (
              name
            )
          )
        )
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching print jobs:", error);
      throw error;
    }

    return new Response(
      JSON.stringify({ jobs: jobs || [] }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in printer-get-jobs:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

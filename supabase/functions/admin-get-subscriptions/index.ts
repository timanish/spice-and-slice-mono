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

    try {
      // requireAdmin = true for server-side admin verification
      await authenticateRequest(authHeader, serviceClient, true);
      console.log("Admin authenticated for subscriptions query");
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

    // Fetch all subscriptions (admin-only operation)
    const { data: subscriptions, error } = await serviceClient
      .from("lunch_box_subscriptions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching subscriptions:", error);
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscriptions,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in admin-get-subscriptions:", error);
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

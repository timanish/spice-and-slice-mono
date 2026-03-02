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
  return apiKey === expectedKey;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    if (!validatePrinterApiKey(req)) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing API key" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { jobId } = await req.json();

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: "Missing jobId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const serviceClient = getServiceRoleClient();

    // Attempt to claim the job (only if still pending)
    const { data, error } = await serviceClient
      .from("print_jobs")
      .update({
        status: "claimed",
        claimed_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .eq("status", "pending")
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned - job was already claimed or doesn't exist
        return new Response(
          JSON.stringify({ error: "Job already claimed or not found" }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true, job: data }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in printer-claim-job:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

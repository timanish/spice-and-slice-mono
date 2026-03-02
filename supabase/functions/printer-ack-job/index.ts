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

    const { jobId, success, error: printError } = await req.json();

    if (!jobId || typeof success !== "boolean") {
      return new Response(
        JSON.stringify({ error: "Missing jobId or success field" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const serviceClient = getServiceRoleClient();

    if (success) {
      // Mark as printed
      const { error } = await serviceClient
        .from("print_jobs")
        .update({
          status: "printed",
          printed_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      if (error) throw error;
    } else {
      // Mark as failed, increment retry count
      const { data: job } = await serviceClient
        .from("print_jobs")
        .select("retry_count")
        .eq("id", jobId)
        .single();

      const newRetryCount = (job?.retry_count || 0) + 1;

      const { error } = await serviceClient
        .from("print_jobs")
        .update({
          status: "failed",
          retry_count: newRetryCount,
          failed_at: new Date().toISOString(),
          error_message: printError || "Unknown error",
        })
        .eq("id", jobId);

      if (error) throw error;
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in printer-ack-job:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

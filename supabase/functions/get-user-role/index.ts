// deno-lint-ignore-file no-explicit-any
/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { authenticateRequest } from "../_shared/clerk-auth.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    // Verify Clerk JWT — extract userId from token instead of body
    // Try both cases - Supabase may lowercase headers
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    let userId;
    console.log("Checking Clerk secrets...");
    console.log("CLERK_ISSUER_URL:", Deno.env.get("CLERK_ISSUER_URL") ? "SET" : "MISSING");
    console.log("CLERK_JWKS_URL:", Deno.env.get("CLERK_JWKS_URL") ? "SET" : "MISSING");
    console.log("Auth header present:", !!authHeader);

    try {
      userId = await authenticateRequest(authHeader, supabase, false);
      console.log("JWT verification successful, userId:", userId);
    } catch (authError) {
      console.error("Authentication failed - Error:", authError);
      if (authError instanceof Error) {
        console.error("Error name:", authError.name);
        console.error("Error message:", authError.message);
      }
      return new Response(JSON.stringify({
        error: "Unauthorized",
        message: authError instanceof Error ? authError.message : String(authError),
        isAdmin: false
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Query the user's role using verified userId
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId).single();
    if (error) {
      console.error("Error fetching user role:", error);
      return new Response(JSON.stringify({
        isAdmin: false,
        role: "user"
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const isAdmin = data?.role === "admin";
    return new Response(JSON.stringify({
      isAdmin,
      role: data?.role || "user"
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error in get-user-role:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      isAdmin: false
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});

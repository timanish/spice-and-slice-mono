
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { applyRateLimiter, getClientIp } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Check if the request should be rate limited
    const rateLimitResponse = await applyRateLimiter(req);
    if (rateLimitResponse) {
      // Return the rate limit response with CORS headers
      const headers = new Headers(rateLimitResponse.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });
      
      return new Response(rateLimitResponse.body, {
        status: rateLimitResponse.status,
        headers
      });
    }

    // If not rate limited, proxy the request to the original endpoint
    const url = new URL(req.url);
    const targetUrl = `${url.origin}${url.pathname}${url.search}`;
    
    const headers = new Headers(req.headers);
    
    // Forward the request
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.body,
    });
    
    // Return the response with CORS headers
    const responseHeaders = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      responseHeaders.set(key, value);
    });
    
    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Error in api-rate-limiter:", error);
    
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

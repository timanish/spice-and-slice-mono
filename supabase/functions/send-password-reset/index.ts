import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";
import {
  isRateLimitedByIp,
  isRateLimitedByEmail,
  getClientIp,
} from "../_shared/rate-limiter.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Create Supabase client with service role for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const SENDER_EMAIL =
  "SpiceAndSlice Contact <contact@management.spiceandslice.shop>";
const SITE_URL = "https://www.spiceandslice.shop";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    console.log("Password reset request received");

    // Get client IP for rate limiting
    const clientIp = getClientIp(req);

    // IP-based rate limiting: 10 requests per 60 seconds
    if (isRateLimitedByIp(clientIp, 10, 60)) {
      console.error(`Rate limit exceeded for IP: ${clientIp}`);
      return new Response(
        JSON.stringify({ error: "Too many requests, please try again later" }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const { email } = await req.json();

    // Validate required fields
    if (!email) {
      console.error("Email is required");
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Email-based rate limiting: 3 password reset requests per hour
    if (isRateLimitedByEmail(email, 3, 3600)) {
      console.error(`Password reset rate limit exceeded for: ${email}`);
      return new Response(
        JSON.stringify({
          error: "Too many password reset requests. Please try again later.",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Processing password reset for: ${email}`);

    // Check if user exists by querying the profiles table
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("email", email)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      console.error("Error checking user:", profileError);
      throw new Error("Error checking user existence");
    }

    if (!profileData) {
      // Don't reveal if email exists or not for security reasons
      console.log(
        `User not found for email: ${email}, but returning success for security`
      );
      return new Response(
        JSON.stringify({
          success: true,
          message:
            "If an account with that email exists, we've sent a password reset link.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate a password reset token using Supabase auth
    // Note: This edge function is for Supabase Auth password reset
    // With Clerk, password reset is handled through Clerk's API
    // This function may not be needed anymore
    const { data, error: resetError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: email,
      options: {
        redirectTo: `${SITE_URL}/reset-password`,
      },
    });

    if (resetError) {
      console.error("Error generating reset link:", resetError);
      throw new Error("Failed to generate password reset link");
    }

    console.log("Password reset link generated successfully");
    console.log("Reset data structure:", JSON.stringify(resetData, null, 2));

    // Use the action_link which contains all necessary parameters
    const resetUrl = resetData.properties?.action_link;

    if (!resetUrl) {
      console.error("No action link generated");
      console.error(
        "Available properties:",
        Object.keys(resetData.properties || {})
      );
      throw new Error("Failed to generate reset URL");
    }

    console.log("=== GENERATED RESET URL ===");
    console.log(resetUrl);
    console.log("=== END RESET URL ===");

    // Parse the URL to show its components
    try {
      const url = new URL(resetUrl);
      console.log("URL Components:");
      console.log("- Host:", url.host);
      console.log("- Pathname:", url.pathname);
      console.log("- Search params:");
      url.searchParams.forEach((value, key) => {
        console.log(`  - ${key}: ${value}`);
      });
    } catch (urlError) {
      console.error("Error parsing URL:", urlError);
    }

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #e53e3e; margin: 0;">SpiceAndSlice Bazaar</h1>
        </div>
        
        <h2 style="color: #333; margin-bottom: 20px;">Reset Your Password</h2>
        
        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
          We received a request to reset your password for your SpiceAndSlice Bazaar account.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #e53e3e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </div>
        
        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
          If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
        </p>
        
        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
          This link will expire in 1 hour for security reasons.
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px; text-align: center;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${resetUrl}" style="color: #e53e3e; word-break: break-all;">${resetUrl}</a>
        </p>
        
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
          © SpiceAndSlice Bazaar - Your trusted spice and food destination
        </p>
      </div>
    `;

    const { error: emailError } = await resend.emails.send({
      from: SENDER_EMAIL,
      to: [email],
      subject: "Reset Your Password - SpiceAndSlice Bazaar",
      html: emailHtml,
    });

    if (emailError) {
      console.error("Error sending password reset email:", emailError);
      throw new Error("Failed to send password reset email");
    }

    console.log("Custom password reset email sent successfully via Resend");

    // Return success response (same response whether user exists or not for security)
    return new Response(
      JSON.stringify({
        success: true,
        message:
          "If an account with that email exists, we've sent a password reset link.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing password reset request:", error);
    return new Response(
      JSON.stringify({
        error:
          "An error occurred while processing your request. Please try again.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

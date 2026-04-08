// deno-lint-ignore-file no-explicit-any
/// <reference lib="deno.ns" />

// Supabase Edge Function to handle Clerk webhooks
// This syncs Clerk users to the Supabase profiles table

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { Webhook } from "https://esm.sh/svix@1.15.0";
import { alertError } from "../_shared/alert.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

interface WebhookEvent {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{ email_address: string }>;
    primary_email_address_id?: string;
    first_name?: string;
    last_name?: string;
    username?: string;
    public_metadata?: {
      role?: string;
    };
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // --- Webhook signature verification ---
    const webhookSecret = Deno.env.get("CLERK_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("CLERK_WEBHOOK_SECRET is not set");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Read raw body for signature verification
    const rawBody = await req.text();

    const svixId = req.headers.get("svix-id");
    const svixTimestamp = req.headers.get("svix-timestamp");
    const svixSignature = req.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      console.error("Missing svix headers");
      return new Response(
        JSON.stringify({ error: "Missing webhook signature headers" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const wh = new Webhook(webhookSecret);
    let payload: WebhookEvent;

    try {
      payload = wh.verify(rawBody, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as unknown as WebhookEvent;
    } catch (verifyError) {
      console.error("Webhook signature verification failed:", verifyError);
      return new Response(
        JSON.stringify({ error: "Invalid webhook signature" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("Received verified Clerk webhook:", payload.type);

    switch (payload.type) {
      case "user.created": {
        const userId = payload.data.id;
        const primaryEmailId = payload.data.primary_email_address_id;
        const emailObj = payload.data.email_addresses?.find(
          (e) => e.email_address === primaryEmailId,
        );
        const email =
          emailObj?.email_address ||
          payload.data.email_addresses?.[0]?.email_address;

        const firstName = payload.data.first_name || "";
        const lastName = payload.data.last_name || "";
        const fullName =
          `${firstName} ${lastName}`.trim() || payload.data.username || "User";

        // Insert user into profiles table with onboarding flags
        const { error: profileError } = await supabase.from("profiles").insert({
          id: userId,
          email: email,
          full_name: fullName,
          profile_completed: false,
          onboarding_shown: false,
        });

        if (profileError) {
          console.error("Error creating profile:", profileError);
          throw profileError;
        }

        // Check if user should be admin (from public metadata)
        const role = payload.data.public_metadata?.role;
        if (role === "admin") {
          const { error: roleError } = await supabase
            .from("user_roles")
            .insert({
              user_id: userId,
              role: "admin",
            });

          if (roleError) {
            console.error("Error creating admin role:", roleError);
          }
        } else {
          // Create default user role
          const { error: roleError } = await supabase
            .from("user_roles")
            .insert({
              user_id: userId,
              role: "user",
            });

          if (roleError) {
            console.error("Error creating user role:", roleError);
          }
        }

        // Create or get existing cart for user (UPSERT to prevent duplicates)
        const { error: cartError } = await supabase
          .from("carts")
          .upsert(
            { user_id: userId },
            { onConflict: "user_id", ignoreDuplicates: true },
          );

        if (cartError) {
          console.error("Error creating/getting cart:", cartError);
        }

        console.log(`User ${userId} synced to Supabase successfully`);
        break;
      }

      case "user.updated": {
        const userId = payload.data.id;
        const primaryEmailId = payload.data.primary_email_address_id;
        const emailObj = payload.data.email_addresses?.find(
          (e) => e.email_address === primaryEmailId,
        );
        const email =
          emailObj?.email_address ||
          payload.data.email_addresses?.[0]?.email_address;

        const firstName = payload.data.first_name || "";
        const lastName = payload.data.last_name || "";
        const fullName =
          `${firstName} ${lastName}`.trim() || payload.data.username || "User";

        // Update profile
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            email: email,
            full_name: fullName,
          })
          .eq("id", userId);

        if (updateError) {
          console.error("Error updating profile:", updateError);
          throw updateError;
        }

        // Update role if changed
        const role = payload.data.public_metadata?.role;
        if (role) {
          const { error: roleError } = await supabase
            .from("user_roles")
            .upsert({
              user_id: userId,
              role: role === "admin" ? "admin" : "user",
            });

          if (roleError) {
            console.error("Error updating user role:", roleError);
          }
        }

        console.log(`User ${userId} updated in Supabase successfully`);
        break;
      }

      case "user.deleted": {
        const userId = payload.data.id;

        // Get user's cart ID first
        const { data: cart } = await supabase
          .from("carts")
          .select("id")
          .eq("user_id", userId)
          .single();

        // Delete user's cart items first (foreign key constraint)
        if (cart) {
          const { error: cartItemsError } = await supabase
            .from("cart_items")
            .delete()
            .eq("cart_id", cart.id);

          if (cartItemsError) {
            console.error("Error deleting cart items:", cartItemsError);
          }
        }

        // Delete user's cart
        const { error: cartError } = await supabase
          .from("carts")
          .delete()
          .eq("user_id", userId);

        if (cartError) {
          console.error("Error deleting cart:", cartError);
        }

        // Delete user role
        const { error: roleError } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId);

        if (roleError) {
          console.error("Error deleting user role:", roleError);
        }

        // Delete profile (this should cascade delete related data)
        const { error: profileError } = await supabase
          .from("profiles")
          .delete()
          .eq("id", userId);

        if (profileError) {
          console.error("Error deleting profile:", profileError);
          throw profileError;
        }

        console.log(`User ${userId} deleted from Supabase successfully`);
        break;
      }

      default:
        console.log(`Unhandled webhook type: ${payload.type}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    await alertError("clerk-webhook", error, {}, "error");
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

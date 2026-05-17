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
    email_addresses?: Array<{ id: string; email_address: string }>;
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
        // Resolve the primary email by matching the id field, not the address.
        // (Clerk's array uses `id` like "idn_xxx"; the old code compared
        // address-vs-id and always fell through to [0].)
        const primaryEmailId = payload.data.primary_email_address_id;
        const emailObj = payload.data.email_addresses?.find(
          (e) => e.id === primaryEmailId,
        );
        const rawEmail =
          emailObj?.email_address ||
          payload.data.email_addresses?.[0]?.email_address;
        // Normalize to match idx_profiles_email_unique (LOWER(email)). Without
        // this, a case-mismatched signup misses the existing-profile lookup,
        // skips the migration path, and the subsequent INSERT trips 23505.
        const email = rawEmail?.toLowerCase() ?? null;

        const firstName = payload.data.first_name || "";
        const lastName = payload.data.last_name || "";
        const fullName =
          `${firstName} ${lastName}`.trim() || payload.data.username || "User";

        // Check if a profile already exists for this email (dev → prod migration).
        // Use ilike for case-insensitive match against any historically-stored casing.
        const { data: existingProfile } = email
          ? await supabase
              .from("profiles")
              .select("id, full_name, phone_number, profile_completed, onboarding_shown")
              .ilike("email", email)
              .maybeSingle()
          : { data: null };

        if (existingProfile && existingProfile.id !== userId) {
          const oldUserId = existingProfile.id;
          console.log(`Migrating user data from ${oldUserId} to ${userId} (email: ${email})`);

          // 1. Create new profile copying over existing data
          const { error: newProfileError } = await supabase.from("profiles").insert({
            id: userId,
            email: email,
            full_name: existingProfile.full_name || fullName,
            phone_number: existingProfile.phone_number,
            profile_completed: existingProfile.profile_completed,
            onboarding_shown: existingProfile.onboarding_shown,
          });
          if (newProfileError) throw newProfileError;

          // 2. Migrate all tables referencing the old user ID
          const tables = [
            "orders",
            "user_addresses",
            "carts",
            "user_roles",
            "catering_requests",
            "testimonials",
            "customer_messages",
            "lunch_box_subscriptions",
            "lunch_box_notifications",
          ];
          for (const table of tables) {
            const { error } = await supabase
              .from(table)
              .update({ user_id: userId })
              .eq("user_id", oldUserId);
            if (error) console.error(`Error migrating ${table}:`, error);
            else console.log(`Migrated ${table} from ${oldUserId} to ${userId}`);
          }

          // 3. Delete old profile
          await supabase.from("profiles").delete().eq("id", oldUserId);

          console.log(`Migration complete for ${email}`);
          break;
        }

        // Insert user into profiles table with onboarding flags
        const { error: profileError } = await supabase.from("profiles").insert({
          id: userId,
          email: email,
          full_name: fullName,
          profile_completed: false,
          onboarding_shown: false,
        });

        if (profileError) {
          // 23505 = unique violation. Two paths can land here:
          //   (a) profiles_pkey race — autoCreateProfile already inserted this
          //       same userId moments earlier on a parallel authenticated
          //       request. Safe no-op.
          //   (b) idx_profiles_email_unique race — the email exists under a
          //       *different* userId we didn't detect via the lookup above
          //       (only happens if the row appeared between the SELECT and
          //       INSERT). Falls through to a re-check.
          if (profileError.code === "23505") {
            const { data: byId } = await supabase
              .from("profiles")
              .select("id")
              .eq("id", userId)
              .maybeSingle();

            if (!byId) {
              console.error(
                `clerk-webhook: email ${email} owned by a different account; cannot create profile for ${userId}`,
                profileError,
              );
              throw profileError;
            }
            console.log(`clerk-webhook: profile for ${userId} already exists, skipping insert`);
          } else {
            console.error("Error creating profile:", profileError);
            throw profileError;
          }
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
          (e) => e.id === primaryEmailId,
        );
        const rawEmail =
          emailObj?.email_address ||
          payload.data.email_addresses?.[0]?.email_address;
        const email = rawEmail?.toLowerCase() ?? null;

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

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import Stripe from "https://esm.sh/stripe@13.8.0";
import { isRateLimitedByIp, getClientIp } from "../_shared/rate-limiter.ts";
import { authenticateRequest } from "../_shared/clerk-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Server-side pricing — never trust the client
const PRICING = {
  weekly: 59.99,
  monthly: 199.99,
  custom_per_day: 12.99,
} as const;

const getServiceRoleClient = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  return createClient(supabaseUrl, serviceRoleKey);
};

/**
 * Validate that delivery schedule dates are weekdays and in the future.
 */
function validateDeliverySchedule(dates: string[]): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const dateStr of dates) {
    const date = new Date(dateStr + "T12:00:00");
    if (isNaN(date.getTime())) return false;
    if (date < today) return false;
    const day = date.getDay();
    if (day === 0 || day === 6) return false; // weekend
  }
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const clientIp = getClientIp(req);
    if (isRateLimitedByIp(clientIp, 10, 60)) {
      return new Response(
        JSON.stringify({ error: "Too many requests, please try again later" }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const serviceClient = getServiceRoleClient();

    const authHeader = req.headers.get("Authorization");
    const userId = await authenticateRequest(authHeader, serviceClient, false);

    const requestBody = await req.json();
    const {
      subscriptionType,
      startDate,
      deliverySchedule,
      totalDeliveryDays,
      deliveryAddress,
      successUrl,
      cancelUrl,
    } = requestBody;

    // --- Validation ---
    if (!subscriptionType || !["weekly", "monthly", "custom"].includes(subscriptionType)) {
      return new Response(
        JSON.stringify({ error: "Invalid subscription type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!startDate) {
      return new Response(
        JSON.stringify({ error: "Start date is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!deliveryAddress || !deliveryAddress.company || !deliveryAddress.addressLine1 ||
        !deliveryAddress.city || !deliveryAddress.state || !deliveryAddress.postalCode) {
      return new Response(
        JSON.stringify({ error: "Complete delivery address is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!successUrl || !cancelUrl) {
      return new Response(
        JSON.stringify({ error: "Success and cancel URLs are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Custom plan validation
    if (subscriptionType === "custom") {
      if (!totalDeliveryDays || totalDeliveryDays < 5 || totalDeliveryDays > 29) {
        return new Response(
          JSON.stringify({ error: "Custom plan requires 5-29 delivery days" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (!deliverySchedule || !Array.isArray(deliverySchedule) ||
          deliverySchedule.length !== totalDeliveryDays) {
        return new Response(
          JSON.stringify({ error: "Delivery schedule must match total delivery days" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (!validateDeliverySchedule(deliverySchedule)) {
        return new Response(
          JSON.stringify({ error: "Delivery dates must be future weekdays" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // --- Calculate price server-side ---
    let totalPrice: number;
    let description: string;

    switch (subscriptionType) {
      case "weekly":
        totalPrice = PRICING.weekly;
        description = "Lunch Box - Weekly Plan (5 meals/week)";
        break;
      case "monthly":
        totalPrice = PRICING.monthly;
        description = "Lunch Box - Monthly Plan (20+ meals/month)";
        break;
      case "custom":
        totalPrice = Math.round(totalDeliveryDays * PRICING.custom_per_day * 100) / 100;
        description = `Lunch Box - Custom Plan (${totalDeliveryDays} meals)`;
        break;
      default:
        throw new Error("Invalid subscription type");
    }

    // Fetch user email
    const { data: profileData } = await serviceClient
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .single();

    const userEmail = profileData?.email || null;

    console.log("Creating lunchbox checkout for user:", userId, {
      subscriptionType,
      totalPrice,
      startDate,
    });

    // --- Create Stripe checkout session ---
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: description,
              description: `Start date: ${startDate}`,
            },
            unit_amount: Math.round(totalPrice * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      customer_email: userEmail,
      metadata: {
        type: "lunchbox_subscription",
        user_id: userId,
        user_email: userEmail || "",
        subscription_type: subscriptionType,
        start_date: startDate,
        total_delivery_days: (totalDeliveryDays || 0).toString(),
        total_price: totalPrice.toString(),
        price_per_day: subscriptionType === "custom" ? PRICING.custom_per_day.toString() : "",
        delivery_schedule: deliverySchedule ? JSON.stringify(deliverySchedule) : "[]",
        // Address fields (Stripe metadata values must be strings, max 500 chars)
        address_company: deliveryAddress.company,
        address_line1: deliveryAddress.addressLine1,
        address_line2: deliveryAddress.addressLine2 || "",
        address_city: deliveryAddress.city,
        address_state: deliveryAddress.state,
        address_postal_code: deliveryAddress.postalCode,
        delivery_instructions: deliveryAddress.deliveryInstructions || "",
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error creating lunchbox checkout session:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import Stripe from "https://esm.sh/stripe@13.8.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { authenticateRequest } from "../_shared/clerk-auth.ts";
import { escapeHtml } from "../_shared/html-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const ADMIN_EMAIL = "spiceandslicedfw@gmail.com";
const SENDER_EMAIL =
  "SpiceAndSlice Orders <orders@management.spiceandslice.shop>";

const getServiceRoleClient = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  return createClient(supabaseUrl, serviceRoleKey);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const requestBody = await req.json();
    const { sessionId } = requestBody;

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "Missing sessionId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = getServiceRoleClient();

    // Authenticate request
    const authHeader = req.headers.get("Authorization");
    const userId = await authenticateRequest(authHeader, serviceClient, false);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    console.log("Stripe session retrieved:", {
      id: session.id,
      payment_status: session.payment_status,
      status: session.status,
    });

    // Verify payment completed
    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({
          error: "Payment not completed",
          payment_status: session.payment_status,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (session.status !== "complete") {
      return new Response(
        JSON.stringify({
          error: "Session not complete",
          status: session.status,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const metadata = session.metadata || {};

    // Verify this is a lunchbox subscription session
    if (metadata.type !== "lunchbox_subscription") {
      return new Response(
        JSON.stringify({ error: "Invalid session type" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Verify user ID matches
    if (metadata.user_id !== userId) {
      return new Response(JSON.stringify({ error: "User ID mismatch" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Idempotency check ---
    const { data: existingSub } = await serviceClient
      .from("lunch_box_subscriptions")
      .select("id")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    if (existingSub) {
      console.log("Subscription already exists for session:", sessionId);
      return new Response(
        JSON.stringify({ success: true, subscriptionId: existingSub.id }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // --- Extract subscription data from metadata ---
    const subscriptionType = metadata.subscription_type;
    const startDate = metadata.start_date;
    const totalDeliveryDays = parseInt(metadata.total_delivery_days || "0") || null;
    const totalPrice = parseFloat(metadata.total_price || "0");
    const pricePerDay = metadata.price_per_day
      ? parseFloat(metadata.price_per_day)
      : null;
    const deliverySchedule = metadata.delivery_schedule
      ? JSON.parse(metadata.delivery_schedule)
      : [];

    const isCustomPlan = subscriptionType === "custom";

    // Calculate next delivery date
    const nextDelivery = isCustomPlan && deliverySchedule.length > 0
      ? deliverySchedule[0]
      : startDate;

    // --- Insert subscription ---
    const { data: subscription, error: insertError } = await serviceClient
      .from("lunch_box_subscriptions")
      .insert({
        user_id: userId,
        subscription_type: subscriptionType,
        start_date: startDate,
        next_delivery_date: nextDelivery,
        company: metadata.address_company,
        address_line1: metadata.address_line1,
        address_line2: metadata.address_line2 || null,
        city: metadata.address_city,
        state: metadata.address_state,
        postal_code: metadata.address_postal_code,
        delivery_instructions: metadata.delivery_instructions || null,
        status: "active",
        delivery_schedule: deliverySchedule,
        total_delivery_days: totalDeliveryDays,
        price_per_day: pricePerDay,
        total_price: totalPrice,
        stripe_session_id: sessionId,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting subscription:", insertError);
      throw new Error("Failed to create subscription");
    }

    console.log("Subscription created:", subscription.id);

    // --- Generate deliveries ---
    try {
      if (isCustomPlan && deliverySchedule.length > 0) {
        // Custom plan: use specific dates
        const { error: deliveryError } = await serviceClient.rpc(
          "generate_deliveries_for_subscription",
          {
            p_subscription_id: subscription.id,
            p_delivery_dates: deliverySchedule,
          },
        );
        if (deliveryError) {
          console.error("Error generating custom deliveries:", deliveryError);
        } else {
          console.log("Custom deliveries generated for subscription:", subscription.id);
        }
      } else {
        // Weekly/Monthly: auto-generate weekday deliveries
        const { error: deliveryError } = await serviceClient.rpc(
          "auto_generate_subscription_deliveries",
          {
            p_subscription_id: subscription.id,
          },
        );
        if (deliveryError) {
          console.error("Error auto-generating deliveries:", deliveryError);
        } else {
          console.log("Auto deliveries generated for subscription:", subscription.id);
        }
      }
    } catch (deliveryErr) {
      console.error("Delivery generation failed (non-blocking):", deliveryErr);
    }

    // --- Send confirmation emails ---
    try {
      // Fetch user profile for email
      const { data: profileData } = await serviceClient
        .from("profiles")
        .select("full_name, email, phone_number")
        .eq("id", userId)
        .single();

      const userEmail = profileData?.email;
      const userName = escapeHtml(profileData?.full_name || "Valued Customer");
      const userPhone = escapeHtml(profileData?.phone_number || "Not provided");

      // Escape user-provided address fields for safe HTML embedding
      const safeCompany = escapeHtml(metadata.address_company || "");
      const safeLine1 = escapeHtml(metadata.address_line1 || "");
      const safeLine2 = metadata.address_line2 ? escapeHtml(metadata.address_line2) : "";
      const safeCity = escapeHtml(metadata.address_city || "");
      const safeState = escapeHtml(metadata.address_state || "");
      const safePostalCode = escapeHtml(metadata.address_postal_code || "");
      const safeInstructions = metadata.delivery_instructions ? escapeHtml(metadata.delivery_instructions) : "";

      if (userEmail) {
        const subscriptionTypeLabel =
          subscriptionType === "weekly"
            ? "Weekly"
            : subscriptionType === "monthly"
            ? "Monthly"
            : "Custom";

        // Format delivery schedule for custom plans
        let deliveryScheduleHtml = "";
        if (isCustomPlan && deliverySchedule.length > 0) {
          deliveryScheduleHtml = `
            <h3 style="color: #333; margin-top: 20px;">Custom Delivery Schedule:</h3>
            <ul style="list-style: none; padding: 0;">
              ${deliverySchedule
                .slice(0, 10)
                .map(
                  (date: string) => `
                <li style="padding: 5px 0; color: #555;">
                  📅 ${new Date(date).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </li>
              `,
                )
                .join("")}
              ${
                deliverySchedule.length > 10
                  ? `<li style="padding: 5px 0; color: #888; font-style: italic;">... and ${
                      deliverySchedule.length - 10
                    } more dates</li>`
                  : ""
              }
            </ul>
          `;
        }

        // Format pricing for custom plans
        let pricingHtml = "";
        if (isCustomPlan) {
          pricingHtml = `
            <tr>
              <td style="padding: 12px; font-weight: bold; background-color: #f9f9f9;">Total Delivery Days:</td>
              <td style="padding: 12px; background-color: #f9f9f9;">${totalDeliveryDays || 0} days</td>
            </tr>
            <tr>
              <td style="padding: 12px; font-weight: bold;">Price Per Day:</td>
              <td style="padding: 12px;">$${pricePerDay?.toFixed(2) || "0.00"}</td>
            </tr>
            <tr style="background-color: #fff3e0;">
              <td style="padding: 12px; font-weight: bold; color: #FF5722;">Total Price:</td>
              <td style="padding: 12px; font-weight: bold; color: #FF5722; font-size: 18px;">$${totalPrice.toFixed(2)}</td>
            </tr>
          `;
        }

        // Customer email
        const customerEmailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #FF5722 0%, #FFA726 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">🍱 Lunch Box Subscription Confirmed!</h1>
              </div>

              <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px; color: #555;">Dear ${userName},</p>

                <p style="font-size: 16px; color: #555;">
                  Thank you for subscribing to our Lunch Box delivery service! Your payment has been processed
                  and we're excited to bring delicious, freshly-prepared meals to your doorstep.
                </p>

                <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h2 style="color: #FF5722; margin-top: 0; font-size: 22px;">Subscription Details</h2>

                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 12px; font-weight: bold; background-color: #f9f9f9;">Subscription Type:</td>
                      <td style="padding: 12px; background-color: #f9f9f9;">${subscriptionTypeLabel} Plan</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px; font-weight: bold;">Start Date:</td>
                      <td style="padding: 12px;">${new Date(startDate).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px; font-weight: bold; background-color: #f9f9f9;">Next Delivery:</td>
                      <td style="padding: 12px; background-color: #f9f9f9;">${
                        nextDelivery
                          ? new Date(nextDelivery).toLocaleDateString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : "To be scheduled"
                      }</td>
                    </tr>
                    ${pricingHtml}
                  </table>
                </div>

                ${deliveryScheduleHtml}

                <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FF5722;">
                  <h3 style="color: #FF5722; margin-top: 0; font-size: 18px;">📍 Delivery Address</h3>
                  <p style="margin: 5px 0; color: #555;"><strong>${safeCompany}</strong></p>
                  <p style="margin: 5px 0; color: #555;">${safeLine1}</p>
                  ${metadata.address_line2 ? `<p style="margin: 5px 0; color: #555;">${safeLine2}</p>` : ""}
                  <p style="margin: 5px 0; color: #555;">${safeCity}, ${safeState} ${safePostalCode}</p>
                  ${metadata.delivery_instructions ? `<p style="margin-top: 15px; color: #666; font-style: italic;"><strong>Delivery Instructions:</strong><br/>${safeInstructions}</p>` : ""}
                </div>

                <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #1976d2; margin-top: 0; font-size: 18px;">📋 What's Next?</h3>
                  <ul style="color: #555; padding-left: 20px;">
                    <li style="margin-bottom: 10px;">Our team will prepare your daily meals with fresh, quality ingredients</li>
                    <li style="margin-bottom: 10px;">You'll receive delivery notifications before each scheduled delivery</li>
                    <li style="margin-bottom: 10px;">You can manage your subscription, pause, or modify delivery dates anytime from your account</li>
                    <li style="margin-bottom: 10px;">Each meal comes with a balanced menu designed for your satisfaction</li>
                  </ul>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${Deno.env.get("SITE_URL") || "https://spiceandslice.shop"}/lunch-box"
                     style="display: inline-block; background-color: #FF5722; color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px;">
                    Manage My Subscription
                  </a>
                </div>

                <p style="color: #777; font-size: 14px; margin-top: 30px;">
                  If you have any questions, contact us at <a href="mailto:${ADMIN_EMAIL}" style="color: #FF5722;">${ADMIN_EMAIL}</a>.
                </p>

                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                  <p style="color: #999; font-size: 12px; margin: 5px 0;">Spice & Slice - Bringing Flavor to Your Doorstep</p>
                </div>
              </div>
            </body>
          </html>
        `;

        // Admin email
        const adminEmailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #4CAF50 0%, #81C784 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 26px;">🎉 New Lunch Box Subscription!</h1>
              </div>

              <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px; color: #555;">A new lunch box subscription has been created:</p>

                <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h2 style="color: #4CAF50; margin-top: 0;">Customer Information</h2>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 12px; font-weight: bold;">Name:</td>
                      <td style="padding: 12px;">${userName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px; font-weight: bold; background-color: #f9f9f9;">Email:</td>
                      <td style="padding: 12px; background-color: #f9f9f9;">${userEmail}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px; font-weight: bold;">Phone:</td>
                      <td style="padding: 12px;">${userPhone}</td>
                    </tr>
                  </table>
                </div>

                <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4CAF50;">
                  <h2 style="color: #4CAF50; margin-top: 0;">Subscription Details</h2>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 12px; font-weight: bold;">Subscription ID:</td>
                      <td style="padding: 12px; font-family: monospace;">${subscription.id}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px; font-weight: bold; background-color: #f9f9f9;">Type:</td>
                      <td style="padding: 12px; background-color: #f9f9f9;">${subscriptionTypeLabel} Plan</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px; font-weight: bold;">Status:</td>
                      <td style="padding: 12px;">
                        <span style="background-color: #4CAF50; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">ACTIVE</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 12px; font-weight: bold; background-color: #f9f9f9;">Start Date:</td>
                      <td style="padding: 12px; background-color: #f9f9f9;">${new Date(startDate).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px; font-weight: bold;">Payment:</td>
                      <td style="padding: 12px; font-weight: bold; color: #4CAF50;">$${totalPrice.toFixed(2)} (Stripe)</td>
                    </tr>
                    ${pricingHtml}
                  </table>
                </div>

                ${deliveryScheduleHtml}

                <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #FF5722; margin-top: 0;">📍 Delivery Address</h3>
                  <p style="margin: 5px 0; color: #555;"><strong>${safeCompany}</strong></p>
                  <p style="margin: 5px 0; color: #555;">${safeLine1}</p>
                  ${metadata.address_line2 ? `<p style="margin: 5px 0; color: #555;">${safeLine2}</p>` : ""}
                  <p style="margin: 5px 0; color: #555;">${safeCity}, ${safeState} ${safePostalCode}</p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${Deno.env.get("SITE_URL") || "https://spiceandslice.shop"}/admin/lunchbox-subscriptions"
                     style="display: inline-block; background-color: #4CAF50; color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px;">
                    View in Admin Panel
                  </a>
                </div>

                <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="color: #1976d2; font-size: 14px; margin: 0;">
                    <strong>Action Required:</strong> Review the subscription and prepare for upcoming deliveries.
                  </p>
                </div>
              </div>
            </body>
          </html>
        `;

        // Send customer email
        console.log("Sending customer confirmation email to:", userEmail);
        await resend.emails.send({
          from: SENDER_EMAIL,
          to: userEmail,
          subject: "🍱 Your Lunch Box Subscription is Confirmed!",
          html: customerEmailHtml,
        });

        // Send admin email
        console.log("Sending admin notification email to:", ADMIN_EMAIL);
        await resend.emails.send({
          from: SENDER_EMAIL,
          to: ADMIN_EMAIL,
          subject: `🎉 New Lunch Box Subscription - ${userName}`,
          html: adminEmailHtml,
        });

        console.log("Confirmation emails sent successfully");
      } else {
        console.warn("No email found for user, skipping email notifications");
      }
    } catch (emailErr) {
      console.error("Email sending failed (non-blocking):", emailErr);
    }

    return new Response(
      JSON.stringify({ success: true, subscriptionId: subscription.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error completing lunchbox subscription:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

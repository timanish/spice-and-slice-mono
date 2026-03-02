import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { authenticateRequest } from "../_shared/clerk-auth.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const ADMIN_EMAIL = "spiceandslicedfw@gmail.com";
const SENDER_EMAIL =
  "SpiceAndSlice Orders <orders@management.spiceandslice.shop>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Create a service role client to fetch user and subscription data
const getServiceRoleClient = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  return createClient(supabaseUrl, serviceRoleKey);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const supabase = getServiceRoleClient();

    // Verify Clerk JWT — caller must be an authenticated user
    const authHeader = req.headers.get("Authorization");
    await authenticateRequest(authHeader, supabase, false);

    const { subscriptionId } = await req.json();

    if (!subscriptionId) {
      return new Response(JSON.stringify({ error: "Missing subscriptionId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch subscription details with user profile
    const { data: subscription, error: subError } = await supabase
      .from("lunch_box_subscriptions")
      .select("*")
      .eq("id", subscriptionId)
      .single();

    if (subError || !subscription) {
      console.error("Error fetching subscription:", subError);
      throw new Error("Failed to fetch subscription details");
    }

    // Fetch user profile separately
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, email, phone_number")
      .eq("id", subscription.user_id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
    }

    interface ProfileData {
      full_name?: string;
      email?: string;
      phone_number?: string;
    }

    const profile = profileData as ProfileData | null;
    const userEmail = profile?.email;
    const userName = profile?.full_name || "Valued Customer";
    const userPhone = profile?.phone_number || "Not provided";

    console.log("Subscription data:", {
      id: subscription.id,
      type: subscription.subscription_type,
      user_id: subscription.user_id,
      userEmail,
      userName,
    });

    if (!userEmail) {
      console.error("No email found for user");
      throw new Error("User email not found");
    }

    // Format subscription type
    const subscriptionTypeLabel =
      subscription.subscription_type === "weekly"
        ? "Weekly"
        : subscription.subscription_type === "monthly"
        ? "Monthly"
        : "Custom";

    // Format delivery schedule for custom plans
    let deliveryScheduleHtml = "";
    if (
      subscription.subscription_type === "custom" &&
      subscription.delivery_schedule
    ) {
      const dates = subscription.delivery_schedule as string[];
      deliveryScheduleHtml = `
        <h3 style="color: #333; margin-top: 20px;">Custom Delivery Schedule:</h3>
        <ul style="list-style: none; padding: 0;">
          ${dates
            .slice(0, 10)
            .map(
              (date) => `
            <li style="padding: 5px 0; color: #555;">
              📅 ${new Date(date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </li>
          `
            )
            .join("")}
          ${
            dates.length > 10
              ? `<li style="padding: 5px 0; color: #888; font-style: italic;">... and ${
                  dates.length - 10
                } more dates</li>`
              : ""
          }
        </ul>
      `;
    }

    // Format pricing information
    let pricingHtml = "";
    if (subscription.subscription_type === "custom") {
      pricingHtml = `
        <tr>
          <td style="padding: 12px; font-weight: bold; background-color: #f9f9f9;">Total Delivery Days:</td>
          <td style="padding: 12px; background-color: #f9f9f9;">${
            subscription.total_delivery_days || 0
          } days</td>
        </tr>
        <tr>
          <td style="padding: 12px; font-weight: bold;">Price Per Day:</td>
          <td style="padding: 12px;">$${
            subscription.price_per_day?.toFixed(2) || "0.00"
          }</td>
        </tr>
        <tr style="background-color: #fff3e0;">
          <td style="padding: 12px; font-weight: bold; color: #FF5722;">Total Price:</td>
          <td style="padding: 12px; font-weight: bold; color: #FF5722; font-size: 18px;">$${
            subscription.total_price?.toFixed(2) || "0.00"
          }</td>
        </tr>
      `;
    }

    // Customer confirmation email
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
              Thank you for subscribing to our Lunch Box delivery service! We're excited to bring delicious, 
              freshly-prepared meals to your doorstep.
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
                  <td style="padding: 12px;">${new Date(
                    subscription.start_date
                  ).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; font-weight: bold; background-color: #f9f9f9;">Next Delivery:</td>
                  <td style="padding: 12px; background-color: #f9f9f9;">${
                    subscription.next_delivery_date
                      ? new Date(
                          subscription.next_delivery_date
                        ).toLocaleDateString("en-US", {
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
              <p style="margin: 5px 0; color: #555;"><strong>${
                subscription.company
              }</strong></p>
              <p style="margin: 5px 0; color: #555;">${
                subscription.address_line1
              }</p>
              ${
                subscription.address_line2
                  ? `<p style="margin: 5px 0; color: #555;">${subscription.address_line2}</p>`
                  : ""
              }
              <p style="margin: 5px 0; color: #555;">${subscription.city}, ${
      subscription.state
    } ${subscription.postal_code}</p>
              ${
                subscription.delivery_instructions
                  ? `
                <p style="margin-top: 15px; color: #666; font-style: italic;">
                  <strong>Delivery Instructions:</strong><br/>
                  ${subscription.delivery_instructions}
                </p>
              `
                  : ""
              }
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
              <a href="${
                Deno.env.get("SITE_URL") || "https://spiceandslice.shop"
              }/lunch-box" 
                 style="display: inline-block; background-color: #FF5722; color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px;">
                Manage My Subscription
              </a>
            </div>

            <p style="color: #777; font-size: 14px; margin-top: 30px;">
              If you have any questions or need to make changes to your subscription, please don't hesitate to contact us 
              at <a href="mailto:${ADMIN_EMAIL}" style="color: #FF5722;">${ADMIN_EMAIL}</a>.
            </p>

            <p style="color: #777; font-size: 14px;">
              Thank you for choosing Spice & Slice!
            </p>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
              <p style="color: #999; font-size: 12px; margin: 5px 0;">
                Spice & Slice - Bringing Flavor to Your Doorstep
              </p>
              <p style="color: #999; font-size: 12px; margin: 5px 0;">
                ${ADMIN_EMAIL}
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Admin notification email
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
            <p style="font-size: 16px; color: #555;">
              A new lunch box subscription has been created. Please review the details below:
            </p>

            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #4CAF50; margin-top: 0; font-size: 22px;">Customer Information</h2>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px; font-weight: bold; background-color: #fff;">Name:</td>
                  <td style="padding: 12px; background-color: #fff;">${userName}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; font-weight: bold; background-color: #f9f9f9;">Email:</td>
                  <td style="padding: 12px; background-color: #f9f9f9;">${userEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; font-weight: bold; background-color: #fff;">Phone:</td>
                  <td style="padding: 12px; background-color: #fff;">${userPhone}</td>
                </tr>
              </table>
            </div>

            <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4CAF50;">
              <h2 style="color: #4CAF50; margin-top: 0; font-size: 22px;">Subscription Details</h2>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px; font-weight: bold; background-color: #fff;">Subscription ID:</td>
                  <td style="padding: 12px; background-color: #fff; font-family: monospace;">${
                    subscription.id
                  }</td>
                </tr>
                <tr>
                  <td style="padding: 12px; font-weight: bold; background-color: #f9f9f9;">Type:</td>
                  <td style="padding: 12px; background-color: #f9f9f9;">${subscriptionTypeLabel} Plan</td>
                </tr>
                <tr>
                  <td style="padding: 12px; font-weight: bold; background-color: #fff;">Status:</td>
                  <td style="padding: 12px; background-color: #fff;">
                    <span style="background-color: #4CAF50; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                      ${subscription.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px; font-weight: bold; background-color: #f9f9f9;">Start Date:</td>
                  <td style="padding: 12px; background-color: #f9f9f9;">${new Date(
                    subscription.start_date
                  ).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; font-weight: bold; background-color: #fff;">Next Delivery:</td>
                  <td style="padding: 12px; background-color: #fff;">${
                    subscription.next_delivery_date
                      ? new Date(
                          subscription.next_delivery_date
                        ).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "Not scheduled"
                  }</td>
                </tr>
                ${pricingHtml}
              </table>
            </div>

            ${deliveryScheduleHtml}

            <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #FF5722; margin-top: 0; font-size: 18px;">📍 Delivery Address</h3>
              <p style="margin: 5px 0; color: #555;"><strong>${
                subscription.company
              }</strong></p>
              <p style="margin: 5px 0; color: #555;">${
                subscription.address_line1
              }</p>
              ${
                subscription.address_line2
                  ? `<p style="margin: 5px 0; color: #555;">${subscription.address_line2}</p>`
                  : ""
              }
              <p style="margin: 5px 0; color: #555;">${subscription.city}, ${
      subscription.state
    } ${subscription.postal_code}</p>
              ${
                subscription.delivery_instructions
                  ? `
                <p style="margin-top: 15px; color: #666; font-style: italic;">
                  <strong>Delivery Instructions:</strong><br/>
                  ${subscription.delivery_instructions}
                </p>
              `
                  : ""
              }
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${
                Deno.env.get("SITE_URL") || "https://spiceandslice.shop"
              }/admin/lunchbox-subscriptions" 
                 style="display: inline-block; background-color: #4CAF50; color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px;">
                View in Admin Panel
              </a>
            </div>

            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #1976d2; font-size: 14px; margin: 0;">
                <strong>Action Required:</strong> Review the subscription and prepare for upcoming deliveries. 
                Assign menu items and coordinate with the kitchen team.
              </p>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
              <p style="color: #999; font-size: 12px; margin: 5px 0;">
                Spice & Slice Admin Notification
              </p>
              <p style="color: #999; font-size: 12px; margin: 5px 0;">
                Sent: ${new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send customer email
    console.log("Sending customer confirmation email to:", userEmail);
    const customerEmailResponse = await resend.emails.send({
      from: SENDER_EMAIL,
      to: userEmail,
      subject: "🍱 Your Lunch Box Subscription is Confirmed!",
      html: customerEmailHtml,
    });

    console.log("Customer email response:", customerEmailResponse);

    // Send admin notification email
    console.log("Sending admin notification email to:", ADMIN_EMAIL);
    const adminEmailResponse = await resend.emails.send({
      from: SENDER_EMAIL,
      to: ADMIN_EMAIL,
      subject: `🎉 New Lunch Box Subscription - ${userName}`,
      html: adminEmailHtml,
    });

    console.log("Admin email response:", adminEmailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Subscription emails sent successfully",
        customerEmailId: customerEmailResponse.data?.id,
        adminEmailId: adminEmailResponse.data?.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending subscription emails:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send emails";
    const errorDetails = error instanceof Error ? error.stack : String(error);

    const isAuthError =
      errorMessage.includes("authorization") ||
      errorMessage.includes("token") ||
      errorMessage.includes("User not found");

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: isAuthError ? undefined : errorDetails,
      }),
      {
        status: isAuthError ? 401 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

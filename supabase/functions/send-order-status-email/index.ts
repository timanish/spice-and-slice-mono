import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function verifyServiceRoleKey(req: Request): void {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing authorization header");
  }
  const token = authHeader.replace("Bearer ", "");
  if (token !== SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Unauthorized: invalid service role key");
  }
}

interface RequestBody {
  orderId: string;
  newStatus: string;
  estimatedTime?: string;
  driverNotes?: string;
}

const getEmailTemplate = (
  status: string,
  customerName: string,
  orderId: string,
  estimatedTime?: string,
  driverNotes?: string
) => {
  const statusTemplates: Record<
    string,
    { subject: string; heading: string; message: string; color: string }
  > = {
    confirmed: {
      subject: "Order Confirmed",
      heading: "Your Order Has Been Confirmed! 🎉",
      message:
        "Great news! Your order has been confirmed and we're getting everything ready for you.",
      color: "#3b82f6",
    },
    preparing: {
      subject: "Order Being Prepared",
      heading: "We're Preparing Your Order! 👨‍🍳",
      message:
        "Our kitchen team is carefully preparing your delicious meal right now.",
      color: "#8b5cf6",
    },
    out_for_delivery: {
      subject: "Order Out for Delivery",
      heading: "Your Order Is On The Way! 🚚",
      message: "Your order has left our kitchen and is heading your way!",
      color: "#f97316",
    },
    delivered: {
      subject: "Order Delivered",
      heading: "Order Delivered Successfully! ✅",
      message: "Your order has been delivered. We hope you enjoy your meal!",
      color: "#22c55e",
    },
    cancelled: {
      subject: "Order Cancelled",
      heading: "Order Cancelled",
      message:
        "Your order has been cancelled. If you have any questions, please contact us.",
      color: "#ef4444",
    },
  };

  const template = statusTemplates[status] || statusTemplates.confirmed;

  const estimatedTimeHtml = estimatedTime
    ? `
    <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 24px 0;">
      <p style="margin: 0; font-size: 14px; color: #6b7280;">Estimated Delivery Time:</p>
      <p style="margin: 8px 0 0 0; font-size: 18px; font-weight: 600; color: #111827;">${estimatedTime}</p>
    </div>
    `
    : "";

  const driverNotesHtml = driverNotes
    ? `
    <div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; font-size: 14px; color: #92400e; font-weight: 600;">Driver Note:</p>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: #78350f;">${driverNotes}</p>
    </div>
    `
    : "";

  return {
    subject: `${template.subject} - Order #${orderId
      .substring(0, 8)
      .toUpperCase()}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${template.subject}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, ${
                    template.color
                  } 0%, ${
      template.color
    }dd 100%); padding: 40px 30px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Spice & Slice</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 24px; font-weight: 600;">${
                      template.heading
                    }</h2>
                    <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">Hi ${customerName},</p>
                    <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">${
                      template.message
                    }</p>
                    
                    <!-- Order ID -->
                    <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 24px 0;">
                      <p style="margin: 0; font-size: 14px; color: #6b7280;">Order Number:</p>
                      <p style="margin: 8px 0 0 0; font-size: 20px; font-weight: 700; color: #111827; letter-spacing: 0.5px;">#${orderId
                        .substring(0, 8)
                        .toUpperCase()}</p>
                    </div>

                    ${estimatedTimeHtml}
                    ${driverNotesHtml}
                    
                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="https://www.spiceandslice.shop/order/${orderId}" 
                         style="display: inline-block; background-color: ${
                           template.color
                         }; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                        View Order Details
                      </a>
                    </div>
                    
                    <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                      If you have any questions, please don't hesitate to contact us at 
                      <a href="mailto:spiceandslicedfw@gmail.com" style="color: ${
                        template.color
                      }; text-decoration: none;">spiceandslicedfw@gmail.com</a>
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 30px; background-color: #f9fafb; border-radius: 0 0 12px 12px; text-align: center;">
                    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">Thank you for choosing Spice & Slice!</p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">© ${new Date().getFullYear()} Spice & Slice. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate RESEND_API_KEY is configured
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not set in environment variables");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email service not configured - RESEND_API_KEY missing",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    verifyServiceRoleKey(req);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body: RequestBody = await req.json();
    const { orderId, newStatus, estimatedTime, driverNotes } = body;

    console.log("Sending order status email:", { orderId, newStatus });

    // Fetch order and customer details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        `
        *,
        profiles:user_id (
          full_name,
          email
        )
      `
      )
      .eq("id", orderId)
      .single();

    if (orderError) {
      console.error("Error fetching order:", orderError);
      throw new Error(`Failed to fetch order: ${orderError.message}`);
    }

    if (!order) {
      throw new Error("Order not found");
    }

    const customerEmail = order.profiles?.email;
    const customerName = order.profiles?.full_name || "Customer";

    if (!customerEmail) {
      throw new Error("Customer email not found");
    }

    // Generate email content
    const emailContent = getEmailTemplate(
      newStatus,
      customerName,
      orderId,
      estimatedTime,
      driverNotes
    );

    // Send email via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "SpiceAndSlice <orders@management.spiceandslice.shop>",
        to: [customerEmail],
        bcc: ["spiceandslicedfw@gmail.com"],
        subject: emailContent.subject,
        html: emailContent.html,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error("Resend API error:", errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const emailData = await emailResponse.json();
    console.log("Email sent successfully:", emailData);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully",
        emailId: emailData.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-order-status-email function:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const isAuthError = message.includes("Unauthorized") || message.includes("authorization");
    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: isAuthError ? 401 : 400,
      }
    );
  }
});

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
  confirmationToken?: string;
  isAdminEmail?: boolean;
}

const getEmailTemplate = (
  status: string,
  customerName: string,
  orderId: string,
  estimatedTime?: string,
  driverNotes?: string,
  confirmationToken?: string,
  orderItems?: any[],
  isAdminEmail?: boolean
) => {
  const statusTemplates: Record<
    string,
    { subject: string; heading: string; message: string; color: string }
  > = {
    pending_review: {
      subject: isAdminEmail
        ? `⚡ New Order Pending Review - #${orderId.slice(-8).toUpperCase()}`
        : "Order Received - Being Reviewed",
      heading: isAdminEmail
        ? "New Order Awaiting Review 📋"
        : "We've Received Your Order! 📋",
      message: isAdminEmail
        ? `A new order has been submitted and requires your review. Please check the order details, verify item availability, and make any necessary adjustments before sending to the customer for confirmation.`
        : "Thank you for your order! Our team is currently reviewing your items to ensure we have the best quality products available. We'll send you an updated order with any adjustments shortly.",
      color: isAdminEmail ? "#dc2626" : "#f59e0b",
    },
    awaiting_customer_confirmation: {
      subject: "Please Confirm Your Order",
      heading: "Review & Confirm Your Order 👀",
      message:
        "We've reviewed your order and may have made some adjustments based on our available inventory. Please review the details below and confirm to proceed with payment.",
      color: "#f59e0b",
    },
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

  // For awaiting_customer_confirmation status, show order items with original vs adjusted quantities and product substitutions
  const orderItemsHtml = status === "awaiting_customer_confirmation" && orderItems && orderItems.length > 0
    ? `
    <div style="margin: 24px 0;">
      <p style="margin: 0 0 16px 0; font-size: 14px; color: #6b7280; font-weight: 600;">ORDER ITEMS:</p>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb;">
        ${orderItems.map((item, idx) => {
          const showProductSubstitution = item.original_product_name && item.original_product_name !== item.product_name;
          const productDisplay = showProductSubstitution
            ? `<span style="text-decoration: line-through; color: #9ca3af;">${item.original_product_name}</span> → <span style="color: #f59e0b; font-weight: 600;">${item.product_name}</span>`
            : item.product_name || item.name;
          return `
          <tr style="${idx % 2 === 0 ? 'background-color: #f9fafb;' : ''}border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px; font-size: 14px; color: #111827; font-weight: 500;">${productDisplay}</td>
            <td style="padding: 12px; text-align: center; font-size: 14px; color: #6b7280;">
              ${item.original_quantity && item.original_quantity !== item.quantity
                ? `<span style="text-decoration: line-through;">${item.original_quantity}</span> → <span style="color: #f59e0b; font-weight: 600;">${item.quantity}</span>`
                : item.quantity}
            </td>
            <td style="padding: 12px; text-align: right; font-size: 14px; color: #111827; font-weight: 500;">$${(item.quantity * item.price_per_unit).toFixed(2)}</td>
          </tr>
        `}).join('')}
      </table>
    </div>
    `
    : "";

  // Determine CTA button based on status and recipient type
  let ctaButton = "";

  if (isAdminEmail && status === "pending_review") {
    // Admin gets direct link to review order
    ctaButton = `
      <a href="https://www.spiceandslice.shop/admin/orders"
         style="display: inline-block; background-color: ${template.color}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        Go to Admin Dashboard
      </a>
    `;
  } else if (status === "awaiting_customer_confirmation" && confirmationToken) {
    // Customer confirms order
    ctaButton = `
      <a href="https://www.spiceandslice.shop/order-confirm/${orderId}?token=${confirmationToken}"
         style="display: inline-block; background-color: ${template.color}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        Review & Confirm Order
      </a>
      <p style="margin: 16px 0 0 0; font-size: 12px; color: #9ca3af;">This link expires in 48 hours</p>
    `;
  } else {
    // Default: view order details
    ctaButton = `
      <a href="https://www.spiceandslice.shop/order/${orderId}"
         style="display: inline-block; background-color: ${template.color}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        View Order Details
      </a>
    `;
  }

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
                    <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">Hi ${isAdminEmail ? "Team" : customerName},</p>
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

                    ${orderItemsHtml}
                    ${estimatedTimeHtml}
                    ${driverNotesHtml}

                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 32px 0;">
                      ${ctaButton}
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
    const { orderId, newStatus, estimatedTime, driverNotes, confirmationToken, isAdminEmail } = body;

    console.log("Sending order status email:", { orderId, newStatus, isAdminEmail });

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError) {
      console.error("Error fetching order:", orderError);
      throw new Error(`Failed to fetch order: ${orderError.message}`);
    }

    if (!order) {
      throw new Error("Order not found");
    }

    // Fetch customer profile separately
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", order.user_id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      throw new Error(`Failed to fetch customer profile: ${profileError.message}`);
    }

    const customerEmail = profileData?.email;
    const customerName = profileData?.full_name || "Customer";

    if (!customerEmail) {
      throw new Error("Customer email not found");
    }

    // Fetch order items for awaiting_customer_confirmation to show adjustments
    let orderItems = undefined;
    if (newStatus === "awaiting_customer_confirmation") {
      const { data: items, error: itemsError } = await supabase
        .from("order_items")
        .select("*, products!product_id(name)")
        .eq("order_id", orderId);

      if (!itemsError && items) {
        orderItems = items.map((item: any) => ({
          product_name: item.products?.name,
          name: item.products?.name,
          quantity: item.quantity,
          original_quantity: item.original_quantity,
          original_product_name: item.original_product_name,
          price_per_unit: item.price_per_unit,
        }));
        console.log("Order items fetched:", orderItems);
      }
    }

    // Generate email content
    const emailContent = getEmailTemplate(
      newStatus,
      customerName,
      orderId,
      estimatedTime,
      driverNotes,
      confirmationToken,
      orderItems,
      isAdminEmail
    );

    // Determine recipient
    const recipientEmail = isAdminEmail ? "spiceandslicedfw@gmail.com" : customerEmail;

    // Send email via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "SpiceAndSlice <orders@management.spiceandslice.shop>",
        to: [recipientEmail],
        // Only add BCC for customer emails (to notify admin of customer messages)
        ...(isAdminEmail ? {} : { bcc: ["spiceandslicedfw@gmail.com"] }),
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

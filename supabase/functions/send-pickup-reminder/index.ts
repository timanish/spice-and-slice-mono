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
}

interface OrderItem {
  quantity: number;
  price_at_time: number;
  product_name: string;
  weight?: number;
  is_weighted?: boolean;
}

const getPickupReminderEmailTemplate = (
  customerName: string,
  orderId: string,
  pickupDate: string,
  pickupTime: string,
  orderItems: OrderItem[],
  orderTotal: number
) => {
  // Format pickup date
  const formattedDate = new Date(pickupDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Generate order items HTML
  const orderItemsHtml = orderItems
    .map((item) => {
      const itemQuantity =
        item.is_weighted && item.weight
          ? `${item.weight} lb`
          : `${item.quantity}x`;
      const itemPrice = (
        item.price_at_time *
        (item.is_weighted && item.weight ? item.weight : item.quantity)
      ).toFixed(2);

      return `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="color: #111827; font-size: 14px;">${item.product_name}</span>
            <span style="color: #6b7280; font-size: 14px; margin-left: 8px;">(${itemQuantity})</span>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right; color: #111827; font-size: 14px;">
            $${itemPrice}
          </td>
        </tr>
      `;
    })
    .join("");

  return {
    subject: `Pickup Reminder - Order #${orderId
      .substring(0, 8)
      .toUpperCase()}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pickup Reminder</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #f97316 0%, #f97316dd 100%); padding: 40px 30px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Spice & Slice</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 24px; font-weight: 600;">Your Order is Ready for Pickup! 🎉</h2>
                    <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">Hi ${customerName},</p>
                    <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      This is a friendly reminder that your order is ready for pickup. Please collect your order during your scheduled pickup window.
                    </p>
                    
                    <!-- Pickup Details -->
                    <div style="background-color: #fef3c7; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #f59e0b;">
                      <h3 style="margin: 0 0 16px 0; color: #92400e; font-size: 18px; font-weight: 600;">📅 Pickup Details</h3>
                      <p style="margin: 0 0 12px 0; color: #78350f; font-size: 14px;">
                        <strong>Date:</strong> ${formattedDate}
                      </p>
                      <p style="margin: 0 0 12px 0; color: #78350f; font-size: 14px;">
                        <strong>Time Window:</strong> ${pickupTime}
                      </p>
                      <p style="margin: 0; color: #78350f; font-size: 14px;">
                        <strong>Order Number:</strong> #${orderId
                          .substring(0, 8)
                          .toUpperCase()}
                      </p>
                    </div>

                    <!-- Store Location -->
                    <div style="background-color: #f0f9ff; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #3b82f6;">
                      <h3 style="margin: 0 0 16px 0; color: #1e40af; font-size: 18px; font-weight: 600;">📍 Pickup Location</h3>
                      <p style="margin: 0 0 12px 0; color: #1e3a8a; font-size: 14px; font-weight: 600;">
                        Spice & Slice
                      </p>
                      <p style="margin: 0 0 12px 0; color: #1e3a8a; font-size: 14px;">
                        7451 N Beach St #172<br>
                        Fort Worth, TX 76137
                      </p>
                      <a href="https://maps.google.com/?q=7451+N+Beach+St+172+Fort+Worth+TX+76137" 
                         style="display: inline-block; margin-top: 8px; color: #2563eb; text-decoration: none; font-size: 14px; font-weight: 500;">
                        Get Directions →
                      </a>
                    </div>

                    <!-- Order Items -->
                    <div style="margin: 24px 0;">
                      <h3 style="margin: 0 0 16px 0; color: #111827; font-size: 18px; font-weight: 600;">Your Order</h3>
                      <table style="width: 100%; border-collapse: collapse;">
                        ${orderItemsHtml}
                        <tr>
                          <td style="padding: 16px 0 0 0; font-weight: 600; font-size: 16px; color: #111827;">
                            Total
                          </td>
                          <td style="padding: 16px 0 0 0; text-align: right; font-weight: 600; font-size: 16px; color: #111827;">
                            $${orderTotal.toFixed(2)}
                          </td>
                        </tr>
                      </table>
                    </div>
                    
                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="https://www.spiceandslice.shop/order/${orderId}" 
                         style="display: inline-block; background-color: #f97316; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                        View Order Details
                      </a>
                    </div>
                    
                    <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                      If you have any questions or need to modify your pickup time, please contact us at 
                      <a href="tel:+16822555004" style="color: #f97316; text-decoration: none;">(682) 255-5004</a> or 
                      <a href="mailto:spiceandslicedfw@gmail.com" style="color: #f97316; text-decoration: none;">spiceandslicedfw@gmail.com</a>
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
    verifyServiceRoleKey(req);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body: RequestBody = await req.json();
    const { orderId } = body;

    console.log("Sending pickup reminder email for order:", orderId);

    // Fetch order details with items
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        `
        *,
        profiles:user_id (
          full_name,
          email
        ),
        order_items (
          quantity,
          price_at_time,
          weight,
          products (
            name,
            is_weighted
          )
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

    if (order.fulfillment_type !== "pickup") {
      throw new Error("Order is not a pickup order");
    }

    const customerEmail = order.profiles?.email;
    const customerName = order.profiles?.full_name || "Customer";

    if (!customerEmail) {
      throw new Error("Customer email not found");
    }

    // Format order items
    const orderItems: OrderItem[] = order.order_items.map((item: any) => ({
      quantity: item.quantity,
      price_at_time: item.price_at_time,
      product_name: item.products.name,
      weight: item.weight,
      is_weighted: item.products.is_weighted,
    }));

    // Generate email content
    const emailContent = getPickupReminderEmailTemplate(
      customerName,
      orderId,
      order.pickup_date,
      order.pickup_time,
      orderItems,
      order.total_amount
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
        reply_to: "spiceandslicedfw@gmail.com",
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
    console.log("Pickup reminder email sent successfully:", emailData);

    // Update order with sent timestamp
    const { error: updateError } = await supabase
      .from("orders")
      .update({ pickup_reminder_sent_at: new Date().toISOString() })
      .eq("id", orderId);

    if (updateError) {
      console.error("Error updating order reminder timestamp:", updateError);
      // Don't throw - email was sent successfully
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Pickup reminder email sent successfully",
        emailId: emailData.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-pickup-reminder function:", error);
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

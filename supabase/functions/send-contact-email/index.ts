import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import {
  isRateLimitedByIp,
  isRateLimitedByEmail,
  getClientIp,
} from "../_shared/rate-limiter.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const ADMIN_EMAIL = "spiceandslicedfw@gmail.com";
const SENDER_EMAIL =
  "SpiceAndSlice Contact <contact@management.spiceandslice.shop>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Escape HTML special characters to prevent XSS in email templates */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    console.log("Contact form submission received");
    const clientIp = getClientIp(req);

    if (isRateLimitedByIp(clientIp, 30, 60)) {
      console.error(`Rate limit exceeded for IP: ${clientIp}`);
      return new Response(
        JSON.stringify({ error: "Too many requests, please try again later" }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const raw = await req.json();

    if (!raw.name || !raw.email || !raw.message) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Use raw email for rate limiting and reply-to (needs real address)
    const rawEmail = raw.email;

    // Escape all user inputs for safe HTML embedding
    const name = escapeHtml(raw.name);
    const email = escapeHtml(raw.email);
    const phone = raw.phone ? escapeHtml(raw.phone) : "";
    const subject = raw.subject ? escapeHtml(raw.subject) : "";
    const message = escapeHtml(raw.message);

    if (isRateLimitedByEmail(rawEmail, 5, 3600)) {
      console.error(`Email rate limit exceeded for: ${email}`);
      return new Response(
        JSON.stringify({
          error:
            "You have sent too many messages recently. Please try again later.",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Processing contact form from ${name} (${email})`);

    try {
      const adminEmailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #FF5722;">New Contact Form Submission</h1>
          
          <h2>Contact Details:</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px; font-weight: bold;">Name:</td>
              <td style="padding: 8px;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold;">Email:</td>
              <td style="padding: 8px;">${email}</td>
            </tr>
            ${
              phone
                ? `
            <tr>
              <td style="padding: 8px; font-weight: bold;">Phone:</td>
              <td style="padding: 8px;">${phone}</td>
            </tr>
            `
                : ""
            }
            <tr>
              <td style="padding: 8px; font-weight: bold;">Subject:</td>
              <td style="padding: 8px;">${subject || "General Inquiry"}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold;">Date:</td>
              <td style="padding: 8px;">${new Date().toLocaleString()}</td>
            </tr>
          </table>
          
          <h2>Message:</h2>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
            <p>${message.replace(/\n/g, "<br/>")}</p>
          </div>
          
          <p style="margin-top: 20px; color: #666;">
            You can reply directly to this email to respond to the customer.
          </p>
        </div>
      `;

      const adminEmailResult = await resend.emails.send({
        from: SENDER_EMAIL,
        to: ADMIN_EMAIL,
        replyTo: rawEmail,
        subject: `New Contact Form: ${subject || "General Inquiry"}`,
        html: adminEmailContent,
      });

      console.log("Notification email sent to admin:", adminEmailResult);
    } catch (error) {
      console.error("Failed to send notification email to admin:", error);
    }

    try {
      const isCateringRequest =
        subject && subject.toLowerCase().includes("catering");

      let userEmailContent = "";

      if (isCateringRequest) {
        const eventTypeMatch = message.match(/Event Type:\s*(.+)/);
        const eventDateMatch = message.match(/Event Date:\s*(.+)/);
        const eventTimeMatch = message.match(/Event Time:\s*(.+)/);
        const guestCountMatch = message.match(/Guest Count:\s*(.+)/);
        const venueMatch = message.match(/Venue:\s*(.+)/);
        const spiceLevelMatch = message.match(/Spice Level:\s*(.+)/);
        const selectedItemsMatch = message.match(/Selected Items:\s*(.+)/);
        const dietaryRestrictionsMatch = message.match(
          /Dietary Restrictions:\s*(.+)/
        );
        const additionalInfoMatch = message.match(
          /Additional Information:\s*(.+)/
        );

        userEmailContent = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Catering Request Confirmation</title>
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
                        <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 16px;">Catering Services</p>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px 30px;">
                        <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 24px; font-weight: 600;">Thank You for Your Catering Request! 🎉</h2>
                        <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">Hi ${name},</p>
                        <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                          We've received your catering request and our team is reviewing the details. We'll get back to you within 24 hours to discuss menu options, pricing, and finalize arrangements for your event.
                        </p>
                        
                        <!-- Event Summary -->
                        <div style="background-color: #fef3c7; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #f59e0b;">
                          <h3 style="margin: 0 0 16px 0; color: #92400e; font-size: 18px; font-weight: 600;">📅 Event Summary</h3>
                          ${
                            eventTypeMatch
                              ? `<p style="margin: 0 0 12px 0; color: #78350f; font-size: 14px;"><strong>Event Type:</strong> ${eventTypeMatch[1]}</p>`
                              : ""
                          }
                          ${
                            eventDateMatch
                              ? `<p style="margin: 0 0 12px 0; color: #78350f; font-size: 14px;"><strong>Date:</strong> ${eventDateMatch[1]}</p>`
                              : ""
                          }
                          ${
                            eventTimeMatch
                              ? `<p style="margin: 0 0 12px 0; color: #78350f; font-size: 14px;"><strong>Time:</strong> ${eventTimeMatch[1]}</p>`
                              : ""
                          }
                          ${
                            guestCountMatch
                              ? `<p style="margin: 0 0 12px 0; color: #78350f; font-size: 14px;"><strong>Guest Count:</strong> ${guestCountMatch[1]}</p>`
                              : ""
                          }
                          ${
                            venueMatch
                              ? `<p style="margin: 0; color: #78350f; font-size: 14px;"><strong>Venue:</strong> ${venueMatch[1]}</p>`
                              : ""
                          }
                        </div>

                        ${
                          selectedItemsMatch
                            ? `
                        <!-- Menu Items -->
                        <div style="background-color: #f0f9ff; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #3b82f6;">
                          <h3 style="margin: 0 0 16px 0; color: #1e40af; font-size: 18px; font-weight: 600;">🍽️ Selected Menu Items</h3>
                          <p style="margin: 0; color: #1e3a8a; font-size: 14px; line-height: 1.8;">
                            ${selectedItemsMatch[1]
                              .split(",")
                              .map((item) => `• ${item.trim()}`)
                              .join("<br>")}
                          </p>
                          ${
                            spiceLevelMatch
                              ? `<p style="margin: 16px 0 0 0; color: #1e3a8a; font-size: 14px;"><strong>Spice Level:</strong> ${spiceLevelMatch[1]}</p>`
                              : ""
                          }
                        </div>
                        `
                            : ""
                        }

                        ${
                          dietaryRestrictionsMatch &&
                          dietaryRestrictionsMatch[1] !== "None"
                            ? `
                        <!-- Dietary Restrictions -->
                        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 24px 0;">
                          <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 16px; font-weight: 600;">🥗 Dietary Restrictions</h3>
                          <p style="margin: 0; color: #4b5563; font-size: 14px;">${dietaryRestrictionsMatch[1]}</p>
                        </div>
                        `
                            : ""
                        }

                        ${
                          additionalInfoMatch &&
                          additionalInfoMatch[1] !== "None"
                            ? `
                        <!-- Additional Information -->
                        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 24px 0;">
                          <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 16px; font-weight: 600;">📝 Additional Information</h3>
                          <p style="margin: 0; color: #4b5563; font-size: 14px; white-space: pre-line;">${additionalInfoMatch[1]}</p>
                        </div>
                        `
                            : ""
                        }
                        
                        <!-- Contact Info -->
                        <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #10b981;">
                          <h3 style="margin: 0 0 12px 0; color: #065f46; font-size: 16px; font-weight: 600;">📞 Your Contact Information</h3>
                          <p style="margin: 0 0 8px 0; color: #047857; font-size: 14px;"><strong>Email:</strong> ${email}</p>
                          ${
                            phone
                              ? `<p style="margin: 0; color: #047857; font-size: 14px;"><strong>Phone:</strong> ${phone}</p>`
                              : ""
                          }
                        </div>
                        
                        <!-- Next Steps -->
                        <div style="background-color: #fff7ed; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #f97316;">
                          <h3 style="margin: 0 0 16px 0; color: #9a3412; font-size: 18px; font-weight: 600;">What Happens Next?</h3>
                          <ol style="margin: 0; padding-left: 20px; color: #7c2d12; font-size: 14px; line-height: 1.8;">
                            <li style="margin-bottom: 8px;">Our catering team will review your request</li>
                            <li style="margin-bottom: 8px;">We'll contact you within 24 hours to discuss details</li>
                            <li style="margin-bottom: 8px;">We'll provide a customized menu and pricing quote</li>
                            <li>Once approved, we'll confirm your booking and event details</li>
                          </ol>
                        </div>
                        
                        <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                          If you have any urgent questions or need to make changes to your request, please contact us at 
                          <a href="tel:+16822555004" style="color: #f97316; text-decoration: none;">(682) 255-5004</a> or reply to this email.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="padding: 30px; background-color: #f9fafb; border-radius: 0 0 12px 12px; text-align: center;">
                        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">Thank you for choosing Spice & Slice!</p>
                        <p style="margin: 0 0 16px 0; color: #9ca3af; font-size: 12px;">7451 N Beach St #172, Fort Worth, TX 76137</p>
                        <p style="margin: 0; color: #9ca3af; font-size: 12px;">© ${new Date().getFullYear()} Spice & Slice. All rights reserved.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `;
      } else {
        // Regular contact form confirmation
        userEmailContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #4CAF50;">Thank you for contacting us!</h1>
            <p>Hi ${name},</p>
            <p>We've received your message and will get back to you as soon as possible.</p>
            
            <h2>Your Message:</h2>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Subject:</strong> ${subject || "General Inquiry"}</p>
              <p><strong>Message:</strong> ${message}</p>
            </div>
            
            <p>If you have any other questions, feel free to reply to this email.</p>
            <p>Thank you for contacting us!</p>
            <p style="color: #666; margin-top: 30px;">SpiceAndSlice Bazaar Team</p>
          </div>
        `;
      }

      const userEmailResult = await resend.emails.send({
        from: SENDER_EMAIL,
        to: rawEmail,
        replyTo: ADMIN_EMAIL,
        subject: isCateringRequest
          ? "Your Catering Request - Spice & Slice"
          : "We've received your message - SpiceAndSlice Bazaar",
        html: userEmailContent,
      });

      console.log("Confirmation email sent to user:", userEmailResult);
    } catch (error) {
      console.error("Failed to send confirmation email to user:", error);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Your message has been sent" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing contact form submission:", error);
    return new Response(
      JSON.stringify({
        error:
          error.message || "An error occurred while processing your message",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

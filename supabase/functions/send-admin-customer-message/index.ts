import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { authenticateRequest } from "../_shared/clerk-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const ADMIN_EMAIL = "spiceandslicedfw@gmail.com";
const SENDER_EMAIL = "SpiceAndSlice <orders@management.spiceandslice.shop>";

const getServiceRoleClient = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  return createClient(supabaseUrl, serviceRoleKey);
};

interface MessageData {
  recipientEmail: string;
  subject: string;
  messageBody: string;
  userId: string;
  templateId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const serviceClient = getServiceRoleClient();

    // Authenticate request (admin only)
    const authHeader = req.headers.get("Authorization");
    const adminUserId = await authenticateRequest(authHeader, serviceClient, true);

    const messageData: MessageData = await req.json();

    if (!messageData.recipientEmail || !messageData.subject || !messageData.messageBody) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email
    const emailResponse = await resend.emails.send({
      from: SENDER_EMAIL,
      to: messageData.recipientEmail,
      bcc: ADMIN_EMAIL,
      subject: messageData.subject,
      html: messageData.messageBody,
    });

    if (emailResponse.error) {
      console.error("Email send error:", emailResponse.error);
      throw new Error(`Failed to send email: ${emailResponse.error.message}`);
    }

    // Log message to database
    const { error: logError } = await serviceClient
      .from("customer_messages")
      .insert({
        user_id: messageData.userId,
        template_id: messageData.templateId,
        subject: messageData.subject,
        message_body: messageData.messageBody,
        sent_at: new Date().toISOString(),
        sent_by_user_id: adminUserId,
      });

    if (logError) {
      console.error("Error logging message:", logError);
      throw new Error("Message sent but failed to log");
    }

    return new Response(
      JSON.stringify({ success: true, messageId: emailResponse.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-admin-customer-message:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

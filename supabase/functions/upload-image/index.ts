import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { authenticateRequest } from "../_shared/clerk-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

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
    const serviceClient = getServiceRoleClient();

    // Verify Clerk JWT — any authenticated user can upload
    const authHeader = req.headers.get("Authorization");
    const requireAdmin =
      req.headers.get("x-require-admin") === "true";
    await authenticateRequest(authHeader, serviceClient, requireAdmin);

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const filePath = formData.get("filePath") as string | null;

    if (!file || !filePath) {
      return new Response(
        JSON.stringify({ error: "Missing file or filePath" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return new Response(
        JSON.stringify({
          error: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 5MB`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Upload via service role (bypasses storage RLS)
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await serviceClient.storage
      .from("menu-items")
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: `Upload failed: ${uploadError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get public URL
    const { data: urlData } = serviceClient.storage
      .from("menu-items")
      .getPublicUrl(filePath);

    return new Response(
      JSON.stringify({
        success: true,
        publicUrl: urlData.publicUrl,
        filePath,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in upload-image:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const isAuthError =
      message.includes("authorization") ||
      message.includes("token") ||
      message.includes("User not found") ||
      message.includes("Admin access required");

    return new Response(
      JSON.stringify({ error: message }),
      {
        status: isAuthError ? 401 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

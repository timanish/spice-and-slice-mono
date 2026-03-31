// deno-lint-ignore-file no-explicit-any
/// <reference lib="deno.ns" />

/**
 * Fetch food images from Pexels for menu items and upload to Supabase storage.
 *
 * Requires: PEXELS_API_KEY env var (free at https://www.pexels.com/api/)
 * Admin auth required.
 * Max 10 items per request to stay within edge function timeout.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { authenticateRequest } from "../_shared/clerk-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

async function searchPexels(
  query: string,
  apiKey: string,
): Promise<string | null> {
  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query + " food dish")}&per_page=1&orientation=landscape`;
    const res = await fetch(url, {
      headers: { Authorization: apiKey },
    });

    if (!res.ok) return null;

    const data = await res.json();
    // Use medium size (~350x230) — good for TV display
    return data.photos?.[0]?.src?.medium ?? null;
  } catch {
    return null;
  }
}

async function downloadImage(
  imageUrl: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = await res.arrayBuffer();
    return { bytes: new Uint8Array(buffer), contentType };
  } catch {
    return null;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Admin auth
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    try {
      await authenticateRequest(authHeader, db, true);
    } catch (authErr: any) {
      return errorResponse("Unauthorized: " + authErr.message, 401);
    }

    const pexelsKey = Deno.env.get("PEXELS_API_KEY");
    if (!pexelsKey) {
      return errorResponse(
        "PEXELS_API_KEY not configured. Get a free key at https://www.pexels.com/api/",
        502,
      );
    }

    const { items } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return errorResponse("items must be a non-empty array");
    }
    if (items.length > 10) {
      return errorResponse("Maximum 10 items per request");
    }

    const results: { name: string; image_url: string | null }[] = [];

    for (const item of items) {
      const name = item.name as string;
      const subCategory = item.sub_category as string | undefined;
      const query = subCategory ? `${name} ${subCategory}` : name;

      // Search Pexels
      const pexelsUrl = await searchPexels(query, pexelsKey);
      if (!pexelsUrl) {
        results.push({ name, image_url: null });
        continue;
      }

      // Download image
      const image = await downloadImage(pexelsUrl);
      if (!image) {
        results.push({ name, image_url: null });
        continue;
      }

      // Upload to Supabase storage
      const ext = image.contentType.includes("png") ? "png" : "jpg";
      const fileName = `auto-${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await db.storage
        .from("menu-items")
        .upload(fileName, image.bytes, {
          contentType: image.contentType,
          upsert: true,
        });

      if (uploadError) {
        console.error(`Upload failed for ${name}:`, uploadError);
        results.push({ name, image_url: null });
        continue;
      }

      const { data: urlData } = db.storage
        .from("menu-items")
        .getPublicUrl(fileName);

      results.push({ name, image_url: urlData.publicUrl });
    }

    return jsonResponse({ results });
  } catch (error: any) {
    console.error("fetch-menu-images error:", error);
    return errorResponse(error.message || "Internal server error", 500);
  }
});

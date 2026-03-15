// deno-lint-ignore-file no-explicit-any
/// <reference lib="deno.ns" />

/**
 * Generate short menu item descriptions using Claude.
 *
 * Accepts a list of { name, sub_category? } objects and returns
 * a list of { name, description } pairs.
 *
 * Requires admin auth (Clerk JWT + admin role check).
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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Auth — admin only
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    try {
      await authenticateRequest(authHeader, db, true);
    } catch (authErr: any) {
      return errorResponse("Unauthorized: " + authErr.message, 401);
    }

    const { items } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return errorResponse("items must be a non-empty array");
    }

    if (items.length > 50) {
      return errorResponse("Maximum 50 items per request");
    }

    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      return errorResponse("AI service is not configured", 502);
    }

    // Build prompt
    const itemList = items
      .map(
        (item: any, i: number) =>
          `${i + 1}. ${item.name}${item.sub_category ? ` (${item.sub_category})` : ""}`,
      )
      .join("\n");

    const model = Deno.env.get("ANTHROPIC_MODEL") || "claude-haiku-4-5-20251001";

    const claudeResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicApiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          system:
            "You are a menu copywriter for an Indian & Nepali restaurant. Write short, appetizing descriptions (1 sentence, max 15 words) for each menu item. Focus on key ingredients, cooking style, or flavor profile. Do not use exclamation marks. Return ONLY a JSON array of objects with 'name' and 'description' fields, matching the input order. No markdown, no explanation.",
          messages: [
            {
              role: "user",
              content: `Generate descriptions for these menu items:\n\n${itemList}`,
            },
          ],
        }),
      },
    );

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      console.error("Claude API error:", claudeResponse.status, errText);
      return errorResponse("AI service error", 502);
    }

    const result = await claudeResponse.json();
    const text = result.content?.[0]?.text || "[]";

    // Parse JSON from response
    let descriptions: { name: string; description: string }[];
    try {
      descriptions = JSON.parse(text);
    } catch {
      // Try to extract JSON from the response
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        descriptions = JSON.parse(match[0]);
      } else {
        return errorResponse("Failed to parse AI response", 502);
      }
    }

    return jsonResponse({ descriptions });
  } catch (error: any) {
    console.error("generate-menu-descriptions error:", error);
    return errorResponse(error.message || "Internal server error", 500);
  }
});

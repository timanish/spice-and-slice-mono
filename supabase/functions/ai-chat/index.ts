// deno-lint-ignore-file no-explicit-any
/// <reference lib="deno.ns" />

/**
 * AI Chat Edge Function — streams Claude responses for the store chatbot.
 *
 * Flow:
 *  1. CORS preflight
 *  2. Rate limit by IP (pre-auth)
 *  3. Authenticate via Clerk JWT (optional — anonymous allowed)
 *  4. Rate limit: 5/hour anonymous, 20/min authenticated
 *  5. Validate request body
 *  6. Build system prompt with store context
 *  7. Call Claude API with streaming
 *  8. Proxy SSE stream back to client
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { authenticateRequest } from "../_shared/clerk-auth.ts";
import {
  isRateLimitedByIp,
  isRateLimitedByProfileId,
  getClientIp,
} from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

// --------------- System Prompt ---------------

const SYSTEM_PROMPT = `You are the AI assistant for Spice&Slice Bazaar, an Indian & Nepali grocery store in Fort Worth, Texas.

STORE INFO:
- Address: 7451 N Beach St #172, Fort Worth, TX 76137
- Phone: 682-255-5004
- Hours: Mon-Fri 11am-9pm, Sat-Sun 11am-10pm
- Services: Delivery (select zones), Pickup, Catering (call for quotes), Lunch Box Subscriptions

TONE RULES:
- Be direct. Answer the question immediately. No filler phrases like "Great question!", "Absolutely!", "I'd be happy to help!", or "That's a great choice!".
- Keep it short — 1-3 sentences. Only go longer if the question genuinely requires it.
- Be warm but not performative. Sound like a knowledgeable store employee, not a customer service chatbot.
- Use plain language. No exclamation marks unless genuinely excited about something.

KNOWLEDGE RULES:
- Use the CURRENT PRODUCTS and CURRENT DEALS sections below to answer product questions with real data.
- If a product is listed below, give specifics (name, price, category). If it's not listed, say "I don't see that in our current inventory, but you can call us at 682-255-5004 to check."
- Never make up products, prices, or deals that aren't in the data below.
- For weighted items, mention the price is per unit of measure (e.g., per lb, per kg).
- If asked about something off-topic, briefly redirect: "I can help with anything related to our store and products."

{{PRODUCT_DATA}}

{{FLASH_DEALS}}

{{USER_CONTEXT}}`;

// --------------- Data Fetchers ---------------

async function fetchProductSummary(db: any): Promise<string> {
  try {
    const { data: products, error } = await db
      .from("products")
      .select("name, price_per_unit, is_weighted, unit_of_measure, category:categories(name), is_active")
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .limit(200);

    if (error || !products || products.length === 0) {
      return "CURRENT PRODUCTS:\nProduct data temporarily unavailable.";
    }

    // Group by category
    const byCategory: Record<string, string[]> = {};
    for (const p of products) {
      const cat = p.category?.name || "Other";
      if (!byCategory[cat]) byCategory[cat] = [];
      const price = p.is_weighted
        ? `$${p.price_per_unit}/${p.unit_of_measure || "lb"}`
        : `$${p.price_per_unit}`;
      byCategory[cat].push(`${p.name} (${price})`);
    }

    let summary = "CURRENT PRODUCTS:\n";
    for (const [cat, items] of Object.entries(byCategory)) {
      summary += `\n${cat}: ${items.join(", ")}`;
    }
    return summary;
  } catch (e) {
    console.error("Failed to fetch products:", e);
    return "CURRENT PRODUCTS:\nProduct data temporarily unavailable.";
  }
}

async function fetchFlashDeals(db: any): Promise<string> {
  try {
    const now = new Date().toISOString();
    const { data: deals, error } = await db
      .from("flash_deals")
      .select("discount_percentage, start_date, end_date, flash_deal_products(product:products(name, price_per_unit))")
      .eq("is_active", true)
      .lte("start_date", now)
      .gte("end_date", now);

    if (error || !deals || deals.length === 0) {
      return "CURRENT DEALS:\nNo active flash deals right now.";
    }

    let summary = "CURRENT DEALS:\n";
    for (const deal of deals) {
      const pct = deal.discount_percentage;
      const products = deal.flash_deal_products
        ?.map((fdp: any) => {
          const p = fdp.product;
          if (!p) return null;
          const original = p.price_per_unit;
          const discounted = (original * (1 - pct / 100)).toFixed(2);
          return `${p.name} — was $${original}, now $${discounted} (${pct}% off)`;
        })
        .filter(Boolean);

      if (products && products.length > 0) {
        const endDate = new Date(deal.end_date).toLocaleDateString("en-US", {
          month: "short", day: "numeric",
        });
        summary += `\n${pct}% off (ends ${endDate}): ${products.join("; ")}`;
      }
    }
    return summary;
  } catch (e) {
    console.error("Failed to fetch flash deals:", e);
    return "CURRENT DEALS:\nDeal data temporarily unavailable.";
  }
}

// --------------- Validation ---------------

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function validateMessages(messages: any, maxHistory = 20): { valid: ChatMessage[]; error?: string } {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { valid: [], error: "messages must be a non-empty array" };
  }

  const allowedRoles = new Set(["user", "assistant"]);

  for (const msg of messages) {
    if (!msg || typeof msg !== "object") {
      return { valid: [], error: "Each message must be an object" };
    }
    if (!allowedRoles.has(msg.role)) {
      return { valid: [], error: `Invalid role: ${msg.role}. Allowed: user, assistant` };
    }
    if (typeof msg.content !== "string" || msg.content.trim().length === 0) {
      return { valid: [], error: "Each message must have non-empty content" };
    }
    const MAX_MESSAGE_LENGTH = 4000;
    if (msg.content.length > MAX_MESSAGE_LENGTH) {
      return { valid: [], error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` };
    }
  }

  // Keep only the last N messages
  const trimmed = messages.slice(-maxHistory).map((m: any) => ({
    role: m.role as "user" | "assistant",
    content: m.content.trim(),
  }));

  return { valid: trimmed };
}

// --------------- Handler ---------------

serve(async (req: Request) => {
  // 1. CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    // 2. Rate limit by IP (pre-auth, 30/min)
    const clientIp = getClientIp(req);
    if (isRateLimitedByIp(clientIp, 30, 60)) {
      return new Response(JSON.stringify({ error: "Too many requests, please try again later" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
      });
    }

    // 3. Authenticate — optional (anonymous users allowed with stricter limits)
    const db = getServiceClient();
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    let isAnonymous = true;

    if (authHeader) {
      try {
        userId = await authenticateRequest(authHeader, db, false);
        isAnonymous = false;
      } catch {
        // Invalid/expired token — treat as anonymous
      }
    }

    // 4. Rate limit — stricter for anonymous users
    if (isAnonymous) {
      if (isRateLimitedByIp(clientIp, 5, 3600)) {
        return new Response(
          JSON.stringify({ error: "Message limit reached. Sign up for unlimited access.", code: "anon_limit" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "3600" } },
        );
      }
    } else {
      if (isRateLimitedByProfileId(userId!, 20, 60)) {
        return new Response(
          JSON.stringify({ error: "Too many requests, please try again later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } },
        );
      }
    }

    // 5. Parse and validate request body
    let body: any;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body");
    }

    const { messages, userContext } = body;

    const { valid: validMessages, error: validationError } = validateMessages(messages, isAnonymous ? 5 : 20);
    if (validationError) {
      return errorResponse(validationError);
    }

    // 6. Build system prompt with product data and user context
    const [productSummary, dealsSummary] = await Promise.all([
      fetchProductSummary(db),
      fetchFlashDeals(db),
    ]);

    let contextBlock = "";
    if (userContext && typeof userContext === "object") {
      const ALLOWED_CONTEXT_KEYS = new Set(["name", "email", "recentOrders", "preferences"]);
      const MAX_CONTEXT_LENGTH = 2000;
      const sanitized: Record<string, any> = {};
      for (const key of Object.keys(userContext)) {
        if (ALLOWED_CONTEXT_KEYS.has(key)) {
          sanitized[key] = userContext[key];
        }
      }
      const serialized = JSON.stringify(sanitized, null, 2);
      if (serialized.length <= MAX_CONTEXT_LENGTH) {
        contextBlock = "\nUser Context:\n" + serialized;
      }
    }

    const systemPrompt = SYSTEM_PROMPT
      .replace("{{PRODUCT_DATA}}", productSummary)
      .replace("{{FLASH_DEALS}}", dealsSummary)
      .replace("{{USER_CONTEXT}}", contextBlock);

    // 7. Call Claude API with streaming
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      console.error("ANTHROPIC_API_KEY is not set");
      return errorResponse("AI service is not configured", 502);
    }

    const model = Deno.env.get("ANTHROPIC_MODEL") || "claude-haiku-4-5-20251001";

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: isAnonymous ? 512 : 1024,
        system: systemPrompt,
        messages: validMessages,
        stream: true,
      }),
    });

    // Handle Claude API errors
    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      console.error("Claude API error:", claudeResponse.status, errText);

      if (claudeResponse.status === 429) {
        return errorResponse("AI service is temporarily busy, please try again shortly", 429);
      }
      return errorResponse("AI service error", 502);
    }

    // 8. Stream the response back
    if (!claudeResponse.body) {
      return errorResponse("No response from AI service", 502);
    }

    return new Response(claudeResponse.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("ai-chat error:", error);
    return errorResponse(error.message || "Internal server error", 500);
  }
});

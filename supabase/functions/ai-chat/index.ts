// deno-lint-ignore-file no-explicit-any
/// <reference lib="deno.ns" />

/**
 * AI Chat Edge Function — streams Claude responses for the store chatbot.
 *
 * Flow:
 *  1. CORS preflight
 *  2. Rate limit by IP (pre-auth)
 *  3. Authenticate via Clerk JWT
 *  4. Rate limit by user ID (post-auth)
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

const SYSTEM_PROMPT = `You are the friendly AI assistant for Spice&Slice Bazaar, an Indian & Nepali grocery and food store.

Store Information:
- Name: Spice&Slice Bazaar
- Address: 7451 N Beach St #172, Fort Worth, TX 76137
- Phone: 682-255-5004
- Hours: Monday-Friday 11am-9pm, Saturday-Sunday 11am-10pm
- Services: Delivery, Pickup, Catering, Lunch Box Subscriptions
- Website sections: Products, Catering, Lunch Box, Flash Deals

Rules:
- Keep responses concise and helpful (2-3 sentences when possible).
- Use a warm, welcoming tone.
- Do not fabricate product names, prices, or availability — if unsure, suggest the customer check the website or call the store.
- If a question is off-topic (not related to food, the store, or general cooking), politely redirect the conversation back to how you can help with their food needs.
- You can help with: product questions, order guidance, store hours/location, catering inquiries, lunch box subscriptions, dietary information, and cooking tips for items sold in the store.

{{USER_CONTEXT}}`;

// --------------- Validation ---------------

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function validateMessages(messages: any): { valid: ChatMessage[]; error?: string } {
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

  // Keep only the last 20 messages
  const trimmed = messages.slice(-20).map((m: any) => ({
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

    // 3. Authenticate via Clerk JWT
    const db = getServiceClient();
    const authHeader = req.headers.get("Authorization");
    let userId: string;

    try {
      userId = await authenticateRequest(authHeader, db, false);
    } catch (authError: any) {
      const msg = authError.message || "Unauthorized";
      const status = msg.includes("Admin access required") ? 403 : 401;
      return errorResponse("Unauthorized: " + msg, status);
    }

    // 4. Rate limit by user ID (post-auth, 20/min)
    if (isRateLimitedByProfileId(userId, 20, 60)) {
      return new Response(JSON.stringify({ error: "Too many requests, please try again later" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
      });
    }

    // 5. Parse and validate request body
    let body: any;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body");
    }

    const { messages, userContext } = body;

    const { valid: validMessages, error: validationError } = validateMessages(messages);
    if (validationError) {
      return errorResponse(validationError);
    }

    // 6. Build system prompt with user context (sanitized)
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
    const systemPrompt = SYSTEM_PROMPT.replace("{{USER_CONTEXT}}", contextBlock);

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
        max_tokens: 1024,
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

# AI Chat Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an authenticated AI chat assistant (floating bubble) powered by Claude, restricted to logged-in users.

**Architecture:** Supabase Edge Function proxies to Claude API with streaming. React chat bubble component renders only for authenticated users. System prompt contains store context. Model configurable via env var.

**Tech Stack:** Supabase Edge Functions (Deno), Claude Messages API (streaming), React, Tailwind CSS, Clerk auth, existing `fetchWithAuth` helper.

---

### Task 1: Create the Edge Function

**Files:**
- Create: `supabase/functions/ai-chat/index.ts`

**Step 1: Create the edge function file**

```typescript
// supabase/functions/ai-chat/index.ts
// deno-lint-ignore-file no-explicit-any
/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { authenticateRequest } from "../_shared/clerk-auth.ts";
import {
  isRateLimitedByProfileId,
  getClientIp,
  isRateLimitedByIp,
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

const SYSTEM_PROMPT = `You are the Spice&Slice Bazaar assistant — a friendly, knowledgeable helper for an Indian & South Asian grocery and food store in Fort Worth, Texas.

STORE INFO:
- Name: Spice&Slice Bazaar
- Address: 7451 N Beach St #172, Fort Worth, TX 76137
- Phone: 682-255-5004
- Hours: Mon-Fri 11am-9pm, Sat-Sun 11am-10pm
- Website: spiceandslice.com

SERVICES:
- In-store shopping
- Online ordering with delivery (select Fort Worth zones)
- In-store pickup
- Catering for events and parties (contact store for custom quotes)
- Daily lunch box subscription service

CAPABILITIES:
- Answer questions about products, ingredients, spice levels, dietary info
- Help with meal planning and product recommendations
- Explain delivery areas, store hours, pickup and catering options
- Suggest products for specific cuisines, dietary needs (vegetarian, vegan, gluten-free)
- Help customers navigate the website

RULES:
- Keep responses concise (2-3 sentences when possible, max 4-5 for complex questions)
- For specific pricing, say "check our products page for current prices"
- For order status or account issues, direct to the profile page
- For catering quotes, suggest calling the store or using the catering page
- Never fabricate product info — say "I'm not sure, but you can check our products page or call us" if uncertain
- Be warm, enthusiastic about food, and helpful
- If asked something unrelated to food/store, politely redirect to how you can help with their shopping

{{USER_CONTEXT}}`;

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Rate limit by IP first (before auth, to block spam)
    const clientIp = getClientIp(req);
    if (isRateLimitedByIp(clientIp, 30, 60)) {
      return new Response(
        JSON.stringify({ error: "Too many requests, please try again later" }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Authenticate
    const db = getServiceClient();
    const userId = await authenticateRequest(
      req.headers.get("Authorization"),
      db,
    );

    // Rate limit by user (stricter - 20 messages/minute)
    if (isRateLimitedByProfileId(userId, 20, 60)) {
      return new Response(
        JSON.stringify({
          error: "You're sending messages too quickly. Please wait a moment.",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Parse request body
    const { messages, userContext } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate message format (only allow user/assistant roles from client)
    const validMessages = messages
      .filter(
        (m: any) =>
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim().length > 0,
      )
      .slice(-20); // Keep last 20 messages to limit context size

    if (validMessages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid messages provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Build system prompt (with optional user context for future concierge mode)
    let systemPrompt = SYSTEM_PROMPT;
    if (userContext && typeof userContext === "object") {
      const contextStr = Object.entries(userContext)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join("\n");
      systemPrompt = systemPrompt.replace(
        "{{USER_CONTEXT}}",
        `\nCUSTOMER CONTEXT:\n${contextStr}`,
      );
    } else {
      systemPrompt = systemPrompt.replace("{{USER_CONTEXT}}", "");
    }

    // Call Claude API with streaming
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const model =
      Deno.env.get("ANTHROPIC_MODEL") || "claude-haiku-4-5-20251001";

    const anthropicResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          system: systemPrompt,
          messages: validMessages,
          stream: true,
        }),
      },
    );

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error("Claude API error:", anthropicResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Stream the response back to the client
    return new Response(anthropicResponse.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("ai-chat error:", error.message);

    const status =
      error.message === "Missing authorization header" ||
      error.message === "No token provided"
        ? 401
        : error.message === "User not found"
          ? 403
          : 500;

    return new Response(JSON.stringify({ error: error.message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

**Step 2: Verify the function structure**

Run: `ls supabase/functions/ai-chat/`
Expected: `index.ts`

**Step 3: Commit**

```bash
git add supabase/functions/ai-chat/index.ts
git commit -m "feat: add ai-chat edge function with Claude streaming"
```

---

### Task 2: Create the chat hook

**Files:**
- Create: `src/hooks/useAIChat.ts`

**Step 1: Create the custom hook for chat state and streaming**

```typescript
// src/hooks/useAIChat.ts
import { useState, useCallback, useRef } from "react";
import { fetchWithAuth } from "@/lib/auth-token";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface UseAIChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
}

export function useAIChat(): UseAIChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      setError(null);

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: content.trim(),
      };

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);

      try {
        // Build messages array for API (without IDs)
        const apiMessages = [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await fetchWithAuth("ai-chat", {
          messages: apiMessages,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to get response");
        }

        // Parse SSE stream from Claude API
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (
                parsed.type === "content_block_delta" &&
                parsed.delta?.text
              ) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      content: last.content + parsed.delta.text,
                    };
                  }
                  return updated;
                });
              }
            } catch {
              // Skip non-JSON lines
            }
          }
        }
      } catch (err: any) {
        setError(err.message || "Something went wrong");
        // Remove the empty assistant message on error
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === "assistant" && last.content === "") {
            updated.pop();
          }
          return updated;
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, isStreaming],
  );

  const clearChat = useCallback(() => {
    abortControllerRef.current?.abort();
    setMessages([]);
    setError(null);
    setIsStreaming(false);
  }, []);

  return { messages, isStreaming, error, sendMessage, clearChat };
}
```

**Step 2: Commit**

```bash
git add src/hooks/useAIChat.ts
git commit -m "feat: add useAIChat hook with SSE streaming"
```

---

### Task 3: Create the chat panel component

**Files:**
- Create: `src/components/ai-chat/AIChatPanel.tsx`

**Step 1: Create the chat panel UI**

```tsx
// src/components/ai-chat/AIChatPanel.tsx
import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { X, Send, Trash2, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAIChat } from "@/hooks/useAIChat";

interface AIChatPanelProps {
  onClose: () => void;
}

export function AIChatPanel({ onClose }: AIChatPanelProps) {
  const { messages, isStreaming, error, sendMessage, clearChat } = useAIChat();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input);
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col w-[360px] sm:w-[400px] h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-food-red to-food-orange text-white">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <span className="font-semibold text-sm">Spice&Slice Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/20"
              onClick={clearChat}
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 px-4">
            <MessageCircle className="w-10 h-10 mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">
              Hi! I'm your Spice&Slice assistant.
            </p>
            <p className="text-xs mt-1">
              Ask me about products, delivery, catering, or menu recommendations!
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-food-red text-white rounded-br-md"
                  : "bg-gray-100 text-gray-800 rounded-bl-md"
              }`}
            >
              {msg.content || (
                <span className="inline-flex items-center gap-1 text-gray-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Thinking...
                </span>
              )}
            </div>
          </div>
        ))}

        {error && (
          <div className="text-center">
            <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 inline-block">
              {error}
            </p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about products, delivery..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-food-orange focus:border-transparent placeholder:text-gray-400 max-h-20"
            disabled={isStreaming}
          />
          <Button
            size="icon"
            className="h-9 w-9 rounded-xl bg-food-red hover:bg-food-red/90 shrink-0"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/ai-chat/AIChatPanel.tsx
git commit -m "feat: add AIChatPanel component with streaming UI"
```

---

### Task 4: Create the floating chat bubble

**Files:**
- Create: `src/components/ai-chat/AIChatBubble.tsx`

**Step 1: Create the bubble wrapper with auth gating**

```tsx
// src/components/ai-chat/AIChatBubble.tsx
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { AIChatPanel } from "./AIChatPanel";

export function AIChatBubble() {
  const { isSignedIn, isLoaded } = useUser();
  const [isOpen, setIsOpen] = useState(false);

  // Don't render anything for logged-out users
  if (!isLoaded || !isSignedIn) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {/* Chat Panel */}
      {isOpen && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-200">
          <AIChatPanel onClose={() => setIsOpen(false)} />
        </div>
      )}

      {/* Floating Bubble Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="group w-14 h-14 rounded-full bg-gradient-to-r from-food-red to-food-orange text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center"
        aria-label={isOpen ? "Close chat" : "Open chat assistant"}
      >
        <MessageCircle
          className={`w-6 h-6 transition-transform duration-200 ${isOpen ? "scale-0" : "scale-100"}`}
        />
        <span
          className={`absolute text-xl font-bold transition-transform duration-200 ${isOpen ? "scale-100" : "scale-0"}`}
        >
          ×
        </span>
      </button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/ai-chat/AIChatBubble.tsx
git commit -m "feat: add AIChatBubble with auth gating"
```

---

### Task 5: Mount the chat bubble in App.tsx

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add the import and mount the component**

Add import at top of file (after other component imports, around line 49):
```typescript
import { AIChatBubble } from "./components/ai-chat/AIChatBubble";
```

Add `<AIChatBubble />` inside the `<AuthProvider>` block, after `<CartInitializer />` (around line 70):
```tsx
<CartInitializer />
<AIChatBubble />
```

**Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat: mount AIChatBubble in app layout"
```

---

### Task 6: Set Supabase secrets and deploy

**Step 1: Set the required secrets**

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key-here
supabase secrets set ANTHROPIC_MODEL=claude-haiku-4-5-20251001
```

**Step 2: Deploy the edge function**

```bash
supabase functions deploy ai-chat
```

**Step 3: Test the function locally (optional)**

```bash
supabase functions serve ai-chat --env-file .env.local
```

**Step 4: Commit any config changes if needed**

---

### Task 7: Manual testing checklist

1. **Logged out:** Visit site — no chat bubble visible
2. **Logged in:** Chat bubble appears bottom-right
3. **Open panel:** Click bubble — panel slides up
4. **Send message:** Type "what are your hours?" — get streamed response
5. **Rate limit:** Send 20+ messages quickly — get rate limit error
6. **Clear chat:** Click trash icon — messages clear
7. **Close/reopen:** Messages persist while panel is mounted, reset on page refresh
8. **Mobile:** Panel should be usable on small screens (360px width with sm:400px)

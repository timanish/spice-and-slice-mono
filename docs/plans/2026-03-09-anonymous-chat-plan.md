# Anonymous Chat Access Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow anonymous (not-logged-in) users to send 5 messages per session before requiring signup, while keeping stricter server-side rate limits for unauthenticated requests.

**Architecture:** Edge function makes auth optional — if no token, applies strict IP rate limit (5/hour). Client tracks anonymous message count in sessionStorage and shows a signup prompt at the limit. Authenticated users are unaffected.

**Tech Stack:** Supabase Edge Functions (Deno), React, Clerk auth, sessionStorage.

---

### Task 1: Make edge function auth optional with anonymous rate limits

**Files:**
- Modify: `supabase/functions/ai-chat/index.ts`

**Step 1: Update the auth section to be optional**

Replace the current auth block (lines 220-239) with a dual-path approach:

```typescript
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
        // Invalid token — treat as anonymous rather than rejecting
        // This handles expired tokens gracefully
      }
    }

    // 4. Rate limit — stricter for anonymous users
    if (isAnonymous) {
      // Anonymous: 5 messages per hour per IP
      if (isRateLimitedByIp(clientIp, 5, 3600)) {
        return new Response(
          JSON.stringify({ error: "Message limit reached. Sign up for unlimited access.", code: "anon_limit" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "3600" } },
        );
      }
    } else {
      // Authenticated: 20 messages per minute per user
      if (isRateLimitedByProfileId(userId!, 20, 60)) {
        return new Response(
          JSON.stringify({ error: "Too many requests, please try again later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } },
        );
      }
    }
```

**Step 2: Adjust Claude params for anonymous users**

After building the system prompt, adjust max_tokens and message history for anonymous:

```typescript
    // Adjust limits for anonymous users
    const maxTokens = isAnonymous ? 512 : 1024;
    const maxHistory = isAnonymous ? 5 : 20;
```

Update `validateMessages` call to respect `maxHistory` — change the hardcoded `.slice(-20)` to accept a parameter:

```typescript
function validateMessages(messages: any, maxHistory = 20): { valid: ChatMessage[]; error?: string } {
  // ... existing validation ...
  const trimmed = messages.slice(-maxHistory).map(...)
  // ...
}
```

And call it with: `validateMessages(messages, isAnonymous ? 5 : 20)`

**Step 3: Deploy and commit**

```bash
supabase functions deploy ai-chat --no-verify-jwt
git add supabase/functions/ai-chat/index.ts
git commit -m "feat: allow anonymous chat with strict rate limits"
```

---

### Task 2: Update useAIChat to support anonymous mode

**Files:**
- Modify: `src/hooks/useAIChat.ts`
- Modify: `src/lib/auth-token.ts`

**Step 1: Add a `fetchAnonymous` helper to auth-token.ts**

Add this function at the bottom of `src/lib/auth-token.ts`:

```typescript
/**
 * Call a Supabase edge function without auth (anonymous access).
 */
export function fetchAnonymous(
  functionPath: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  return fetch(`${supabaseUrl}/functions/v1/${functionPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
```

**Step 2: Update useAIChat to accept `isAuthenticated` and track anonymous count**

Add a parameter and anonymous message tracking:

```typescript
export const useAIChat = (isAuthenticated: boolean): UseAIChatReturn => {
```

Update the `sendMessage` function to:
- Use `fetchWithAuth` when authenticated, `fetchAnonymous` when not
- Track anonymous message count in sessionStorage
- Return a special error when anonymous limit hit

Key changes in sendMessage:

```typescript
// Check anonymous message limit (client-side)
if (!isAuthenticated) {
  const count = parseInt(sessionStorage.getItem("ai_chat_count") || "0", 10);
  if (count >= 5) {
    setError("signup_required");
    return;
  }
}

// ... existing message setup ...

const response = isAuthenticated
  ? await fetchWithAuth("ai-chat", { messages: apiMessages })
  : await fetchAnonymous("ai-chat", { messages: apiMessages });

// ... existing stream handling ...

// After successful response, increment anonymous counter
if (!isAuthenticated) {
  const count = parseInt(sessionStorage.getItem("ai_chat_count") || "0", 10);
  sessionStorage.setItem("ai_chat_count", String(count + 1));
}
```

Also update the return type to include `remainingMessages`:

```typescript
export interface UseAIChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
  remainingMessages: number | null; // null = unlimited (authenticated), number = anonymous remaining
}
```

Add `remainingMessages` computation:

```typescript
const remainingMessages = isAuthenticated
  ? null
  : Math.max(0, 5 - parseInt(sessionStorage.getItem("ai_chat_count") || "0", 10));
```

**Step 3: Commit**

```bash
git add src/hooks/useAIChat.ts src/lib/auth-token.ts
git commit -m "feat: support anonymous chat with session-based message limit"
```

---

### Task 3: Update UI components for anonymous access

**Files:**
- Modify: `src/components/ai-chat/AIChatBubble.tsx`
- Modify: `src/components/ai-chat/AIChatPanel.tsx`

**Step 1: Update AIChatBubble to always render**

Remove the `isSignedIn` gate. Pass auth state to panel:

```tsx
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { AIChatPanel } from "./AIChatPanel";

export const AIChatBubble = () => {
  const { isLoaded, isSignedIn } = useUser();
  const [isOpen, setIsOpen] = useState(false);

  // Wait for Clerk to load, but don't gate on isSignedIn
  if (!isLoaded) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 sm:bottom-6 flex flex-col items-end gap-3">
      {isOpen && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-200">
          <AIChatPanel
            onClose={() => setIsOpen(false)}
            isAuthenticated={isSignedIn || false}
          />
        </div>
      )}

      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-14 h-14 rounded-full bg-gradient-to-r from-food-red to-food-orange text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center"
        aria-label={isOpen ? "Close AI chat" : "Open AI chat"}
      >
        <MessageCircle
          className="absolute transition-transform duration-200"
          style={{ transform: isOpen ? "scale(0)" : "scale(1)" }}
          size={24}
        />
        <span
          className="absolute text-2xl font-light transition-transform duration-200"
          style={{ transform: isOpen ? "scale(1)" : "scale(0)" }}
          aria-hidden="true"
        >
          &times;
        </span>
      </button>
    </div>
  );
};
```

**Step 2: Update AIChatPanel to accept `isAuthenticated` and show signup prompt**

Add prop and pass to hook:

```tsx
interface AIChatPanelProps {
  onClose: () => void;
  isAuthenticated: boolean;
}

export const AIChatPanel = ({ onClose, isAuthenticated }: AIChatPanelProps) => {
  const { messages, isStreaming, error, sendMessage, clearChat, remainingMessages } = useAIChat(isAuthenticated);
```

Add a signup prompt component that shows when `error === "signup_required"` or `remainingMessages === 0`. Render it above the input area:

```tsx
{/* Signup prompt for anonymous users */}
{!isAuthenticated && (error === "signup_required" || remainingMessages === 0) && (
  <div className="border-t border-gray-200 px-4 py-3 bg-gradient-to-r from-food-red/5 to-food-orange/5 text-center shrink-0">
    <p className="text-sm font-medium text-gray-800">
      Sign up to keep chatting
    </p>
    <p className="text-xs text-gray-500 mt-1">
      Free accounts get unlimited messages
    </p>
    <a
      href="/auth"
      className="inline-block mt-2 px-4 py-1.5 text-sm font-medium text-white bg-food-red rounded-lg hover:bg-food-red/90 transition-colors"
    >
      Sign up free
    </a>
  </div>
)}
```

When signup_required, disable the input area (same as streaming disabled state).

Show remaining message count for anonymous users as a subtle hint above the input:

```tsx
{!isAuthenticated && remainingMessages !== null && remainingMessages > 0 && remainingMessages <= 3 && (
  <div className="text-center py-1">
    <span className="text-xs text-gray-400">
      {remainingMessages} free {remainingMessages === 1 ? "message" : "messages"} remaining
    </span>
  </div>
)}
```

**Step 3: Commit, deploy, push**

```bash
git add src/components/ai-chat/AIChatBubble.tsx src/components/ai-chat/AIChatPanel.tsx
git commit -m "feat: show chat for all users with signup prompt at limit"
```

Push and deploy:
```bash
GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519_timanish -o IdentitiesOnly=yes" git push origin main
```

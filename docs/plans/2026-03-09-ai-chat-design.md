# AI Chat Integration Design

**Date:** 2026-03-09
**Status:** Approved

## Overview

Add an AI-powered chat assistant to the Spice&Slice website, available only to logged-in users. Answers menu, product, and store questions. Architected to support future concierge features (order lookup, reorders) without rearchitecting.

## Architecture

```
React (AIChatBubble) → fetchWithAuth("ai-chat") → Supabase Edge Function → Claude API
```

- Reuses existing Clerk JWT auth, rate limiter, and `fetchWithAuth()` helper
- Stateless server, stateful client (conversation history sent with each request)
- Streaming responses via `ReadableStream` / `text/event-stream`
- Model configurable via `ANTHROPIC_MODEL` env var (default: `claude-haiku-4-5-20251001`)

## Edge Function: `ai-chat`

- **Auth:** `verifyClerkJWT()` from `_shared/clerk-auth.ts`
- **Rate limit:** 20 messages/minute per user
- **Request:** `{ messages: Array<{role, content}>, userContext?: object }`
- **Response:** Streamed `text/event-stream`
- **Max tokens:** 1024 per response
- **System prompt:** Store info, capabilities, rules, `{{USER_CONTEXT}}` placeholder for future concierge

### Env vars (Supabase secrets)

```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
```

## Chat UI

### AIChatBubble (`src/components/ai-chat/AIChatBubble.tsx`)

- Fixed bottom-right floating button (`z-40`)
- Only renders when `isSignedIn === true`
- Toggles a chat panel (not a Sheet — avoids cart drawer conflict)
- CSS transition open/close (scale + opacity, 200ms)

### AIChatPanel (`src/components/ai-chat/AIChatPanel.tsx`)

- 400px wide, 500px tall, anchored above bubble
- Header: "Spice&Slice Assistant" + close button
- Scrollable message list, auto-scroll on new messages
- User messages: right-aligned, food-red bg
- Assistant messages: left-aligned, gray-50 bg
- Streaming text with cursor indicator
- Input bar: text input + send button, Enter to send, Shift+Enter newline
- Disabled input while streaming
- Conversation in React state (resets on unmount)

### Placement

- Mounted in `App.tsx` alongside `CartInitializer`, outside routes
- Gated by `isSignedIn` check from Clerk auth context

## System Prompt

Baked into edge function. Covers:
- Store info (address, phone, hours)
- Delivery and catering info
- Capabilities (product Q&A, recommendations, dietary needs)
- Rules (concise responses, no fabrication, warm tone)
- `{{USER_CONTEXT}}` placeholder for future order history injection

## Future: Concierge Mode (Phase C)

To upgrade to concierge:
1. Fetch user's order history in the edge function (user ID already available from JWT)
2. Inject into `{{USER_CONTEXT}}` slot in system prompt
3. Optionally add tool use for real-time order lookup
4. Switch model to Sonnet via env var if needed

No architectural changes required.

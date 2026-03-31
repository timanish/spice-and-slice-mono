# Authentication Setup Guide

**Last Updated:** 2026-03-31
**Status:** ✅ Working (get-user-role, admin-crud, all Clerk-authenticated functions)

---

## Overview

This project uses **Clerk for user authentication** with **Supabase Edge Functions for JWT verification**. The system is fragile and breaks easily when deploying new features. **READ THIS before adding any new edge function or modifying auth**.

---

## How It Works (Critical)

### The Flow
```
1. User logs in with Clerk (browser)
   ↓
2. Clerk issues JWT token (valid for 1 hour)
   ↓
3. React calls edge function with: Authorization: Bearer {token}
   ↓
4. Edge function receives request
   ↓
5. supabase/config.toml tells Supabase: "skip your JWT check" (verify_jwt = false)
   ↓
6. Function extracts token from Authorization header
   ↓
7. _shared/clerk-auth.ts verifies token signature against Clerk's JWKS
   ↓
8. Token is valid → extract user ID → query database with service-role client
```

### Why This Matters

**Supabase has TWO JWT verification systems:**
1. **Built-in Supabase JWT verification** (controlled by `verify_jwt` in config.toml)
2. **Custom Clerk JWT verification** (in `_shared/clerk-auth.ts`)

**If you don't disable #1, it blocks #2** and causes 401 errors.

---

## Critical Configuration File: `supabase/config.toml`

**Location:** `/supabase/config.toml` (checked into git)

**What it does:** Tells Supabase edge functions whether to verify JWT tokens before running

**The section you MUST maintain:**

```toml
[functions]
# All Clerk-authenticated functions MUST have verify_jwt = false
[functions.get-user-role]
verify_jwt = false

[functions.admin-crud]
verify_jwt = false

[functions.create-checkout]
verify_jwt = false

# ... (all other Clerk-authenticated functions)
```

**Current list of functions with `verify_jwt = false`:**
- admin-adjust-order
- admin-crud
- admin-get-orders
- admin-get-subscriptions
- admin-update-order
- ai-chat
- calculate-delivery-distance
- check-pickup-reminders
- complete-lunchbox-subscription
- complete-stripe-order
- confirm-customer-order
- create-cash-order
- create-checkout
- create-lunchbox-checkout
- create-pending-order
- fetch-menu-images
- generate-menu-descriptions
- get-user-role
- printer-create-job
- send-admin-customer-message
- send-lunchbox-subscription-email
- send-order-status-email
- send-pickup-reminder
- send-order-status-email (note: listed twice in config, need to check)
- upload-image
- user-data

**Functions that should NOT have this config (they're public):**
- clerk-webhook (uses Svix signature verification)
- send-contact-email (public form)
- api-rate-limiter (utility)
- fetch-tiktok-videos (public)
- printer-get-jobs (internal)
- printer-ack-job (internal)
- printer-claim-job (internal)
- refresh-tiktok-video (scheduled)

---

## Required Environment Variables (Supabase Secrets)

**Location:** Supabase Dashboard → Settings → Edge Functions → Secrets

**These MUST be set for Clerk JWT verification to work:**

```
CLERK_ISSUER_URL = "https://your-clerk-domain.clerk.accounts.com"
CLERK_JWKS_URL = "https://your-clerk-domain.clerk.accounts.com/.well-known/jwks.json"
CLERK_WEBHOOK_SECRET = "whsec_xxxxx" (for clerk-webhook function only)
SUPABASE_URL = "https://xxxxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "eyJ0eXAi..."
```

**How to get Clerk URLs:**
1. Go to Clerk Dashboard
2. Click Developers → API Keys
3. Copy the "Issuer URL" → set as `CLERK_ISSUER_URL`
4. The JWKS URL is: `{Issuer URL}/.well-known/jwks.json`

**⚠️ CRITICAL:** If these are mismatched or wrong, all JWT verification fails with 401.

---

## Code Pattern: Authorization Header Extraction

**EVERY Clerk-authenticated function MUST use this pattern:**

```typescript
// ✅ CORRECT - Handles both header cases
const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
await authenticateRequest(authHeader, supabaseClient, false);

// ❌ WRONG - Only checks one case, fails if header is lowercase
const authHeader = req.headers.get("Authorization");
await authenticateRequest(authHeader, supabaseClient, false);

// ❌ WRONG - Doesn't check at all
await authenticateRequest(null, supabaseClient, false);
```

**Why?** Supabase's runtime (or proxies) may convert headers to lowercase. Checking both cases ensures compatibility.

---

## Adding a New Clerk-Authenticated Function

### Step 1: Create the Function
```bash
mkdir supabase/functions/my-new-function
cat > supabase/functions/my-new-function/index.ts << 'EOF'
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { authenticateRequest } from "../_shared/clerk-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ✅ REQUIRED: Extract Authorization header with lowercase fallback
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");

    // ✅ REQUIRED: Call authenticateRequest
    // - requireAdmin: false for regular users, true for admin-only functions
    const userId = await authenticateRequest(authHeader, serviceClient, false);

    // Your function logic here
    const body = await req.json();

    return new Response(JSON.stringify({ success: true, userId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
EOF
```

### Step 2: Add to config.toml
```toml
[functions.my-new-function]
verify_jwt = false
```

**Location:** Add after the `[functions]` line in `/supabase/config.toml`

### Step 3: Test Before Deploying
```bash
# Deploy only your new function
supabase functions deploy my-new-function

# Check logs
supabase functions list | grep my-new-function
```

### Step 4: Verify Auth Works
```javascript
// In browser console
const token = await window.Clerk?.session?.getToken();
const response = await fetch(
  'https://YOUR_SUPABASE_URL/functions/v1/my-new-function',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ /* your data */ })
  }
);
console.log(await response.json());
```

**Expected:** `{ success: true, userId: "user_xxxxx" }`
**NOT Expected:** `{ code: 401, message: "Invalid JWT" }`

---

## Debugging: Function Returns 401

### Checklist

- [ ] **Is `verify_jwt = false` in config.toml?**
  ```bash
  grep -A 1 "^\[functions.my-function\]" supabase/config.toml
  ```
  Should show: `verify_jwt = false`

- [ ] **Did you redeploy functions after adding to config.toml?**
  ```bash
  supabase functions deploy my-function
  ```

- [ ] **Does the function extract Authorization header correctly?**
  ```typescript
  // Check your function has:
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  ```

- [ ] **Are Clerk secrets set in Supabase?**
  ```bash
  supabase secrets list
  ```
  Should show: `CLERK_ISSUER_URL` and `CLERK_JWKS_URL`

- [ ] **Do Clerk secrets match your Clerk instance?**
  - Go to Clerk Dashboard → Developers → API Keys
  - Compare Issuer URL with what's in Supabase
  - They must match exactly (dev vs production, etc.)

- [ ] **Check function logs for the error:**
  ```bash
  # View logs in real-time
  supabase functions logs my-function --follow
  ```
  Or go to: Supabase Dashboard → Edge Functions → my-function → Invocations

### Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `Missing authorization header` | Header not reaching function | Add `verify_jwt = false` to config.toml and redeploy |
| `Invalid authorization header format` | Header doesn't start with "Bearer " | Check client is sending: `Authorization: Bearer {token}` |
| `No token provided` | AuthHeader is null/empty | Same as "Missing authorization header" |
| `User not found` | User ID not in profiles table | Shouldn't happen after login; check Clerk webhook is working |
| `Admin access required` | User doesn't have admin role (requireAdmin=true) | Change requireAdmin to false, or make user an admin in Supabase |
| `JWTClaimValidationFailed` | JWT signature invalid or issuer mismatch | Check CLERK_ISSUER_URL matches your Clerk instance |

---

## Deployment Checklist

**Before running `supabase functions deploy`:**

- [ ] All Clerk-authenticated functions have `verify_jwt = false` in config.toml
- [ ] All functions extract Authorization header with both cases:
  ```typescript
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  ```
- [ ] All functions call `authenticateRequest()` before accessing user data
- [ ] CLERK_ISSUER_URL and CLERK_JWKS_URL are set in Supabase secrets
- [ ] You tested at least one function locally (if possible)

**After deploying:**

- [ ] Wait 1-2 minutes for functions to be live
- [ ] Test with real Clerk JWT token (from browser)
- [ ] Check function logs for "JWT verification successful"
- [ ] Verify no 401 errors in browser console

---

## Architecture Files

For complete documentation, see:

- **`AUTHENTICATION_FLOW.md`** - Full JWT flow, function inventory, architecture
- **`FIX_VERIFICATION_CHECKLIST.md`** - Step-by-step verification after deployment
- **`supabase/functions/_shared/clerk-auth.ts`** - JWT verification implementation

---

## Recent Incidents

### March 31, 2026: JWT Regression (FIXED)

**Problem:** All Clerk-authenticated functions returned 401 "Invalid JWT"
**Root Cause:** Missing `verify_jwt = false` declarations in config.toml
**Solution:** Added complete function configuration to config.toml and redeployed
**Lesson:** Always update config.toml when adding new edge functions

---

## Quick Reference

### Is my function Clerk-authenticated?

```bash
# Check if function calls authenticateRequest or verifyClerkToken
grep -l "authenticateRequest\|verifyClerkToken" supabase/functions/*/index.ts
```

**If yes:** Function MUST be in config.toml with `verify_jwt = false`

### List all Clerk functions

```bash
grep -l "authenticateRequest\|verifyClerkToken" supabase/functions/*/index.ts | sed 's|.*/||;s|/.*||' | sort
```

### Redeploy all functions

```bash
supabase functions deploy
```

### Redeploy one function

```bash
supabase functions deploy my-function-name
```

### View function logs

```bash
# Latest logs
supabase functions logs my-function --follow

# Or in dashboard: https://supabase.com/dashboard/project/[PROJECT_ID]/functions
```

---

## Contact

If auth breaks again:
1. Check this file's checklist
2. Check `AUTHENTICATION_FLOW.md` for architecture
3. Run deployment checklist above
4. Check function logs for exact error
5. Verify Clerk secrets in Supabase dashboard

**Do NOT:** Guess and patch individual functions. The system breaks as a whole due to config.toml, not individual function code.

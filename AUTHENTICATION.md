# Authentication Documentation Index

This directory contains documentation about how authentication works in this project. **Start here before deploying anything.**

---

## 🚨 I'm About to Deploy Edge Functions

**Read this first (2 minutes):** [`DEPLOYING_EDGE_FUNCTIONS.md`](./DEPLOYING_EDGE_FUNCTIONS.md)

It's a checklist that prevents 401 errors. Follow it every time you deploy.

---

## 📖 I Want to Understand How Auth Works

**Read this (10 minutes):** [`AUTH_SETUP_GUIDE.md`](./AUTH_SETUP_GUIDE.md)

Complete guide covering:
- How Clerk JWT + Supabase Edge Functions work together
- Why `supabase/config.toml` is critical
- How to add a new Clerk-authenticated function
- Debugging common 401 errors

---

## 🔧 I Need to Fix an Auth Problem

**Read this (15 minutes):** [`AUTHENTICATION_FLOW.md`](./AUTHENTICATION_FLOW.md)

Deep dive into:
- Complete JWT verification flow (client to server)
- All 26 Clerk-authenticated functions
- All 7 public/webhook functions
- Root cause analysis of past regressions
- Systematic debugging approach

---

## Quick Reference

### The Critical File: `supabase/config.toml`

```toml
[functions.your-function]
verify_jwt = false
```

**If you create a new Clerk-authenticated function, you MUST add this line, or it will return 401.**

### The Critical Code Pattern

```typescript
// Every Clerk-authenticated function needs this:
const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
const userId = await authenticateRequest(authHeader, serviceClient, false);
```

### The Critical Check Before Deploying

```bash
# 1. Did I add verify_jwt = false to config.toml?
grep "your-function" supabase/config.toml

# 2. Did I extract the Authorization header correctly?
grep "req.headers.get.*uthorization" supabase/functions/your-function/index.ts

# 3. Did I call authenticateRequest()?
grep "authenticateRequest" supabase/functions/your-function/index.ts
```

---

## The System Architecture (Simplified)

```
Browser (React)
    ↓ Clerk token
    ↓
Edge Function (receives request with Authorization header)
    ↓
supabase/config.toml says: "skip Supabase JWT check" (verify_jwt = false)
    ↓
_shared/clerk-auth.ts: "verify this is a real Clerk token"
    ↓
Token valid → extract user ID → query database
    ↓
Return response
```

**The breakdown point:** If `verify_jwt = false` is missing, Supabase blocks the request before it reaches your code. All functions return 401, even if the code is perfect.

---

## All Functions at a Glance

### Clerk-Authenticated (26 functions)
Need `verify_jwt = false` in config.toml:
- Admin: admin-adjust-order, admin-crud, admin-get-orders, admin-get-subscriptions, admin-update-order
- Orders: create-pending-order, create-cash-order, create-checkout, create-lunchbox-checkout, complete-stripe-order, complete-lunchbox-subscription, confirm-customer-order
- User Data: user-data, get-user-role, upload-image, ai-chat
- Content: generate-menu-descriptions, fetch-menu-images
- Notifications: send-order-status-email, send-pickup-reminder, send-lunchbox-subscription-email, send-admin-customer-message
- Utilities: calculate-delivery-distance, check-pickup-reminders, printer-create-job

### Public/Webhook Functions (7 functions)
Do NOT need Clerk JWT:
- clerk-webhook (uses Svix signatures)
- send-contact-email (public form)
- api-rate-limiter (utility)
- fetch-tiktok-videos (public)
- printer-get-jobs, printer-ack-job, printer-claim-job (internal)
- refresh-tiktok-video (scheduled)

---

## Recent Auth Incidents

### March 31, 2026: JWT Authentication Regression (FIXED)

**Problem:** All Clerk-authenticated functions returned 401 "Invalid JWT"

**Root Cause:** Missing `verify_jwt = false` declarations in `supabase/config.toml`. This caused Supabase's default JWT verification to interfere with custom Clerk JWT handling.

**Solution:**
1. Added complete `[functions.FUNCTION_NAME]` sections with `verify_jwt = false` to config.toml for all 26 Clerk functions
2. Updated 18 functions to check both `Authorization` and `authorization` header cases (case-sensitivity issue with Supabase runtime)

**Lesson:** The config.toml file is the most fragile part of the auth system. Always update it when adding new Clerk-authenticated functions.

---

## Environment Variables (Must Be Set in Supabase)

**Supabase Dashboard → Settings → Edge Functions → Secrets**

```
CLERK_ISSUER_URL = "https://your-clerk-domain.clerk.accounts.com"
CLERK_JWKS_URL = "https://your-clerk-domain.clerk.accounts.com/.well-known/jwks.json"
SUPABASE_URL = "https://xxxxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "eyJ0eXAi..."
```

**These are already set. Don't change them unless you know what you're doing.**

---

## Common Mistakes (Don't Do These)

❌ **Mistake #1:** Add a new Clerk-authenticated function but forget to add `verify_jwt = false` to config.toml
- **Result:** 401 "Invalid JWT"
- **Fix:** Add config, redeploy

❌ **Mistake #2:** Only check for `req.headers.get("Authorization")` without the lowercase fallback
- **Result:** 401 intermittently (depends on how headers are converted)
- **Fix:** Use `req.headers.get("Authorization") || req.headers.get("authorization")`

❌ **Mistake #3:** Deploy without checking function logs
- **Result:** User reports 401, you don't know why
- **Fix:** Always check logs after deployment: `supabase functions logs my-function --follow`

❌ **Mistake #4:** Copy-paste a function but forget to call `authenticateRequest()`
- **Result:** Function works but has no auth, anyone can call it
- **Fix:** Always call `authenticateRequest()` before accessing user data

---

## Testing

### Quick Test in Browser Console

```javascript
// 1. Get Clerk token
const token = await window.Clerk?.session?.getToken();

// 2. Call function
const res = await fetch(
  'https://isexlpmxnhuezhkmbuyu.supabase.co/functions/v1/get-user-role',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
);

// 3. Check response
console.log(res.status, await res.json());
```

**Expected:** Status 200, data with user info
**NOT Expected:** Status 401, `{ code: 401, message: "Invalid JWT" }`

---

## Files You'll Interact With

| File | Purpose | Edit When |
|------|---------|-----------|
| `supabase/config.toml` | ⚠️ **CRITICAL** - tells Supabase to skip JWT | Adding new Clerk function |
| `supabase/functions/_shared/clerk-auth.ts` | JWT verification logic | Rarely; very stable |
| `supabase/functions/YOUR_FUNCTION/index.ts` | Your function code | Writing new function |
| `AUTH_SETUP_GUIDE.md` | Reference documentation | Reading, never edit |
| `DEPLOYING_EDGE_FUNCTIONS.md` | Pre-deployment checklist | Reading before deploy |
| `AUTHENTICATION_FLOW.md` | Architecture & debugging | Reading when debugging |

---

## Getting Help

1. **"I'm deploying a new function"** → Read `DEPLOYING_EDGE_FUNCTIONS.md`
2. **"Function returns 401"** → Read `AUTHENTICATION_FLOW.md` debugging section
3. **"I need the code pattern"** → Read `AUTH_SETUP_GUIDE.md` "Adding a New Function"
4. **"What functions exist?"** → Read `AUTHENTICATION_FLOW.md` function inventory
5. **"The whole auth system broke"** → Check `supabase/config.toml` was deployed with your code

---

## Summary

This project uses **Clerk JWT tokens verified by custom code in Supabase Edge Functions**. The system works when:

✅ `supabase/config.toml` has `verify_jwt = false` for Clerk functions
✅ Functions extract Authorization header with both cases
✅ Functions call `authenticateRequest()`
✅ Clerk secrets are set in Supabase

It breaks when:

❌ You forget to add `verify_jwt = false` to config.toml
❌ You only check one header case
❌ You forget to call `authenticateRequest()`
❌ Clerk secrets are missing/mismatched

**Before you deploy:** Check the 3-item checklist in `DEPLOYING_EDGE_FUNCTIONS.md`.

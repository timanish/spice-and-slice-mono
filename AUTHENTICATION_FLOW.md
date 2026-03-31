# Authentication Flow Architecture

## Overview

The system uses **Clerk JWT authentication** with **Supabase Edge Functions**. The flow: React client → Clerk token → Edge Function → JWT verification → Service-role database access.

---

## 1. Authentication Flow (Client → Server)

### Client-Side: Get JWT Token
```
User logs in with Clerk
→ Clerk session established
→ useAuth().getToken() retrieves Clerk JWT
→ Token is valid for ~1 hour
```

### Network Request: Send Bearer Token
```
fetch(SUPABASE_URL/functions/v1/{function}, {
  headers: {
    Authorization: "Bearer {CLERK_JWT}",
    Content-Type: "application/json"
  }
})
```

**Example from useAdminRole.ts (line 27-33):**
```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/get-user-role`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
```

### Server-Side: Extract & Verify JWT
```
1. Edge Function receives HTTP request
2. Extract Authorization header
3. Parse "Bearer {token}" → extract {token}
4. Use jose library to verify JWT signature against Clerk's JWKS
5. Extract userId from JWT payload
6. Query database with service-role client scoped to userId
7. Return response to client
```

**Implementation in _shared/clerk-auth.ts:**
```typescript
export async function authenticateRequest(
  authHeader: string | null,
  supabase: any,
  requireAdmin = false,
): Promise<string> {
  const token = extractToken(authHeader);           // Line 162: Extract "Bearer ..." → get token
  const userId = await verifyClerkToken(token);     // Line 163: Verify against JWKS
  const userExists = await verifyUserExists(supabase, userId); // Line 165: Check in DB

  if (requireAdmin) {
    const isAdmin = await isUserAdmin(supabase, userId); // Line 171: Check user_roles
    if (!isAdmin) throw new Error("Admin access required");
  }

  return userId;
}
```

---

## 2. Edge Functions by Authentication Type

### A. JWT-Authenticated Functions (26 functions)
**Require Clerk JWT in Authorization header**

#### Admin Functions (5)
- `admin-crud` - Product/category CRUD operations
- `admin-get-orders` - Query orders (logged-in users)
- `admin-get-subscriptions` - Query subscriptions
- `admin-update-order` - Update order status
- `admin-adjust-order` - Adjust order items/amounts

#### Order Functions (6)
- `create-pending-order` - Create order in pending_review status
- `create-cash-order` - Create cash payment order
- `create-checkout` - Create Stripe checkout session
- `create-lunchbox-checkout` - Create lunchbox subscription order
- `complete-stripe-order` - Finalize Stripe payment
- `complete-lunchbox-subscription` - Complete subscription flow

#### User Data Functions (4)
- `user-data` - Get user profile, addresses, orders
- `get-user-role` - Check admin status ⚠️ **FAILING**
- `upload-image` - Upload user profile/product images
- `ai-chat` - AI chat interactions

#### Order Processing Functions (5)
- `confirm-customer-order` - Customer confirms order after admin review
- `send-order-status-email` - Send status email (triggered by admin-update-order)
- `send-pickup-reminder` - Send pickup reminder
- `send-lunchbox-subscription-email` - Send subscription confirmation
- `send-admin-customer-message` - Admin sends message to customer

#### Menu & Content Functions (3)
- `generate-menu-descriptions` - AI-generated product descriptions
- `fetch-menu-images` - Download/cache menu images
- `ai-chat` - Chat interface

#### Utility Functions (3)
- `calculate-delivery-distance` - Distance calc for delivery
- `check-pickup-reminders` - Scheduled reminder checker
- `printer-create-job` - Create kitchen printer job

---

### B. Public/Webhook Functions (7)
**Do NOT require JWT. Use alternative authentication.**

- `clerk-webhook` - Clerk user sync (Svix signature verification)
- `send-contact-email` - Public contact form (no auth)
- `api-rate-limiter` - Rate limiting utility (no auth)
- `fetch-tiktok-videos` - Public video fetch (no auth)
- `printer-get-jobs` - Get jobs for printer (internal only)
- `printer-ack-job` - Acknowledge job (internal only)
- `printer-claim-job` - Claim job (internal only)
- `refresh-tiktok-video` - Refresh video cache (scheduled)

---

## 3. JWT Verification Details

### Clerk JWKS Caching
**File:** `_shared/clerk-auth.ts` (lines 17-33)

```typescript
let cachedJWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS(): ReturnType<typeof createRemoteJWKSet> {
  if (cachedJWKS) return cachedJWKS;  // ⚠️ Returns cached JWKS from previous invocation

  const jwksUrl = Deno.env.get("CLERK_JWKS_URL");
  cachedJWKS = createRemoteJWKSet(new URL(jwksUrl));
  return cachedJWKS;
}
```

**Issue:** Module-level cache persists across warm invocations. If Clerk rotates keys, this cache becomes stale.

### JWT Verification Flow
**File:** `_shared/clerk-auth.ts` (lines 54-84)

```typescript
export async function verifyClerkToken(token: string): Promise<string> {
  const jwks = getJWKS();
  const issuerUrl = Deno.env.get("CLERK_ISSUER_URL");

  const { payload } = await jwtVerify(token, jwks, {
    issuer: issuerUrl
  });

  const userId = payload.sub || payload.user_id || payload.clerk_user_id;
  if (!userId) throw new Error("No user ID in token");

  return userId;
}
```

**Verification Checks:**
1. ✅ JWT signature valid (against Clerk's public keys)
2. ✅ Token not expired (`exp` claim)
3. ✅ Token issued correctly (`iat`, `nbf` claims)
4. ✅ Issuer matches `CLERK_ISSUER_URL`
5. ✅ Has user ID in `sub` claim

---

## 4. Required Environment Variables

### For JWT-authenticated functions:
```
CLERK_ISSUER_URL = "https://your-clerk-domain.clerk.accounts.com"
CLERK_JWKS_URL = "https://your-clerk-domain.clerk.accounts.com/.well-known/jwks.json"
```

### For Supabase access:
```
SUPABASE_URL = "https://xxxxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "eyJ0eXAiOiJKV1QiLCJhbGc..."
```

### For Clerk webhooks:
```
CLERK_WEBHOOK_SECRET = "whsec_xxxxx"
```

---

## 5. The Regression: Why get-user-role Returns 401

### Symptoms
- ✅ User CAN login (Clerk session works)
- ❌ get-user-role returns 401 "Invalid JWT"
- ❌ Authorization header NOT reaching function (per Supabase logs)
- ✅ Admin button missing (can't verify admin role)

### Root Cause Analysis

**Problem:** Authorization header disappears between client request and function execution.

**Evidence:**
- Client sends: `Authorization: Bearer {token}` ✅
- Supabase function invocation logs show: no Authorization header ❌
- This means header is lost at Supabase/Deno runtime level, NOT in application code

**Possible Causes:**
1. **CORS middleware stripping headers** - Supabase may filter headers before forwarding
2. **Header case sensitivity** - Deno/Supabase converts "Authorization" → "authorization" but code checks both cases
3. **Supabase configuration change** - Recent update to edge function runtime
4. **Middleware/proxy issue** - Header filtered by intermediate layer
5. **CORS preflight failure** - OPTIONS request failing (though this would show 409)

**Why it worked before:**
- Previous invocations may have had different CORS headers in request
- Clerk might have sent token differently
- Supabase runtime behavior changed in latest version

---

## 6. Verification Checklist

### Step 1: Check Environment Variables
```bash
# In Supabase Dashboard → Project Settings → Edge Functions → Secrets
✓ CLERK_ISSUER_URL is set
✓ CLERK_JWKS_URL is set
✓ SUPABASE_URL is set
✓ SUPABASE_SERVICE_ROLE_KEY is set
```

### Step 2: Check Network Request
```
Browser Console → Network tab → get-user-role request
Headers sent:
  ✓ Authorization: Bearer eyJ0eXAi...
  ✓ Content-Type: application/json
  ✓ Host: xxxx.supabase.co
```

### Step 3: Check Edge Function Logs
```
Supabase Dashboard → Edge Functions → get-user-role → Logs
Look for request headers in invocation:
  ? Authorization header present?
  ✓ CLERK_ISSUER_URL logged as "SET"?
  ✓ CLERK_JWKS_URL logged as "SET"?
```

### Step 4: Reproduce Issue
```bash
# Manually test with curl
curl -X POST https://xxxxx.supabase.co/functions/v1/get-user-role \
  -H "Authorization: Bearer $(clerk-jwt-token)" \
  -H "Content-Type: application/json"

# Expected: {"role": "admin", "isAdmin": true} or {"role": "user", "isAdmin": false}
# Actual: {"code": 401, "message": "Invalid JWT"}
```

---

## 7. System Dependencies

### Token Flow Chain
```
Clerk Dashboard (user authentication)
    ↓
Clerk SDK (@clerk/clerk-react)
    ↓
Browser localStorage (session storage)
    ↓
useAuth().getToken() (React hook)
    ↓
fetch() + Authorization header
    ↓
Supabase Edge Function
    ↓
jose library (JWT verification)
    ↓
Clerk JWKS endpoint (public key fetch)
    ↓
Supabase PostgreSQL (RLS-protected tables)
```

### Weak Points
1. **Clerk dependency** - Token generation/rotation controlled by Clerk
2. **Network latency** - JWKS fetch could timeout on cold start
3. **Cache staleness** - Module-level JWKS cache might not refresh on key rotation
4. **Header filtering** - Supabase/Deno might filter headers
5. **RLS policies** - Database policies might block service-role queries

---

## 8. How To Fix (Systematic Approach)

### Phase 1: Isolate the Issue
1. Verify all Clerk secrets are set in Supabase
2. Check Supabase function logs for Authorization header presence
3. Test with curl/Postman directly against the function
4. Verify JWT token is valid (decode at jwt.io)

### Phase 2: If Header is Missing at Runtime
- Add explicit CORS header handling in functions
- Ensure all functions use `req.headers.get("Authorization") || req.headers.get("authorization")`
- Add fallback logic to extract token from body if needed

### Phase 3: If Header is Present But JWT Fails
- Log JWT payload before verification
- Check CLERK_ISSUER_URL matches token's `iss` claim
- Verify CLERK_JWKS_URL is reachable and returns valid keys
- Clear module-level JWKS cache (redeploy functions)

### Phase 4: Verify All 26 Functions Work
- Test at least 5 different JWT functions after fix
- Verify admin functions with admin account
- Verify user functions with regular account
- Check logs for no "Invalid JWT" errors

---

## Summary

**Current State:**
- 26 JWT-authenticated functions
- 7 public/webhook functions
- get-user-role failing (401) due to missing Authorization header
- All JWT functions likely affected (systemic issue, not isolated)

**Next Action:**
Verify Clerk environment variables in Supabase and check function logs for header presence.

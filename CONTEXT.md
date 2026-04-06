# Project Context — Spice & Slice

Detailed technical reference for the project. Read the relevant section when working on auth, checkout, or deployments.

---

## Table of Contents

1. [Checkout Workflow](#checkout-workflow)
2. [Authentication Architecture](#authentication-architecture)
3. [Deploying Edge Functions](#deploying-edge-functions)

---

## Checkout Workflow

**Last Updated:** 2026-04-06  
**Current Version:** Phase 11 (Customer Modifications + Calculation Fixes)

### Overview

All orders go through an **admin review process** before payment. Cash and card follow identical flows until the final confirmation step.

### Complete Flow

```
1. Customer submits order (CheckoutPage)
   ↓
2. create-pending-order → order created in "pending_review" status
   ↓
3. Customer sees OrderPendingPage (polls every 5s for status change)
   ↓
4. Admin reviews in AdminOrdersManagementPage
   ├─ Adjusts quantities/prices/substitutes products (admin-adjust-order)
   └─ Clicks "Send for Confirmation" (admin-adjust-order send_for_confirmation)
   ↓
5. Order status → "awaiting_customer_confirmation"
   Token generated (48hr expiry), confirmation email sent to customer
   ↓
6. Customer clicks email link → OrderConfirmPage (token-validated, no login required)
   ↓
7. Customer chooses:

   PATH A — Accept all changes:
   ├─ confirm-customer-order (no action param)
   ├─ CASH: status → confirmed, payment_status → completed, print job created
   └─ CARD: Stripe session created, customer redirected to Stripe payment
            → complete-stripe-order webhook → confirmed + print job

   PATH B — Submit modifications (per-item reject or add items):
   ├─ confirm-customer-order action='submit_modifications'
   ├─ Rejected items reverted to original_quantity/product
   ├─ New items inserted into order_items
   ├─ Totals recalculated (including tax)
   ├─ Status → pending_review, token invalidated
   └─ Admin notified → loop back to step 4
```

### Status State Machine

```
pending_review
    ↓ admin sends for confirmation
awaiting_customer_confirmation
    ↓ customer accepts all          → confirmed
    ↓ customer submits modifications → pending_review  ← loops
confirmed
    ↓ kitchen preparing
preparing
    ↓
out_for_delivery / ready_for_pickup
    ↓
delivered / completed
```

### Key Edge Functions

| Function | Action/Route | Purpose |
|---|---|---|
| `create-pending-order` | POST | Creates order in pending_review |
| `admin-adjust-order` | adjust_items | Admin edits items (recalculates tax) |
| `admin-adjust-order` | send_for_confirmation | Generates token, sends email, status → awaiting |
| `admin-adjust-order` | cancel | Cancels order |
| `confirm-customer-order` | action='get' | Fetches order details (token-auth) |
| `confirm-customer-order` | (no action) | Customer accepts — cash confirm or Stripe session |
| `confirm-customer-order` | action='submit_modifications' | Customer modifies — reverts/adds items, back to pending_review |
| `admin-update-order` | — | Updates fulfillment status (confirmed→preparing→etc.) |
| `complete-stripe-order` | webhook | Handles Stripe payment success |

### Payment Rules

| Payment | Fulfillment | Allowed? |
|---|---|---|
| Cash | Pickup | ✅ |
| Card | Pickup | ✅ |
| Cash | Delivery | ❌ (auto-switched to card) |
| Card | Delivery | ✅ |
| Cash | Nationwide | ❌ (auto-switched to card) |
| Card | Nationwide | ✅ |

### Stripe Integration Notes

**Weighted items** (e.g. 2.5kg at $10/kg):
```typescript
unit_amount = Math.round(item.quantity * item.price_per_unit * 100)  // 2500 cents = $25
quantity = 1
```
Stripe can't handle decimal quantities, so we roll the total into a single unit.

**Non-weighted items** (e.g. 2 items at $5):
```typescript
unit_amount = Math.round(item.price_per_unit * 100)  // 500 cents = $5
quantity = item.quantity                              // 2
```

**Amount validation:** `complete-stripe-order` rejects if `abs(stripe_amount - order.total_amount) > $0.01`.

### Tax Calculation

- Tax is calculated **per order_item**: `tax = quantity × price_per_unit × (product.tax_rate / 100)`
- Stored in `order_items.tax_amount`
- When admin adjusts price_per_unit, `admin-adjust-order` now re-fetches `products.tax_rate` and recalculates per item
- `orders.tax_amount` is the sum of all item tax_amounts

### DB Schema (Order-related columns)

**orders:**
```
fulfillment_status: pending_review | awaiting_customer_confirmation | confirmed | preparing | out_for_delivery | delivered | cancelled
payment_method: card | cash
payment_status: pending | completed
total_amount, taxable_amount, tax_amount, delivery_fee, discount_amount
confirmation_token, confirmation_token_expires_at
customer_notes  ← added Phase 11 (customer's message when submitting modifications)
stripe_session_id, stripe_charge_id
```

**order_items:**
```
quantity, original_quantity       ← original_quantity set when admin first adjusts
price_per_unit, tax_amount
product_id, original_product_id   ← original_product_id set when admin substitutes
original_product_name             ← snapshot of replaced product name
```

### Phase History

| Phase | What Changed |
|---|---|
| 2 | DB schema: pending_review status, confirmation_token columns, original_quantity |
| 5 | complete-stripe-order updated for admin review flow |
| 7 | Checkout cutover: both cash+card call create-pending-order; OrderPendingPage added |
| 8 | OrderConfirmPage with token-based access |
| 9 | Admin review UI in AdminOrdersManagementPage |
| 10 | Customer-facing status badges; OrderHistory action buttons |
| 11 | Customer per-item modifications; tax recalc fix; Stripe weighted item fix; customer_notes column |

---

## Authentication Architecture

### How It Works

```
Browser (React)
    ↓ Clerk JWT (Bearer token)
Edge Function (receives Authorization header)
    ↓
supabase/config.toml: verify_jwt = false  ← CRITICAL: skips Supabase's JWT check
    ↓
_shared/clerk-auth.ts: verifyClerkToken() ← verifies against Clerk's JWKS
    ↓
authenticateRequest() → returns userId
    ↓
Query DB with service-role client scoped to userId
```

**The single most important rule:** Every Clerk-authenticated function needs `verify_jwt = false` in `supabase/config.toml`. Without it, Supabase blocks the request before your code runs — 401 every time, even with valid code.

### The Critical Pattern

```typescript
// In every Clerk-authenticated function:
const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
const userId = await authenticateRequest(authHeader, serviceClient, false);  // false = any user
// OR
const userId = await authenticateRequest(authHeader, serviceClient, true);   // true = admin only
```

```toml
# In supabase/config.toml — required for every Clerk function:
[functions.your-function-name]
verify_jwt = false
```

### Function Inventory

**Clerk-Authenticated (need verify_jwt = false):**
- Admin: `admin-adjust-order`, `admin-crud`, `admin-get-orders`, `admin-get-subscriptions`, `admin-update-order`
- Orders: `create-pending-order`, `create-cash-order`, `create-checkout`, `create-lunchbox-checkout`, `complete-stripe-order`, `complete-lunchbox-subscription`, `confirm-customer-order`
- User: `user-data`, `get-user-role`, `upload-image`, `ai-chat`
- Notifications: `send-order-status-email`, `send-pickup-reminder`, `send-lunchbox-subscription-email`, `send-admin-customer-message`
- Utilities: `calculate-delivery-distance`, `check-pickup-reminders`, `printer-create-job`, `generate-menu-descriptions`, `fetch-menu-images`

**Public/Webhook (NO JWT required):**
- `clerk-webhook` (Svix signature)
- `send-contact-email`, `api-rate-limiter`, `fetch-tiktok-videos`, `refresh-tiktok-video`
- `printer-get-jobs`, `printer-ack-job`, `printer-claim-job`

### Required Secrets (set in Supabase Dashboard → Settings → Edge Functions)

```
CLERK_ISSUER_URL     = "https://your-clerk-domain.clerk.accounts.com"
CLERK_JWKS_URL       = "https://your-clerk-domain.clerk.accounts.com/.well-known/jwks.json"
SUPABASE_URL         = "https://xxxxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "eyJ..."
STRIPE_SECRET_KEY    = "sk_..."
RESEND_API_KEY       = "re_..."
FRONTEND_URL         = "https://www.spiceandslice.shop"
CLERK_WEBHOOK_SECRET = "whsec_..."
```

### Debugging Auth Issues

```bash
# 1. Check config.toml has verify_jwt = false
grep -A1 "^\[functions\.your-function\]" supabase/config.toml

# 2. Check both header cases in function
grep "req.headers.get.*uthorization" supabase/functions/your-function/index.ts

# 3. Check authenticateRequest is called
grep "authenticateRequest" supabase/functions/your-function/index.ts

# 4. Check live logs
supabase functions logs your-function --follow
```

**Symptom → Cause:**
- `401 Invalid JWT` → missing `verify_jwt = false` in config.toml
- `401 intermittently` → only checking `"Authorization"` not `"authorization"` 
- `403 Admin access required` → user is not in user_roles as admin
- `Auth header present: false` in logs → header not reaching function (proxy issue)

### Quick Test in Browser Console

```javascript
const token = await window.Clerk?.session?.getToken();
const res = await fetch('https://isexlpmxnhuezhkmbuyu.supabase.co/functions/v1/get-user-role', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
});
console.log(res.status, await res.json());
// Expected: 200, { role: "admin"/"user", isAdmin: true/false }
// Not expected: 401, { code: 401, message: "Invalid JWT" }
```

### Past Incidents

**2026-03-31: JWT Regression (FIXED)** — All Clerk functions returned 401. Root cause: missing `verify_jwt = false` in config.toml + single-case Authorization header extraction. Fixed by adding all 26 functions to config.toml and updating header extraction to use both cases.

---

## Deploying Edge Functions

### Before Every Deploy — 3-Item Checklist

For any **new** Clerk-authenticated function:

```bash
# 1. Added to config.toml?
grep -A1 "^\[functions\.NEW_FUNCTION\]" supabase/config.toml
# Must show: verify_jwt = false

# 2. Both header cases?
grep "req.headers.get.*uthorization" supabase/functions/NEW_FUNCTION/index.ts
# Must show BOTH "Authorization" and "authorization"

# 3. authenticateRequest called?
grep "authenticateRequest" supabase/functions/NEW_FUNCTION/index.ts
```

For **existing** functions, just deploy.

### Deploy Commands

```bash
# Deploy all functions
npx supabase functions deploy

# Deploy one function
npx supabase functions deploy function-name

# Deploy migration
npx supabase db push

# Check status
npx supabase functions list
```

### Deploy Migrations in Order

Migrations must be applied before deploying functions that depend on new columns/tables. Run:

```bash
npx supabase db push
```

This applies all pending migrations in timestamp order. Always run this before deploying edge functions when you've added a migration.

### After Deploy — Verify

```bash
# Tail logs for a specific function
npx supabase functions logs function-name --follow

# Good log signs:
# "JWT verification successful, userId: user_xxx"
# "Auth header present: true"

# Bad log signs:
# "Auth header present: false" → header case issue
# "CLERK_ISSUER_URL: MISSING" → secrets not set
# "Invalid JWT" → token or JWKS mismatch
```

### Supabase Project Info

- **Project ID:** `isexlpmxnhuezhkmbuyu`
- **Project ref:** `spice-and-slice-bazaar`
- **URL:** `https://isexlpmxnhuezhkmbuyu.supabase.co`
- **Dashboard:** Supabase Dashboard → spice-and-slice-bazaar

### config.toml — New Function Template

When adding a new Clerk-authenticated function, add to `supabase/config.toml`:

```toml
[functions.your-new-function]
verify_jwt = false
```

### Edge Function Template

```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { authenticateRequest } from "../_shared/clerk-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const getServiceRoleClient = () =>
  createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders, status: 204 });

  try {
    const serviceClient = getServiceRoleClient();
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    const userId = await authenticateRequest(authHeader, serviceClient, false); // true = admin only

    const requestData = await req.json();

    // ... your logic here ...

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.message?.includes("Unauthorized") ? 401 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

# Security Audit Report — Spice & Slice Bazaar

**Project:** spice_prod (`isexlpmxnhuezhkmbuyu`)
**Date:** 2026-03-01
**Scope:** Supabase database, edge functions, frontend data access, auth, payments
**Type:** Read-only audit — no changes made

---

## Executive Summary

The application has **6 CRITICAL**, **7 HIGH**, **5 MEDIUM**, and **3 LOW** severity findings. Several P0 issues have been **partially remediated** since the initial audit:

### Remediation Progress (as of 2026-03-02)

| Finding | Status | Action Taken |
|---------|--------|-------------|
| #1 RLS disabled | **REMEDIATED** | RLS re-enabled on all tables (migration `20260301000002`). Two-tier model: public-read for content tables, service-role-only for sensitive tables |
| #2 Privilege escalation | **REMEDIATED** | `user_roles` now service-role-only. All writes go through `admin-crud` edge function |
| #9 Admin writes via anon | **REMEDIATED** | Admin writes now proxied through `admin-crud` edge function with JWT + admin role verification |
| #10 `has_role` callable by anon | **REMEDIATED** | Function dropped entirely (migration `20260301000003`) |
| #3 JWT not verified | NOT MITIGATED | JWT signature still not verified against JWKS |
| #4 Webhook unverified | NOT MITIGATED | Svix verification still commented out |
| #5 Price manipulation | NOT MITIGATED | Cash orders still trust client prices |

The remaining critical issues (#3, #4, #5) should be addressed as highest priority.

---

## Severity Legend

| Level | Meaning |
|-------|---------|
| **CRITICAL** | Actively exploitable, data breach risk, immediate fix required |
| **HIGH** | Significant security flaw, exploitation is straightforward |
| **MEDIUM** | Exploitable under specific conditions or with additional effort |
| **LOW** | Minor weakness or informational best-practice gap |

---

## Finding #1 — RLS Disabled on All 33 Public Tables

**Severity: CRITICAL**
**Status: REMEDIATED** (migration `20260301000002_enable_rls_security.sql`)

### Description

Row Level Security is disabled on every table in the `public` schema. The migrations show RLS was initially enabled on some tables (e.g., `user_roles` in `20251112000001_secure_user_roles.sql`), but subsequent migrations systematically disabled it:

| Migration | Tables Affected |
|-----------|----------------|
| `20251112000006_disable_rls_for_clerk_final.sql` | `profiles` |
| `20251113000001_disable_rls_carts_for_clerk.sql` | `carts`, `cart_items` |
| `20251113091500_fix_orders_table_with_policies.sql` | `orders`, `order_items`, `promo_code_usage`, `user_roles` |
| `20251117000002_disable_rls_home_tables.sql` | `collections`, `festivals`, `festival_products`, `featured_products`, `testimonials`, `recipes`, `recipe_products`, `flash_deals` |
| `20251121000001_disable_rls_promo_codes.sql` | `promo_codes` |
| `20251121000003_disable_rls_products.sql` | `products` |
| `20251121000004_disable_rls_menu_items.sql` | `menu_items` |
| `20251121000005_disable_rls_hero_slides.sql` | `hero_slides` |

The stated justification is that Clerk uses text-based user IDs incompatible with `auth.uid()`. While true, this is not a valid reason to disable RLS entirely.

### Impact

Anyone with the public anon API key (embedded in the frontend JS bundle) can:
- **READ** all user PII: emails, phone numbers, full names, home addresses with GPS coordinates
- **READ** all orders, carts, promo codes, admin roles
- **WRITE/DELETE** any record in any table

### Verified Exposure

| Table | Records Exposed | Sensitivity |
|-------|----------------|-------------|
| `profiles` | 22 users | Email, phone, name (PII) |
| `user_addresses` | 29 records | Full home addresses + GPS coords |
| `user_roles` | 21 records | Admin privilege assignments |
| `orders` | 3 records | Order details, amounts, addresses |
| `promo_codes` | All codes | Business-sensitive discount codes |
| `carts` / `cart_items` | All carts | Other users' shopping carts |
| `print_jobs` | All records | Internal operational data |

### Action Items

- [ ] **P0**: Re-enable RLS on all sensitive tables (`user_roles`, `profiles`, `orders`, `order_items`, `user_addresses`, `carts`, `cart_items`, `promo_codes`, `lunch_box_subscriptions`)
- [ ] **P0**: Create Clerk-compatible RLS policies. Since `auth.uid()` returns NULL with Clerk, use one of:
  - Custom JWT claim via Supabase `set_config` in a Postgres function
  - Pass Clerk user ID via a custom header and use `current_setting('request.jwt.claims')`
  - Use edge functions as the exclusive data access layer (proxy pattern)
- [ ] **P1**: For public/read-only content tables (`products`, `categories`, `collections`, `hero_slides`, `testimonials`, etc.), enable RLS with `SELECT` policies for `anon` role but restrict `INSERT/UPDATE/DELETE` to authenticated admin users only

---

## Finding #2 — Privilege Escalation via `user_roles` Table

**Severity: CRITICAL**
**Status: REMEDIATED** (RLS re-enabled, service-role-only access)

### Description

With RLS disabled on `user_roles`, any anonymous user can insert an admin role for any user:

```sql
-- This works with just the public anon key:
INSERT INTO user_roles (user_id, role) VALUES ('any_user_id', 'admin');
```

This was **confirmed by the audit** — a test INSERT returned HTTP 201. The test record was immediately cleaned up.

### Impact

Complete admin takeover. An attacker can:
1. Grant themselves admin role
2. Access all admin dashboard features
3. Modify products, prices, orders, delivery settings
4. View all customer data

### Action Items

- [ ] **P0**: Enable RLS on `user_roles` with policy: `USING (false)` for all roles (no direct client access)
- [ ] **P0**: All role management must go through the `clerk-webhook` edge function (which also needs fixing — see Finding #4)

---

## Finding #3 — JWT Signature Not Verified in Edge Functions

**Severity: CRITICAL**
**Status: NOT MITIGATED**

### Description

**File:** `supabase/functions/_shared/clerk-auth.ts` (lines 53-85)

The `verifyClerkToken()` function only base64-decodes the JWT and checks expiration. It does **NOT verify the cryptographic signature** against Clerk's JWKS public keys:

```typescript
export async function verifyClerkToken(token: string): Promise<string> {
  const payload = decodeJWT(token);  // Just base64 decode, NO signature check
  if (payload.exp && Date.now() >= payload.exp * 1000) {
    throw new Error("Token expired");
  }
  const userId = payload.user_id || payload.sub || payload.clerk_user_id;
  return userId;
}
```

The JWKS endpoint IS configured in `.env` (`VITE_CLERK_JWKS_ENDPOINT`) but is never used.

### Impact

Any attacker can forge a JWT with any `user_id`/`sub` claim and it will be accepted as valid by ALL edge functions that use `authenticateRequest()`:
- `admin-get-orders`
- `admin-get-subscriptions`
- `admin-update-order`
- `create-cash-order`
- `create-checkout`

### Action Items

- [ ] **P0**: Implement proper JWKS-based JWT verification using Clerk's public keys
- [ ] **P0**: Use the `jose` or `@clerk/backend` library to verify token signatures
- [ ] **P0**: Cache the JWKS response (with TTL) to avoid repeated fetches
- [ ] Verify `iss`, `aud`, and `exp` claims in addition to signature

---

## Finding #4 — Clerk Webhook Signature Verification Disabled

**Severity: CRITICAL**
**Status: NOT MITIGATED**

### Description

**File:** `supabase/functions/clerk-webhook/index.ts` (lines 60-63)

```typescript
// Skip webhook signature verification for now
// const webhookSecret = Deno.env.get("CLERK_WEBHOOK_SECRET");
const payload: WebhookEvent = await req.json();
```

The Svix webhook signature verification is commented out. The function URL is predictable (`https://isexlpmxnhuezhkmbuyu.supabase.co/functions/v1/clerk-webhook`).

### Impact

An attacker can send crafted webhook payloads to:
- Create arbitrary user profiles with admin roles
- Delete any user's profile, cart, and role data
- Modify any user's information
- Trigger the `user.created`, `user.updated`, `user.deleted` flows

### Action Items

- [ ] **P0**: Uncomment and implement Svix webhook signature verification
- [ ] **P0**: Set the `CLERK_WEBHOOK_SECRET` environment variable in Supabase dashboard
- [ ] Reject all requests that fail signature verification with HTTP 401

---

## Finding #5 — Cash Order Prices Trusted from Client

**Severity: CRITICAL**
**Status: NOT MITIGATED**

### Description

**File:** `supabase/functions/create-cash-order/index.ts` (lines 166-174, 387-415)

The cash order flow calculates totals from client-provided `cartItems`:

```typescript
const subtotal = cartItems.reduce((sum, item) => {
  if (item.product.is_weighted && item.weight) {
    return sum + item.weight * item.product.price_per_unit;  // Client-provided price
  }
  return sum + item.quantity * item.product.price_per_unit;  // Client-provided price
}, 0);
```

The `item.product.price_per_unit` comes from the request body. The server does NOT look up actual prices from the database.

Additionally, if the client sends a `promoDiscount` value, the server uses it without revalidation:

```typescript
let finalPromoDiscount = promoDiscount || 0;
if (promoCode && !promoDiscount) {
  // Only validates if promoDiscount is NOT already set
}
```

### Impact

An attacker can:
- Set any product price to $0.01
- Apply arbitrary promo discounts
- Place orders at manipulated totals

### Action Items

- [ ] **P0**: Look up product prices from the database in `create-cash-order` — never trust client-sent prices
- [ ] **P0**: Always revalidate promo code discount server-side regardless of client-sent value
- [ ] **P1**: Apply the same fix to `create-checkout` (Stripe line items also use client prices at lines 227-254)

---

## Finding #6 — Service Role Client Exists in Frontend Code

**Severity: CRITICAL (latent)**
**Status: PARTIALLY MITIGATED — key not currently set, but code exists**

### Description

**File:** `src/integrations/supabase/admin-client.ts` (lines 7-22)

```typescript
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY || "",
  ...
);
```

The `VITE_` prefix means this variable would be bundled into client-side JavaScript. Currently `.env` does not contain `VITE_SUPABASE_SERVICE_ROLE_KEY`, so the client initializes with an empty string. However, the code exists and if anyone adds the key, it would be publicly exposed.

Additionally, the hardcoded URL on line 7 (`https://vpaklzfcgzznutyqdtxe.supabase.co`) points to a **different Supabase project**.

### Action Items

- [ ] **P0**: Delete `src/integrations/supabase/admin-client.ts` entirely
- [ ] **P0**: Remove all imports/references to `supabaseAdmin` from frontend code
- [ ] **P0**: Never use a `VITE_`-prefixed env var for service role keys
- [ ] **P1**: Fix the stale project URL reference (also in `src/pages/ContactPage.tsx` line 73)

---

## Finding #7 — `get-user-role` Edge Function Has No Authentication

**Severity: HIGH**
**Status: NOT MITIGATED**

### Description

**File:** `supabase/functions/get-user-role/index.ts` (lines 20-46)

This function accepts a `userId` from the request body with zero authentication:

```typescript
const { userId } = await req.json();
const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).single();
```

### Impact

Anyone can query any user's admin status by sending arbitrary user IDs. Combined with Finding #3, this enables targeted attacks against known admin users.

### Action Items

- [ ] **P1**: Add JWT-based authentication (after fixing Finding #3)
- [ ] **P1**: Consider removing this function entirely — role checking can happen via the fixed RLS policies or the `has_role` RPC (with proper access controls)

---

## Finding #8 — `calculate-delivery-distance` Has No Authentication

**Severity: HIGH**
**Status: NOT MITIGATED**

### Description

**File:** `supabase/functions/calculate-delivery-distance/index.ts`

This function accepts `userId` and `addressId` from the request body without authentication and modifies user addresses with coordinates and distance calculations.

### Impact

- Modify any user's address coordinates
- Manipulate `distance_from_store` to bypass delivery zone restrictions
- Exhaust Mapbox API quota (rate limiting is in-memory only, see Finding #13)

### Action Items

- [ ] **P1**: Add JWT-based authentication
- [ ] **P1**: Verify the authenticated user owns the address being modified

---

## Finding #9 — Admin Write Operations Use Anon Client

**Severity: HIGH**
**Status: REMEDIATED** (admin writes now go through `admin-crud` edge function with JWT + admin role check)

### Description

All admin pages use the regular `supabase` client (anon key) for write operations:

| File | Operations |
|------|-----------|
| `src/pages/AdminCollectionsPage.tsx` (lines 78, 117) | INSERT/UPDATE collections |
| `src/pages/AdminFlashDealsPage.tsx` (lines 112, 147) | INSERT/UPDATE flash deals |
| `src/pages/AdminTestimonialsPage.tsx` (lines 95, 136) | INSERT/UPDATE testimonials |
| `src/hooks/admin/useProductManagement.ts` (line 132) | INSERT/UPDATE/DELETE products |
| `src/pages/AdminDashboardPage.tsx` (lines 23-83) | READ all orders, products |

Since RLS is disabled, the client-side `AdminGuard` component is the only protection — and it's trivially bypassed.

### Impact

Any user can perform all admin operations directly from the browser console using the anon Supabase client.

### Action Items

- [ ] **P1**: Move all admin write operations to authenticated edge functions that verify admin role server-side
- [ ] **P1**: Once RLS is re-enabled, restrict write access to admin-verified roles
- [ ] Keep the client-side `AdminGuard` as a UX convenience, not a security measure

---

## Finding #10 — `has_role` RPC Callable by Anonymous Users

**Severity: HIGH**
**Status: REMEDIATED** (function dropped entirely via migration `20260301000003_drop_dangerous_rpcs.sql`)

### Description

**File:** `supabase/migrations/20251117000001_add_has_role_function.sql` (lines 24-25)

```sql
GRANT EXECUTE ON FUNCTION has_role(TEXT, TEXT) TO anon;
```

The function uses `SECURITY DEFINER`, meaning it runs with elevated privileges. Any anonymous user can call `has_role('user_id', 'admin')` to enumerate admin users.

### Action Items

- [ ] **P1**: Revoke `anon` access: `REVOKE EXECUTE ON FUNCTION has_role FROM anon;`
- [ ] Only grant to `authenticated` role (or remove the function and check roles via edge functions)

---

## Finding #11 — Stripe Checkout Prices from Client

**Severity: HIGH**
**Status: NOT MITIGATED**

### Description

**File:** `supabase/functions/create-checkout/index.ts` (lines 227-254)

The Stripe checkout session is created with line items whose prices come from the client request. While `complete-stripe-order` later uses `session.amount_total` from Stripe as the authoritative amount, a malicious client could create a Stripe session with $0.01 prices and complete checkout at that manipulated price.

### Action Items

- [ ] **P1**: Look up product prices from the database in `create-checkout` before creating Stripe line items
- [ ] Consider using Stripe Price objects (pre-created in Stripe dashboard) instead of ad-hoc amounts

---

## Finding #12 — No Stripe Webhook for Payment Verification

**Severity: MEDIUM**
**Status: NOT MITIGATED**

### Description

There is no Stripe webhook handler in the codebase. `complete-stripe-order` is called by the frontend after redirect. While it does check `session.payment_status === 'paid'`, the more secure pattern is server-to-server webhook notification.

### Action Items

- [ ] **P2**: Implement a Stripe webhook handler (`stripe.webhooks.constructEvent`)
- [ ] Use the webhook to create orders instead of relying on client-initiated completion
- [ ] This prevents edge cases where the browser closes before `complete-stripe-order` is called

---

## Finding #13 — CORS Set to `*` on All Edge Functions

**Severity: MEDIUM**
**Status: NOT MITIGATED**

### Description

Every edge function uses:
```typescript
const corsHeaders = { "Access-Control-Allow-Origin": "*" };
```

### Impact

Any website can make requests to these edge functions, enabling cross-origin attacks.

### Action Items

- [ ] **P2**: Restrict CORS to `https://www.spiceandslice.shop` and `http://localhost:5173` (dev)
- [ ] Set this in a shared `corsHeaders` constant

---

## Finding #14 — No CSP or Security Headers

**Severity: MEDIUM**
**Status: NOT MITIGATED**

### Description

No Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, or Strict-Transport-Security headers are configured.

**File:** `index.html` (line 27) also loads a third-party script without SRI:
```html
<script src="https://cdn.gpteng.co/gptengineer.js" type="module"></script>
```

### Action Items

- [ ] **P2**: Add security headers via `vercel.json`, `_headers`, or a meta tag
- [ ] **P2**: Remove the GPTEngineer script if not needed in production
- [ ] **P3**: Add Subresource Integrity (SRI) to any remaining third-party scripts

---

## Finding #15 — HTML Injection in Email Templates

**Severity: MEDIUM**
**Status: NOT MITIGATED**

### Description

**Files:**
- `supabase/functions/send-contact-email/index.ts` (lines 79, 107)
- `supabase/functions/create-cash-order/index.ts` (lines 625-633)

User-provided values are interpolated directly into HTML email templates:
```typescript
<td style="padding: 8px;">${name}</td>
<p>${message.replace(/\n/g, "<br/>")}</p>
```

### Impact

Attacker can inject HTML into admin notification emails for phishing or credential theft.

### Action Items

- [ ] **P2**: Sanitize all user inputs in email templates (escape `<`, `>`, `&`, `"`, `'`)
- [ ] Use a template library with auto-escaping

---

## Finding #16 — Rate Limiting is In-Memory Only

**Severity: MEDIUM**
**Status: PARTIALLY MITIGATED — rate limiting exists but is ineffective**

### Description

**File:** `supabase/functions/_shared/rate-limiter.ts`

Rate limiting uses in-memory `Map` objects. Supabase edge functions are ephemeral — state is lost on cold starts and not shared across instances.

### Action Items

- [ ] **P3**: Move rate limiting to a persistent store (Redis, Supabase table, or Upstash)
- [ ] For now, this provides minimal protection against casual abuse

---

## Finding #17 — Admin Status Cached in localStorage

**Severity: LOW**
**Status: ACCEPTABLE with server-side fixes**

### Description

**File:** `src/hooks/use-user-clerk.tsx` (lines 59-68)

Admin status is cached in `localStorage` for 5 minutes. While a user could manipulate this to access admin UI views, server-side authorization would prevent actual data modification (once Findings #1-3 are fixed).

### Action Items

- [ ] **P3**: No action needed if server-side authorization is properly implemented
- [ ] Consider using `sessionStorage` instead for shorter cache lifetime

---

## Finding #18 — Hardcoded URLs Point to Wrong Supabase Project

**Severity: LOW**
**Status: NOT MITIGATED**

### Description

**Files:**
- `src/integrations/supabase/admin-client.ts` (line 7): `https://vpaklzfcgzznutyqdtxe.supabase.co`
- `src/pages/ContactPage.tsx` (line 73): same stale URL

These reference a different Supabase project than the current one (`isexlpmxnhuezhkmbuyu`).

### Action Items

- [ ] **P2**: Fix or remove stale project references
- [ ] Use `import.meta.env.VITE_SUPABASE_URL` consistently

---

## Finding #19 — Unused Database Indexes

**Severity: LOW (Performance, not security)**
**Status: NOT MITIGATED**

### Description

42 database indexes have 0% usage (zero scans). These consume storage and slow down writes without providing query benefit.

### Action Items

- [ ] **P3**: Audit and drop unused indexes to improve write performance
- [ ] Key unused indexes: `idx_products_priority`, `idx_products_inventory_count`, `idx_products_upc_code`, `idx_products_sub_category`, and many more

---

## Remediation Priority Matrix

### P0 — Fix Immediately (Data Breach Risk)

| # | Finding | Status | Action |
|---|---------|--------|--------|
| 1 | RLS disabled | **DONE** | RLS re-enabled with two-tier model |
| 2 | Privilege escalation | **DONE** | `user_roles` is service-role-only |
| 3 | JWT not verified | OPEN | Implement JWKS-based signature verification in `clerk-auth.ts` |
| 4 | Webhook unverified | OPEN | Enable Svix signature verification in `clerk-webhook` |
| 5 | Price manipulation | OPEN | Server-side price lookup in `create-cash-order` and `create-checkout` |
| 6 | Service role in frontend | OPEN | Delete `admin-client.ts` and all references |

### P1 — Fix This Sprint (Significant Risk)

| # | Finding | Status | Action |
|---|---------|--------|--------|
| 7 | `get-user-role` no auth | OPEN | Add JWT auth or remove function |
| 8 | `calculate-delivery-distance` no auth | OPEN | Add JWT auth + ownership check |
| 9 | Admin writes via anon client | **DONE** | Now uses `admin-crud` edge function |
| 10 | `has_role` callable by anon | **DONE** | Function dropped entirely |
| 11 | Stripe prices from client | OPEN | Server-side price lookup |

### P2 — Fix This Month (Moderate Risk)

| # | Finding | Action |
|---|---------|--------|
| 12 | No Stripe webhook | Implement webhook handler |
| 13 | CORS `*` | Restrict to actual domains |
| 14 | No security headers | Add CSP, HSTS, X-Frame-Options |
| 15 | HTML injection in emails | Sanitize template inputs |
| 18 | Stale project URLs | Fix or remove |

### P3 — Fix When Convenient (Low Risk)

| # | Finding | Action |
|---|---------|--------|
| 16 | In-memory rate limiting | Move to persistent store |
| 17 | localStorage admin cache | Acceptable with server fixes |
| 19 | Unused indexes | Drop for performance |

---

## Architecture Recommendation

The root cause of most findings is the Clerk + Supabase integration pattern. The recommended architecture is:

```
Browser → Clerk Auth → Edge Functions (verify JWT signature) → Supabase (service role)
                                                                    ↑
                                                              RLS as defense-in-depth
```

1. **All data mutations** should go through edge functions, not direct Supabase client calls
2. **Edge functions** verify Clerk JWT signatures and check admin roles before performing operations
3. **RLS** serves as defense-in-depth — even if an edge function has a bug, RLS prevents unauthorized access
4. **The frontend** should only use the anon key for read-only queries on public content (products, categories, testimonials)
5. **Sensitive reads** (orders, profiles, admin data) should also go through authenticated edge functions

---

*This audit is point-in-time and based on code review + API testing. A full penetration test is recommended before addressing these findings in production.*

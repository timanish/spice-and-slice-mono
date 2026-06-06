# Local End-to-End Testing

A fully isolated local sandbox for testing website changes against **all** integrations
without touching production, real payments, or real customer emails.

| Integration | In the test sandbox |
|---|---|
| Supabase | **Local stack** (Docker) — DB + edge functions + storage on `127.0.0.1` |
| Clerk | **Development** instance (`saved-pika-11.clerk.accounts.dev`) + `+clerk_test` users |
| Stripe | **Test mode** (`sk_test_…`, card `4242 4242 4242 4242`) |
| Resend | Test/empty key — no real customer emails |
| Mapbox / PostHog / Sentry | Off (or test token) |

The local DB is built from a **schema baseline dumped from prod**
(`supabase/migrations/00000000000000_baseline.sql`) because the original 101 migrations
can't replay from scratch (mixed Lovable auth-era + Clerk rebaseline, out-of-order
timestamps). The legacy files are preserved in `supabase/migrations_archive/`.

---

## 1. One-time setup

**Prereqs:** Docker Desktop running, Node, Supabase CLI (`npx supabase`), and the
Clerk CLI (`clerk`, already logged in & linked).

```bash
# 1. Frontend test env — already created. Optional: add a Mapbox token.
#    .env.test  (Clerk dev pk_test_ is already filled in)

# 2. Edge-function test secrets — add your Stripe TEST secret key:
#    supabase/functions/.env.test  →  STRIPE_SECRET_KEY=sk_test_xxx
#    (RESEND_API_KEY optional; blank = emails fail softly)

# 3. Install Playwright browser (one-time)
npx playwright install chromium
```

> Both `.env.test` files are gitignored. Templates are committed as `*.env.test.example`.

## 2. Start the sandbox

```bash
npm run sandbox          # stack + edge functions + Vite (test mode)
npm run sandbox:reset    # same, but wipes + re-seeds the DB first
```

This brings up:

| URL | What |
|---|---|
| http://localhost:5173 | The app (Vite, `--mode test` → reads `.env.test`) |
| http://127.0.0.1:54323 | Supabase Studio (inspect/edit local DB) |
| http://127.0.0.1:54321 | Supabase API + edge functions |

`Ctrl-C` stops functions + Vite. The Supabase stack keeps running
(`npx supabase stop` to shut it down).

> **Why no `stripe listen`?** Checkout completion is frontend-driven — after Stripe
> redirects back to `/order-success?session_id=…`, the page calls
> `complete-stripe-order`, which verifies the session via the Stripe API. No webhook
> forwarding needed; just the `sk_test_` key.

## 3. Manual UX testing

The storefront, product pages, and TV menu work **unauthenticated** out of the box
(seeded catalog: 3 categories, 4 products, 4 menu items, a published TV board at
`/tv-menu/main`).

To test **signed-in** flows (cart, checkout, profile, admin), your Clerk account needs
a local `profiles` row — the `clerk-webhook` that creates these in prod can't reach
localhost. After signing into http://localhost:5173 with a Clerk dev account, run:

```bash
bash scripts/sync-clerk-profile.sh you@example.com           # customer
bash scripts/sync-clerk-profile.sh you@example.com --admin   # + admin access
```

Then carts, orders, and (with `--admin`) the `/admin/*` panel will work for you.
Card checkout uses Stripe test card **4242 4242 4242 4242**, any future expiry, any CVC.

## 4. Automated E2E (Playwright)

```bash
npm run test:e2e          # headless
npm run test:e2e:ui       # interactive UI mode
npm run test:e2e:headed   # watch the browser
```

Specs live in `tests/e2e/`:

| Spec | Covers | Auth |
|---|---|---|
| `storefront.spec.ts` | home loads, products render | no (guest) |
| `tv-menu.spec.ts` | published TV board renders seeded items | no (guest) |
| `auth-cart.spec.ts` | sign in → add to cart (Clerk JWT → edge fn → DB) | customer |
| `admin.spec.ts` | admin reaches `/admin`; customer is blocked | admin + customer |
| `checkout.spec.ts` | full order lifecycle: place → admin confirm → customer confirm | customer + admin |

The **checkout** spec drives the real order state machine via the same edge
functions the UI posts to — `create-pending-order` (→ `pending_review`) →
`admin-adjust-order` `send_for_confirmation` (→ `awaiting_customer_confirmation`
+ token) → `confirm-customer-order` (→ `confirmed`, cash paid) — minting real
Clerk JWTs from the browser session and asserting each DB transition. It uses
**cash + pickup** (the only all-cash path), so it needs no Stripe.

**How auth works:** `tests/e2e/global.setup.ts` calls `clerkSetup()`, creates two
`+clerk_test` users via the Clerk Backend API (`spice.customer+clerk_test@…`,
`spice.admin+clerk_test@…`), and mirrors them into local `profiles`/`user_roles`.
Specs sign in with `clerk.signIn({ strategy: 'email_code' })` — the fixed test code
`424242` is handled automatically. Carts are cleared each run for determinism.

Playwright reuses a running `npm run sandbox`; if none is running it starts Vite
itself (but the **Supabase stack must be up**, and edge functions must be served for
the auth/cart spec — easiest is to run `npm run sandbox` first).

## 5. Resetting / inspecting data

```bash
npm run db:reset                         # rebuild local DB from baseline + seed.sql
# Edit seed data:  supabase/seed.sql
# Inspect data:    http://127.0.0.1:54323  (Studio)
```

---

## ⚠️ Deploy-workflow note (important)

Because the local `migrations/` folder now holds a single squashed baseline (and the
101 originals are in `migrations_archive/`), the local migration history **no longer
matches** what's recorded on prod. **Do not run `npx supabase db push` expecting the
old behaviour** — its history check will disagree with the baseline.

Prod itself is untouched and fully intact. When you next need to ship a schema change,
choose one of:

- **Keep deploying as before** (Supabase dashboard / your existing path), or
- **Reconcile once**: re-point `migrations/` at the archived files (or run
  `supabase migration repair` to record the baseline on remote) so `db push` works
  against the new baseline. Decide this deliberately — it's the one piece this setup
  intentionally left for you.

## Troubleshooting

| Symptom | Fix |
|---|---|
| App: "Missing Clerk Publishable Key" | `VITE_CLERK_PUBLISHABLE_KEY` missing in `.env.test` |
| Edge fn 401 on every call | function not served / `verify_jwt` — check `npm run functions:serve` logs |
| Card checkout fails | `STRIPE_SECRET_KEY` in `supabase/functions/.env.test` isn't a `sk_test_` key |
| Cart/checkout "profile not found" | run `scripts/sync-clerk-profile.sh <email>` after first sign-in |
| Order/email fn returns 500 "Missing API key" | `RESEND_API_KEY` is blank — set any non-empty value (some fns build `new Resend(KEY)` at module load) |
| `supabase start` fails on migrations | ensure only the baseline is in `migrations/` (legacy in `migrations_archive/`) |
| E2E auth spec: user not found | global setup needs `CLERK_SECRET_KEY` in `supabase/functions/.env.test` |

# Architecture

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| UI Framework | React 18.3 + TypeScript 5.5 | Component rendering |
| Build Tool | Vite 5.4 (SWC plugin) | Dev server + bundling |
| Styling | Tailwind CSS 3.4 + shadcn/ui | Utility-first CSS + component library |
| Component Variants | class-variance-authority (CVA) | Typed component variants |
| Class Merging | clsx + tailwind-merge (via `cn()`) | Safe Tailwind class composition |
| Animations | Framer Motion 11 + tailwindcss-animate | Page transitions + micro-interactions |
| Carousel | Embla Carousel | Hero, testimonials, TikTok sections |
| Forms | react-hook-form + zod | Form state + schema validation |
| Routing | react-router-dom 6 | Client-side routing |
| Server State | @tanstack/react-query 5 | Data fetching + caching |
| Client State | Zustand 5 | Cart store |
| Auth Context | React Context | Clerk auth wrapper |
| Auth Provider | @clerk/clerk-react 5 | Authentication + user management |
| Backend | Supabase (supabase-js 2.49) | PostgreSQL + Edge Functions + Storage |
| Payments | Stripe (via edge functions) | Card payment processing |
| Maps | mapbox-gl + @mapbox/search-js-web | Address autocomplete + delivery distance |
| Analytics | posthog-js | Event tracking + user identification |
| Charts | Recharts | Admin dashboard data visualization |
| Dates | date-fns + date-fns-tz | Date formatting (America/Chicago TZ) |
| Toasts | Sonner | Notification system |
| Icons | Lucide React | Icon library |
| Theming | next-themes | Dark mode support (class-based) |

## Project Structure

```
grubhub-wizard-catering-app/
├── src/
│   ├── main.tsx                    # React entry: ClerkProvider + QueryClient + Router
│   ├── App.tsx                     # Route definitions + AuthProvider
│   ├── index.css                   # Global styles, CSS vars, font imports
│   │
│   ├── components/
│   │   ├── ui/                     # 50 shadcn/ui primitives
│   │   ├── hero/                   # Hero carousel (auto-rotate, Framer Motion)
│   │   ├── home/                   # Homepage sections (featured, collections, TikTok, etc.)
│   │   ├── products/              # Product listing, search, forms
│   │   ├── product/               # ProductCard, WeightSelector, QuantitySelector
│   │   ├── product-filters/       # Filter sidebar (categories, brands, price range)
│   │   ├── shopping-cart/         # Cart drawer, CartItem, CartSummary, PromoCodeInput
│   │   ├── checkout/              # FulfillmentTypeSelector, DeliveryModal, PickupInfo
│   │   ├── catering/              # Multi-step catering wizard
│   │   ├── lunchbox/              # Subscription dashboard, delivery calendar
│   │   ├── admin/                 # AdminLayout, AdminSidebar, MenuItems CRUD
│   │   ├── auth/                  # ResetPassword, EmailConfirmation
│   │   ├── profile/               # ProfileTabs, AddressManagement, OrderHistory
│   │   ├── navigation/            # NavItems, CartButton, MobileMenu, UserMenu
│   │   ├── onboarding/            # OnboardingForm
│   │   ├── analytics/             # PageViewTracker, PostHogUserTracker
│   │   └── icons/                 # TikTokIcon
│   │
│   ├── pages/                     # Route page components (see ROUTING.md)
│   ├── hooks/                     # Custom hooks (see STATE-MANAGEMENT.md)
│   │   ├── products/              # Product fetching, filtering, pagination, metadata
│   │   └── admin/                 # Admin CRUD hooks
│   ├── stores/cart/               # Zustand cart store + operations
│   ├── contexts/                  # ClerkAuthContext
│   ├── types/                     # analytics.ts, promoCode.ts, global.d.ts
│   ├── utils/                     # cartValidation, pickupUtils, locationUtils, profileUtils
│   ├── lib/                       # cn() utility, product validation schema
│   └── integrations/supabase/     # Supabase client + generated types
│
├── supabase/
│   ├── functions/                 # 22 Deno edge functions
│   ├── migrations/                # 73 SQL migrations
│   └── config.toml                # Project config (spice-and-slice-bazaar)
│
├── public/                        # Static assets, favicon, robots.txt
├── .github/workflows/             # TikTok URL refresh (every 90 min)
└── [config files]                 # vite, tailwind, tsconfig, eslint, etc.
```

## Design System

### Colors
| Token | Hex | Usage |
|-------|-----|-------|
| food-red | #8B0000 | Primary CTAs, active nav, branding |
| food-brown | #8B4513 | Warm accents |
| food-green | #228B22 | Success states |
| food-gold | #FFD700 | Badges, premium indicators |
| food-cream | #FFFDD0 | Soft backgrounds |
| food-orange | #FF8C00 | Secondary CTAs |

### Typography
| Font | Family | Usage |
|------|--------|-------|
| Inter | sans-serif | Body text, UI elements (400-700) |
| Playfair Display | serif | Headings h1-h5, editorial content |

### Animation Timing
- Standard transitions: 200-400ms
- Micro-interactions: 150-250ms
- Hero carousel auto-rotate: 8 seconds
- Testimonial auto-rotate: 5 seconds

### Shadows
`sm`, `default`, `md`, `lg`, `xl`, `glow` - standard Tailwind shadow scale

### Border Radius
Uses CSS variable `--radius` with computed variants: `lg`, `md`, `sm`

## Build Configuration

### Vite (vite.config.ts)
- SWC compiler for React (fast builds)
- Dev server: `localhost:5173` (IPv6 `::`)
- File watching with polling (1000ms) to reduce file descriptors
- PostHog proxy: `/ingest` -> `https://us.i.posthog.com` (avoids adblockers)
- Path alias: `@` -> `./src`
- Single bundle output (no manual chunks)

### TypeScript
- **App code** (tsconfig.app.json): Target ES2020, strict: false, noImplicitAny: false
- **Build tools** (tsconfig.node.json): Target ES2022, strict: true
- Path alias: `@/*` -> `./src/*`

### ESLint
- Flat config (v9), TypeScript-ESLint recommended
- React Hooks + React Refresh plugins
- `@typescript-eslint/no-unused-vars`: OFF

## Environment Variables

All client-side vars require `VITE_` prefix:

```
VITE_SUPABASE_PROJECT_ID    # Supabase project identifier
VITE_SUPABASE_PUBLISHABLE_KEY  # Supabase anon key
VITE_SUPABASE_URL           # Supabase API URL
VITE_CLERK_PUBLISHABLE_KEY  # Clerk auth key
```

Server-side (edge functions use Supabase secrets for Stripe, Resend, Mapbox, etc.)

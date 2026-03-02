# Spice & Slice Bazaar - Knowledge Base

> Authentic Indo-Nepali food e-commerce platform at **https://www.spiceandslice.shop**
> Store: 7451 N Beach St #172, Fort Worth, TX (America/Chicago timezone)

## Quick Reference

| Aspect | Details |
|--------|---------|
| Framework | React 18 + TypeScript + Vite 5 |
| Styling | Tailwind CSS + shadcn/ui (50 components) |
| Backend | Supabase (PostgreSQL + Edge Functions + Storage) |
| Auth | Clerk (synced to Supabase via webhook) |
| Payments | Stripe (card) + Cash on delivery/pickup |
| State | Zustand (cart), React Query (server), Context (auth) |
| Analytics | PostHog (50+ tracked events) |
| Icons | Lucide React |
| Animations | Framer Motion + Embla Carousel |
| Maps | Mapbox GL |
| Package Manager | bun (preferred) or npm |

## Documentation Files

| File | Contents |
|------|----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Project structure, tech stack, design system, build config |
| [ROUTING.md](./ROUTING.md) | All routes, pages, guards, and navigation flow |
| [COMPONENTS.md](./COMPONENTS.md) | Every component directory, composition patterns, key props |
| [DATABASE.md](./DATABASE.md) | Complete schema, all tables/columns, relationships, RPC functions |
| [EDGE-FUNCTIONS.md](./EDGE-FUNCTIONS.md) | All 22 Supabase edge functions with purposes and APIs |
| [STATE-MANAGEMENT.md](./STATE-MANAGEMENT.md) | Hooks, stores, contexts, caching strategies |
| [FEATURES.md](./FEATURES.md) | Business features: cart, checkout, catering, subscriptions, admin |

## Dev Commands

```bash
bun dev          # Start dev server (port 5173)
bun run build    # Production build
bun run lint     # ESLint
bun run preview  # Preview production build
```

## Key Directories

```
src/
  components/    # UI components (17 subdirectories)
  pages/         # Route page components
  hooks/         # Custom hooks (products/, admin/)
  stores/cart/   # Zustand cart store + operations
  contexts/      # Auth context (Clerk)
  types/         # TypeScript types (analytics, promo, global)
  utils/         # Utilities (cart validation, pickup, location, profile)
  lib/           # Helpers (cn utility, product validation schema)
  integrations/  # Supabase client + generated types
  index.css      # Global styles, CSS variables, fonts

supabase/
  functions/     # 22 edge functions
  migrations/    # 73 database migrations
  config.toml    # Supabase project config
```

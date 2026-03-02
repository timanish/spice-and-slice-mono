# Routing

All routes defined in `src/App.tsx`. Uses react-router-dom v6.

## Public Routes (No auth required)

| Path | Page Component | Purpose |
|------|---------------|---------|
| `/` | Index | Landing page: hero carousel, collections, featured products, flash deals, testimonials, recipes, TikTok, search |
| `/products` | ProductsPage | Browse all products with filters (category, brand, price), grid/table view, pagination |
| `/catering` | CateringPage | Multi-step catering wizard: Hero -> Menu Browse -> Details -> Submit |
| `/lunch-box` | LunchBoxPage | Lunch box subscription info ("Coming Soon" landing) |
| `/contact` | ContactPage | Contact form, business hours, location map |
| `/auth` | AuthPageClerk | Clerk SignIn component (redirects if already logged in) |
| `/privacy` | PrivacyPage | Static privacy policy |
| `/terms` | TermsPage | Static terms & conditions |
| `/order-success` | OrderSuccessPage | Post-payment confirmation (handles Stripe session completion) |
| `/order-canceled` | OrderCanceledPage | Payment canceled (redirects to /checkout) |
| `*` | NotFound | 404 page |

## Protected Routes (AuthGuard - requires login)

| Path | Page Component | Purpose |
|------|---------------|---------|
| `/checkout` | CheckoutPage | Cart review, fulfillment selection (delivery/pickup), time slots, promo codes, Stripe payment |
| `/profile` | ProfilePage | Tabs: Personal Info, Order History, Lunch Box Subscription, Catering Requests |
| `/onboarding` | OnboardingPage | New user profile setup (name, phone, email) |
| `/order/:orderId` | OrderDetailsPage | View specific order details |

## Admin Routes (AdminGuard - requires admin role)

All admin pages use `AdminLayout` wrapper (sidebar + content area).

| Path | Page Component | Purpose |
|------|---------------|---------|
| `/admin` | AdminDashboardPage | Dashboard with PostHog analytics link |
| `/admin/products` | AdminProductsPage | Product CRUD, filters (status, category, image), grid/table |
| `/admin/promos` | AdminPromoCodesPage | Promo code CRUD, active/inactive tabs |
| `/admin/menu-items` | AdminMenuItemsPage | Menu items CRUD for lunch box |
| `/admin/hero-slides` | AdminHeroSlidesPage | Hero carousel slide management |
| `/admin/collections` | AdminCollectionsPage | Homepage collection management |
| `/admin/festivals` | AdminFestivalsPage | Festival/seasonal event management |
| `/admin/festivals/:festivalId/products` | AdminFestivalProductsPage | Assign products to festivals |
| `/admin/featured` | AdminFeaturedProductsPage | Featured products (max 6) |
| `/admin/testimonials` | AdminTestimonialsPage | Reviews: All vs Pending Approval |
| `/admin/recipes` | AdminRecipesPage | Recipe CRUD with ingredients + product links |
| `/admin/flash-deals` | AdminFlashDealsPage | Time-limited deals with discount % |
| `/admin/subscriptions` | AdminLunchBoxSubscriptionsPage | Subscription + delivery + menu management |
| `/admin/lunch-box-menu` | AdminLunchBoxMenuPage | Toggle menu items for lunch box eligibility |
| `/admin/delivery-settings` | AdminDeliverySettingsPage | Time slots, delivery zones, system settings |
| `/admin/pickup-settings` | AdminPickupSettingsPage | Pickup hours, prep time, address, slots |
| `/admin/categories` | AdminCategoriesPage | Category CRUD with tax rates |
| `/admin/orders` | AdminOrdersManagementPage | Order fulfillment, status updates, email notifications |
| `/admin/tiktok` | AdminTikTokPage | TikTok video management, product linking |

## Guards

### AuthGuard
- Checks Clerk `isSignedIn` status
- Redirects to `/auth` if not authenticated
- Shows loading spinner while checking

### AdminGuard
- Checks `user_roles` table for admin role
- Uses `has_role` RPC function
- 5-minute cache (memory + localStorage)
- Redirects to `/` if not admin

## Navigation Flow

```
Landing (/) ──> Products (/products)
     │              │
     ├──> Catering (/catering)
     │
     ├──> Auth (/auth) ──> Onboarding (/onboarding) ──> Home (/)
     │                         │
     │                    Profile (/profile)
     │                         │
     │                    Checkout (/checkout) ──> Order Success (/order-success)
     │                                       └──> Order Canceled (/order-canceled)
     │
     └──> Admin (/admin/*) [if admin role]
```

## Profile Completion Flow

1. User signs up via Clerk
2. `clerk-webhook` edge function creates profile with `onboarding_shown: false`
3. `useProfileCompletion` hook on Index/Products pages detects incomplete profile
4. Redirects to `/onboarding` (retries up to 5 times for webhook delay)
5. After onboarding, redirects back to original page

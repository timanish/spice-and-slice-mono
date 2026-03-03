# State Management

Three layers: Zustand (client state), React Query (server state), React Context (auth). Plus utility modules for non-React contexts.

## Zustand - Cart Store

**Location**: `src/stores/cart/`

### Store (`store.ts`)

| State | Type | Purpose |
|-------|------|---------|
| items | CartItem[] | Cart contents |
| isLoading | boolean | Fetching state |
| hasError | boolean | Error flag |
| errorMessage | string | Error details |
| lastFetchTime | number | Cache timestamp |
| isFetching | boolean | Dedup flag |

| Method | Purpose |
|--------|---------|
| fetchCart() | Fetch with 30-second cache |
| forceRefreshCart() | Bypass cache |
| addToCart(productId, weight?, discount?, flashDealId?) | Add/update item |
| removeFromCart(productId) | Remove item |
| updateQuantity(productId, quantity) | Change quantity |
| updateWeight(productId, weight) | Change weight (weighted products) |
| retryFetchCart() | Retry with rate limit handling |
| clearError() | Clear error state |

### Operations (`operations/`)

| File | Purpose |
|------|---------|
| fetchCart.ts | Retrieves cart for current user, memoized (5s TTL), 30s throttle |
| addToCart.ts | Handles weighted vs regular, min_order_value validation, discount/flash deal |
| removeFromCart.ts | Optimistic UI removal, database delete, fallback fetch |
| updateQuantity.ts | Optimistic update, auto-remove if <= 0 |
| updateWeight.ts | Optimistic update for weighted products |
| memoization.ts | In-memory cache (5s TTL), user ID cache (30s TTL) |

### Constants (`types.ts`)
- `OPERATION_TIMEOUT`: 10,000ms
- `MAX_RETRIES`: 3
- `RETRY_DELAY`: 1,000ms

## React Context - Auth

**Location**: `src/contexts/ClerkAuthContext.tsx`

| Property | Type | Purpose |
|----------|------|---------|
| user | Clerk User or null | Current user object |
| isLoading | boolean | Auth initializing |
| isSignedIn | boolean | Login status |
| signOut() | function | Sign out + navigate home |
| redirectToHome() | function | Navigate to / |

## React Query Hooks

### Product Hooks (`src/hooks/products/`)

| Hook | Purpose | Cache |
|------|---------|-------|
| useProductQuery() | Central product hook: fetch + filter + paginate | 15 min |
| useProductFetcher() | Fetch all active products in batches of 1000 | 15 min |
| useProductFiltering() | Client-side filtering (search, categories, brands, price) | N/A |
| usePagination() | Generic pagination (20 items/page) | N/A |
| useProductMetadata() | Categories with counts, brands, price range | 5 min |
| useMenuItemFetcher() | Fetch lunch box menu items | 15 min |

### Cart Hook

| Hook | Purpose |
|------|---------|
| useCartItem(productId) | Check if product is in cart, get quantity/weight |

### Fulfillment Hooks

| Hook | Purpose | Cache |
|------|---------|-------|
| usePickupSlots() | Active pickup/delivery slots for current date | default |
| usePickupCapacity() | Max capacity for a slot (client-side only) | default |
| useDeliverySlots() | Active delivery slots | default |
| useAllDeliverySlots() | All slots for admin | 30s |
| usePickupSettings() | Pickup config (address, hours, max orders) | 5 min |
| useDeliverySettings() | Delivery config with defaults | default |
| useRawDeliverySettings() | Raw DB records for admin | default |
| useDeliveryFee() | Fee based on distance + order total | default |

### Lunch Box Hooks (`src/hooks/useLunchBoxSubscription.ts`)

**Queries**:
| Hook | Purpose |
|------|---------|
| useLunchBoxSubscription() | Active subscription for user |
| useAllUserSubscriptions() | All subscriptions for user |
| useSubscriptionDeliveries() | Deliveries for a subscription |
| useUpcomingDeliveries() | Upcoming scheduled deliveries |

**Mutations**:
| Hook | Purpose |
|------|---------|
| useCreateLunchBoxSubscription() | Create with auto-generated deliveries |
| useUpdateLunchBoxSubscription() | Update subscription |
| useCancelLunchBoxSubscription() | Cancel |
| usePauseLunchBoxSubscription() | Pause |
| useResumeLunchBoxSubscription() | Resume |
| useUpdateDelivery() | Update single delivery |
| useUpdateDeliverySchedule() | Update dates + regenerate deliveries |

### TikTok Hooks (`src/hooks/useTikTokVideos.ts`)

| Hook | Purpose |
|------|---------|
| useTikTokVideos() | Active videos with products (public) |
| syncVideos mutation | Invoke edge function to fetch from TikTok |
| addVideo mutation | Add video manually via URL (tikwm.com + oEmbed) |
| updateVideo mutation | Update video properties |
| deleteVideo mutation | Delete video |
| updateVideoProducts mutation | Link/unlink products |

### User & Auth Hooks

| Hook | File | Purpose | Cache |
|------|------|---------|-------|
| useUser() | use-user.tsx | Clerk user + admin check | 5 min (memory + localStorage) |
| useClerkUser() | use-user-clerk.tsx | Same with `has_role` RPC | 5 min |
| useAdminRole() | useAdminRole.ts | Simple admin role check | 5 min |
| useProfileData() | useProfileData.ts | User profile (name, phone) | N/A |
| useProfileCompletion() | useProfileCompletion.ts | Check onboarding status, redirect if needed | N/A |

### Order & Review Hooks

| Hook | Purpose |
|------|---------|
| useOrderHistory() | User's orders with items (lazy-loaded on tab) |
| usePendingReviews() | Pending testimonials for admin |
| useSubmitReview() | Submit review (auto-populates from profile, status: pending) |

### Tax & Pricing

| Hook | Purpose |
|------|---------|
| useTaxCalculation() | Category tax rates. Exports: calculateItemTax(), calculateCartTax(), formatTaxRate() |

### Admin CRUD & User Data Hooks

| Hook | File | Purpose |
|------|------|---------|
| useAdminCrud() | useAdminCrud.ts | Wrapper around `admin-crud` edge function. Methods: execute, select, insert, update, remove, upsert. Auth via Clerk JWT |
| useUserData() | useUserData.ts | Wrapper around `user-data` edge function. Methods for profile, addresses, cart, orders, reviews, catering. Auth via Clerk JWT |
| useStoreDisplaySettings() | useStoreDisplaySettings.ts | Fetch global store settings (showTaxOnCards, lunchBoxEnabled). 5-min cache |

### Admin Hooks (`src/hooks/admin/`)

| Hook | Purpose |
|------|---------|
| useProductManagement() | Full product CRUD + filters + file upload |
| useAllDeliveries() | All deliveries with filters |
| useDeliveriesByDate() | Deliveries for specific date |
| useLunchBoxMenuItems() | Lunch box eligible items |
| useAssignMenuBulk() | Assign menu to multiple deliveries |
| useAssignMenuToDelivery() | Assign menu to single delivery |
| useUpdateDeliveryStatus() | Update delivery status + driver notes |
| useGenerateMissingDeliveries() | Generate for one subscription |
| useBulkGenerateMissingDeliveries() | Generate for all active |

### Utility Hooks

| Hook | Purpose |
|------|---------|
| useToast() | Sonner toast wrapper (1.5s default duration) |
| useDebounce(value, delay) | Generic value debounce |
| useCategoriesFetcher() | Active categories ordered by display_order (5 min cache) |
| usePostHogTracking() | Analytics: trackEvent, trackProductViewed, trackCartViewed, etc. |
| useMapboxAddressAutofill() | Mapbox address autocomplete with parsed address |
| useResetPasswordLogic() | Password reset flow with token verification |
| useClerkAuth() | Access ClerkAuthContext |

## Auth Token Utility (`src/lib/auth-token.ts`)

Non-React token management for use in Zustand stores and other non-component contexts:

| Export | Purpose |
|--------|---------|
| `registerTokenGetter(getter)` | Register Clerk's `getToken` from top-level React component (called once) |
| `getClerkToken()` | Get cached Clerk JWT (30s in-memory cache, Clerk JWTs valid 60s) |
| `fetchWithAuth(functionPath, body)` | Call Supabase edge functions with Authorization header |

## Caching Strategy Summary

| Layer | TTL | Purpose |
|-------|-----|---------|
| React Query | 5-15 min | Server data freshness |
| Zustand cart fetch | 30 sec | Prevent rapid re-fetches |
| Cart memoization | 5 sec | Deduplicate concurrent calls |
| User ID cache | 30 sec | Avoid repeated auth lookups |
| Admin role (memory) | 5 min | Reduce role check queries |
| Admin role (localStorage) | 5 min | Persist across page loads |
| Profile check (memory + localStorage) | 5 min | Onboarding redirect |

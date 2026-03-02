# Features

Business features and user flows for Spice & Slice Bazaar.

## Product Browsing

### Product Types
- **Quantity-based**: Standard products with integer quantities (min_order_unit: 'pieces')
- **Weighted products**: Sold by weight (min_order_unit: 'kg' or 'lbs'), uses WeightSelector

### Product Discovery
- **Homepage sections**: Featured (max 6), flash deals, festival products, collections, recipes
- **Search**: GlobalProductSearch with autocomplete suggestions
- **Filters**: Category checkboxes, brand checkboxes, price range slider
- **Views**: Grid (2-4 cols responsive) or table view
- **Pagination**: 20 items per page

### Product Cards
- Lazy-loaded images with fallback
- Price per unit display
- Minimum order badges
- Cart controls (add/increment/decrement)
- WeightedProductDialog for weight-based items
- PostHog tracking on view/add-to-cart

## Shopping Cart

### Cart Behavior
- Sheet drawer (slides in from right)
- Badge shows item count on cart icon
- One cart per user (enforced in DB)
- Optimistic UI updates with database sync
- 30-second fetch throttle to prevent rapid re-fetches

### Cart Items
- Quantity or weight based
- Discount display (strikethrough original price)
- Min order validation before checkout
- Promo code entry with server-side validation

### Payment Methods
- **Card**: Stripe checkout session (redirects to Stripe)
- **Cash**: Direct order creation (delivery or pickup)

## Checkout Flow

### Fulfillment Types
1. **Delivery**
   - Address selection from saved addresses
   - Distance calculation from store (7451 N Beach St, Fort Worth TX)
   - Zone-based delivery fees with free shipping thresholds
   - Delivery time slot selection (by day of week)

2. **Pickup**
   - Store hours display
   - Preparation time calculation
   - Pickup slot selection with capacity limits
   - 1-hour pickup reminder email

### Order Processing
1. Cart validation (min orders, inventory)
2. Promo code validation
3. Tax calculation (product tax > category tax > 0)
4. Total = subtotal + tax + delivery fee - discount
5. Payment (Stripe redirect OR cash order creation)
6. Print job created for store printer
7. Confirmation emails (customer + admin)
8. Cart cleared

### Order Statuses
`pending` -> `confirmed` -> `preparing` -> `out_for_delivery` -> `delivered`
Or: `cancelled`

## Catering Service

### 3-Step Wizard
1. **Hero Step**: Banner with guest count input
2. **Menu Browse**: Category tabs, item grid, quantity selectors. Desktop: sticky sidebar summary. Mobile: bottom sheet summary
3. **Details Step**: Full form (name, email, phone, event type/date/time, venue, spice level, dietary restrictions, notes)

### Catering Request Lifecycle
`pending` -> `confirmed` -> `completed` (or `cancelled`)

## Lunch Box Subscriptions

### Subscription Types
- **Weekly**: Recurring weekly deliveries
- **Monthly**: Monthly delivery plan

### Subscription Lifecycle
- Create: Choose plan, set delivery address, auto-generate delivery dates
- Active: View calendar, see upcoming deliveries, modify schedule
- Pause: Temporarily suspend deliveries
- Resume: Reactivate paused subscription
- Cancel: End subscription

### Admin Management
- View all subscriptions with filters
- Track deliveries by date/status/city
- Assign menu items to deliveries (single or bulk)
- Update delivery status with driver notes
- Generate missing deliveries

## TikTok Integration

### Video Management
- Fetch videos from @spiceandslicedfw TikTok profile
- Manual add via URL (tikwm.com + oEmbed APIs)
- Inline MP4 playback (direct URLs)
- Link products to videos for shoppable experience

### URL Refresh System
- tikwm.com URLs expire after ~2 hours
- GitHub Actions workflow runs every 90 minutes
- Calls `refresh-tiktok-video` edge function
- Updates `video_file_url` and `thumbnail_url`

### Display
- Homepage TikTokSection with carousel
- TikTokStory: Individual video player
- TikTokProductShowcase: Products linked to video

## Content Management (Admin)

### Hero Carousel
- Create/edit/delete slides
- Image, title, description, CTA button (text + link)
- Display order, active/inactive toggle
- Auto-rotates every 8 seconds on homepage

### Collections
- Link to product categories
- Homepage horizontal scroll with auto-scroll
- Image, name, description

### Festivals
- Seasonal events with date ranges
- Auto-active based on start/end dates
- Assign products to festivals
- Banner image display

### Flash Deals
- Time-limited discounts on specific products
- Discount percentage
- Start/end dates with auto-active
- Applied as cart item discount

### Featured Products
- Max 6 products
- Reorderable (up/down buttons)
- Displayed prominently on homepage

### Recipes
- Title, description, image
- Ingredients list with linked products
- Prep time, cook time, servings, difficulty
- Recipe inspiration section on homepage

### Testimonials/Reviews
- Admin-created or user-submitted
- User submissions require approval (status: 'pending')
- Auto-rotating carousel on homepage (5s interval)
- Rating, customer name, image, review text

## User Profile

### Profile Data
- Full name, email, phone number
- Synced from Clerk via webhook
- Onboarding flow for new users

### Address Management
- Multiple saved addresses with labels (Home, Work, etc.)
- Mapbox autocomplete for address entry
- Distance calculation from store
- Default address selection

### Profile Tabs
1. **Personal Info**: Edit name, phone
2. **Order History**: Table with all orders (ID, date, type, items, total, status, payment)
3. **Lunch Box**: Subscription dashboard or signup
4. **Catering Requests**: Request history

## Admin Panel

### Layout
- Fixed sidebar navigation (desktop)
- Drawer sidebar (mobile) with hamburger menu
- AdminGuard protects all admin routes

### Admin Sections
| Section | Path | Purpose |
|---------|------|---------|
| Dashboard | /admin | Welcome + PostHog analytics link |
| Products | /admin/products | Full product CRUD with filters |
| Categories | /admin/categories | Category CRUD with tax rates |
| Orders | /admin/orders | Order fulfillment + status updates |
| Promo Codes | /admin/promos | Promo code management |
| Hero Slides | /admin/hero-slides | Carousel management |
| Collections | /admin/collections | Homepage collections |
| Festivals | /admin/festivals | Seasonal events |
| Featured | /admin/featured | Featured products (max 6) |
| Flash Deals | /admin/flash-deals | Time-limited deals |
| Testimonials | /admin/testimonials | Reviews + approval |
| Recipes | /admin/recipes | Recipe management |
| Menu Items | /admin/menu-items | Menu item CRUD |
| Lunch Box Menu | /admin/lunch-box-menu | Eligibility toggle |
| Subscriptions | /admin/subscriptions | Subscription + delivery management |
| Delivery Settings | /admin/delivery-settings | Zones, slots, system settings |
| Pickup Settings | /admin/pickup-settings | Hours, prep time, address, slots |
| TikTok | /admin/tiktok | Video management + product linking |

## Store Printer System

### Print Job Flow
1. Order created (card or cash) -> print job created (status: 'pending')
2. Store printer polls `printer-get-jobs` endpoint (API key auth)
3. Printer claims job -> status: 'claimed'
4. Printer prints receipt -> status: 'printed'
5. On failure -> status: 'failed', retry_count incremented

### Printer API Endpoints
- `GET printer-get-jobs`: Fetch pending jobs (FIFO)
- `POST printer-claim-job`: Claim a job
- `POST printer-ack-job`: Acknowledge completion
- `POST printer-create-job`: Admin manually create job

## Analytics (PostHog)

### Tracked Events (50+)
- **Auth**: sign_up, sign_in, sign_out, onboarding_completed, profile_updated
- **Products**: product_viewed, product_search, filter_applied, category_viewed, collection_clicked
- **Cart**: add_to_cart, remove_from_cart, cart_viewed, quantity_updated
- **Checkout**: checkout_started, payment_method_selected, fulfillment_selected, promo_applied, order_completed, order_failed
- **Catering**: catering_form_started, catering_request_submitted
- **TikTok**: tiktok_video_viewed, tiktok_video_clicked, tiktok_product_clicked
- **Navigation**: page_view, nav_item_clicked, search_opened
- **Admin**: admin_login, product_created, order_status_updated

### Integration
- Proxy through Vite (`/ingest` -> PostHog) to avoid adblockers
- PageViewTracker component for automatic page tracking
- PostHogUserTracker for user identification

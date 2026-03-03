# Components

All components in `src/components/`. 16 subdirectories.

## ui/ - shadcn/ui Primitives (51 components)

Pre-built, customizable components from shadcn/ui:

**Layout**: accordion, breadcrumb, card, collapsible, drawer, sheet, sidebar, tabs
**Forms**: button, calendar, checkbox, command, form, input, input-otp, label, radio-group, select, switch, textarea, toggle-group
**Display**: alert, alert-dialog, avatar, badge, carousel, chart, context-menu, dialog, dropdown-menu, hover-card, menubar, navigation-menu, pagination, popover, progress, resizable, scroll-area, separator, skeleton, slider, table, toast, tooltip
**Utilities**: aspect-ratio, sonner (toaster)

## hero/ - Hero Carousel

Auto-rotating image carousel on the homepage (8-second interval).

| Component | Purpose |
|-----------|---------|
| HeroCarousel | Main carousel container, auto-rotate logic, image preloading |
| HeroSlide | Individual slide with Framer Motion animations |
| HeroNavigation | Prev/next arrow buttons |
| HeroIndicators | Dot indicators for current position |
| useHeroCarousel | Hook returning slide data from Supabase |
| animations.ts | Framer Motion animation variants |

**Composition**: `HeroCarousel` -> `HeroSlide[]` + `HeroNavigation` + `HeroIndicators`

## home/ - Homepage Sections

| Component | Purpose |
|-----------|---------|
| FeaturedProductsSection | 1 large hero + 4 smaller product cards, add-to-cart, weighted products |
| CollectionsSection | Horizontal scrolling collection cards, auto-scroll, links to category filters |
| TikTokSection | TikTok video carousel with product showcase, drag/swipe on mobile |
| TikTokStory | Individual TikTok video player with inline MP4 playback |
| TikTokProductShowcase | Products linked to a TikTok video |
| TestimonialsSection | Auto-rotating reviews (5s), large image + text, thumbnail nav |
| FlashDealsSection | Time-limited promotional deals with countdown |
| FestivalSection | Seasonal/festival product promotions |
| RecipeInspirationSection | Recipe cards with ingredients and links |
| GlobalProductSearch | Search with autocomplete suggestions |
| LeaveReviewButton | Triggers review submission dialog |
| ReviewSubmissionDialog | Modal form for submitting reviews |

## product/ - Single Product Display

| Component | Purpose |
|-----------|---------|
| ProductCard | Memoized card: image, name, price, brand, badges, cart controls. Tracks via PostHog |
| ProductDetails | Price/unit, inventory, category info |
| ProductImage | Lazy-loaded image with fallback placeholder |
| WeightedProductDialog | Modal for selecting weight before adding to cart |
| WeightSelector | Weight input with price calculation |
| QuantitySelector | Quantity +/- controls |
| AddToCartButton | Button with loading state |
| CartItemControls | Increment/decrement/remove controls for items already in cart |

**Key interface - Product**:
```typescript
{
  id: string;
  name: string;
  description?: string;
  price_per_unit: number;
  inventory_count: number;
  image_url?: string;
  is_weighted?: boolean;
  unit_of_measure?: string;
  category?: { id: string; name: string };
  brand?: string;
  min_order_value?: number;
  min_order_unit?: 'pieces' | 'kg' | 'lbs';
}
```

## products/ - Product Listing

| Component | Purpose |
|-----------|---------|
| ProductList | Paginated grid (2-4 cols), 20 items/page, error handling with retry |
| ProductListingSection | Section wrapper |
| ProductForm | Create/edit product form |
| ProductImageUpload | Image upload with preview |
| EditProductDialog / EditProductForm | Edit workflow |
| SearchBar | Search with typeahead |
| SearchSuggestions | Autocomplete dropdown |
| StickyFilterRow | Mobile sticky filter controls |
| MobileProductSearch | Mobile-optimized search UI |

## product-filters/ - Filtering System

| Component | Purpose |
|-----------|---------|
| ProductFilters | Multi-mode filter panel (compact/expanded/desktop sticky). Manages search, categories, brands, price range |
| SearchInput | Search box with autocomplete |
| CheckboxGroup | Category/brand checkbox lists |
| PriceRangeFilter | Slider for min/max price |
| FilterSection | Collapsible section wrapper |
| AdminSearchInput | Admin-specific search variant |

## shopping-cart/ - Cart System

| Component | Purpose |
|-----------|---------|
| ShoppingCart | Sheet drawer with cart badge showing item count |
| CartContent | Cart items list + summary (legacy) |
| CartItem | Item display with price, quantity/weight, discount (strikethrough), controls |
| CartSummary | Subtotal, discount, total. Checkout button + payment method selector (card/cash) |
| PromoCodeInput | Promo code entry + validation |
| CartError | Error state display |
| useCartLogic | Hook for cart operations and checkout flow |

### cart-content/ - Refactored Cart Content

| Component | Purpose |
|-----------|---------|
| CartContent | Main cart drawer orchestrator: composes item list, delivery, payment, promo, summary |
| CartItemList | Renders list of CartItem components |
| CartDeliverySection | Delivery time selection section within cart |
| CartPromoSection | Promo code input section within cart |
| PaymentMethodSelector | Radio button selector for card vs cash payment |
| EmptyCart | Empty cart state display |
| ProfileWarning | Warning when profile is incomplete |
| useCheckout | Hook for checkout flow logic |
| usePromoCode | Hook for promo code application logic |

## checkout/ - Checkout Flow

| Component | Purpose |
|-----------|---------|
| FulfillmentTypeSelector | Radio buttons: Delivery (truck icon) vs Pickup (package icon) |
| DeliveryLocationModal | Delivery address selection/confirmation |
| DeliveryFeeBanner | Shows calculated delivery fee |
| PickupInfo | Pickup location, time, instructions |

## catering/ - Catering Wizard

Multi-step form flow:

| Step | Component | Purpose |
|------|-----------|---------|
| 1 | HeroStep | Hero banner with guest count input |
| 2 | MenuBrowseStep | Category tabs + menu item grid. Desktop: EventSummarySidebar (sticky). Mobile: EventSummaryBottomSheet |
| 3 | DetailsStep | CateringFormFields with all event details |

| Component | Purpose |
|-----------|---------|
| CateringFormFields | Full form: name, email, phone, eventType, eventDate, eventTime, guestCount, venue, spiceLevel, dietary, notes |
| MenuSelectionDialog | Dialog for selecting menu items |
| MenuItemCard | Individual menu item with quantity +/- controls |
| SelectedMenuItems | Summary of selected items |
| EventSummarySidebar | Desktop sticky sidebar with event summary |
| EventSummaryBottomSheet | Mobile bottom sheet variant |
| CategoryTabs | Category navigation with smooth scroll |
| animations.ts | Framer Motion animation variants for catering wizard |
| types.ts | TypeScript types for catering components |
| cateringService.ts | API service for catering requests |

## lunchbox/ - Subscription System

| Component | Purpose |
|-----------|---------|
| SubscriptionDashboard | Two-column: subscription details (left) + calendar/deliveries tabs (right). Tomorrow's delivery highlight, pause/resume actions |
| DeliveryCalendar | Interactive date picker for delivery schedule |
| LunchBoxSubscriptionForm | Create subscription form |
| PendingApprovalView | Status display while pending |
| admin/ | Admin management subfolder |

## admin/ - Admin Panel

| Component | Purpose |
|-----------|---------|
| AdminLayout | Two-column layout: fixed sidebar (lg+) + content. Mobile: drawer sidebar |
| AdminSidebar | Navigation menu with all admin links |
| AdminMobileHeader | Mobile header with hamburger menu |
| MenuItems | Full CRUD for menu items: search, category tabs, grid display, create/edit/delete |
| MenuItemForm | Form for menu item creation/editing with image upload |
| PromoCodeForm | Promo code create/edit form |
| PromoCodeList | Active promo codes display |
| TikTokVideoProductPicker | Assign products to TikTok videos |
| products/ | Product management subfolder |

## auth/ - Authentication

| Component | Purpose |
|-----------|---------|
| ResetPasswordForm | OTP verification + password reset (6+ chars, match check). Signs out after reset |
| ResetPasswordFormFields | Input fields |
| ResetPasswordLoading | Loading state |
| ResetPasswordError | Error display |
| AuthSuccessMessage | Success confirmation |
| EmailConfirmationHandler | Email verification flow |

## profile/ - User Profile

| Component | Purpose |
|-----------|---------|
| ProfileTabs | 4 tabs: Profile, Order History, Lunch Box, Catering |
| ProfileForm | Main profile editor |
| ProfileCompletionForm / Popover / FormFields | Profile completion UI |
| AddressManagement | Multiple address CRUD with Mapbox autocomplete |
| AddressForm | Address input fields |
| OrderHistory | Order table: ID, date, type (delivery/pickup), items, total, status badge, payment, scheduled time |
| CateringRequests | Catering request history |
| LunchBoxSubscriptionCard | Subscription status card |
| ProfileLoading | Loading skeleton |

## navigation/ - Header & Nav

| Component | Purpose |
|-----------|---------|
| NavItems | Link list with active state (text-food-red), optional icons, PostHog tracking |
| CartButton | Shopping cart icon with red badge (item count) |
| MobileMenu | Drawer/sheet for mobile navigation |
| UserMenu | Dropdown for profile/logout |
| AdminItems | Admin-only navigation links |

## analytics/ - Tracking

| Component | Purpose |
|-----------|---------|
| PageViewTracker | Tracks page navigation with PostHog |
| PostHogUserTracker | User identification and properties |

## icons/ - Custom Icons

| Component | Purpose |
|-----------|---------|
| TikTokIcon | Custom TikTok logo SVG |

## Composition Patterns

### Homepage
```
Index -> Navigation + HeroCarousel + CollectionsSection + FeaturedProductsSection
       + FlashDealsSection + FestivalSection + TikTokSection
       + RecipeInspirationSection + TestimonialsSection + LeaveReviewButton
```

### Shopping Flow
```
ProductCard -> AddToCartButton / CartItemControls / WeightedProductDialog
ShoppingCart (drawer) -> CartContent -> CartItem[] + CartSummary + PromoCodeInput
CheckoutPage -> FulfillmentTypeSelector + DeliveryLocationModal/PickupInfo
             -> Stripe / Cash payment -> OrderSuccessPage
```

### Admin Panel
```
AdminLayout -> AdminSidebar + AdminMobileHeader + [Page Content]
Admin pages -> Dialog modals for CRUD + React Query mutations
```

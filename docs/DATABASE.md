# Database Schema

Supabase PostgreSQL. 73 migrations. Types generated in `src/integrations/supabase/types.ts`.

## Users & Auth

### profiles
Synced from Clerk via `clerk-webhook` edge function.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Clerk user ID |
| email | text | |
| full_name | text | |
| phone_number | text | |
| profile_completed | boolean | |
| onboarding_shown | boolean | false until onboarding done |
| created_at, updated_at | timestamp | |

### user_roles
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | text FK -> profiles | |
| role | text | 'admin' or 'user' |
| created_at | timestamp | |

### user_addresses
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | text FK | |
| address_line1, city, state, postal_code | text | |
| label | text | 'Home', 'Work', etc. |
| is_default, is_active | boolean | |
| latitude, longitude | number | Geocoded coordinates |
| distance_from_store | number | Calculated distance |
| distance_calculated_at | timestamp | |

## Product Catalog

### products
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name, description, brand | text | |
| category_id | UUID FK -> categories | |
| price_per_unit | number | |
| tax_rate | number | Overrides category tax rate |
| image_url | text | |
| unit_of_measure | text | kg, lbs, etc. |
| upc_code | text | Barcode |
| is_weighted | boolean | Weight-based vs quantity-based |
| is_active | boolean | |
| inventory_count | number | For non-weighted products |
| inventory_weight | number | For weighted products |
| track_inventory | boolean | |
| low_stock_threshold, low_stock_weight_threshold | number | |
| min_order_unit | text | 'pieces', 'kg', 'lbs' |
| min_order_value | number | Minimum order quantity/weight |
| tags | text[] | String array |
| priority, display_order | number | Sorting |
| auto_deactivated, deactivated_by_category | boolean | Auto-deactivation tracking |
| has_default_image | boolean | |

### categories
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name, description | text | |
| display_order, priority | number | |
| tax_rate | number | Default tax for products in category |
| is_active | boolean | Cascade deactivates products |

### collections
Homepage collection cards linking to categories.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name, description, image_url | text | |
| category_id | UUID FK -> categories | |
| display_order | number | |
| is_active | boolean | |

### menu_items
Used for catering and lunch box menus.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name, description, image_url | text | |
| category_id | UUID FK | |
| price | number | |
| is_available, is_spicy, is_vegetarian | boolean | |
| lunch_box_eligible | boolean | |
| serves_people | number | |
| sub_category | text | |

## Cart & Orders

### carts
One cart per user (1:1 relationship).

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | text FK -> profiles | Unique |
| created_at, updated_at | timestamp | |

### cart_items
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| cart_id | UUID FK -> carts | |
| product_id | UUID FK -> products | |
| flash_deal_id | UUID FK -> flash_deals | Optional |
| quantity | number | For non-weighted |
| weight | number | For weighted |
| discount_percentage | number | From flash deals |

### orders
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | text FK | |
| address_id | UUID FK -> user_addresses | |
| promo_code_id | UUID FK -> promo_codes | |
| status | text | Order status |
| payment_method | text | 'card' or 'cash' |
| payment_status | text | |
| fulfillment_type | text | 'delivery' or 'pickup' |
| fulfillment_status | text | |
| total_amount, discount_amount, tax_amount, taxable_amount | number | |
| **Delivery fields**: | | |
| delivery_date, delivery_time | text | |
| delivery_address_line1, delivery_city, delivery_state, delivery_postal_code | text | |
| delivery_address_label | text | |
| delivery_fee, delivery_distance | number | |
| delivery_zone, estimated_delivery_time | text | |
| **Pickup fields**: | | |
| pickup_date, pickup_time | text | |
| pickup_ready_at | timestamp | |
| pickup_reminder_scheduled_for, pickup_reminder_sent_at | timestamp | |
| **Card details** (from Stripe): | | |
| card_brand, card_last4 | text | |
| card_exp_month, card_exp_year | number | |
| stripe_session_id | text | |

### order_items
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| order_id | UUID FK -> orders | |
| product_id | UUID FK -> products | |
| quantity | number | |
| price_per_unit | number | Price at time of order |
| tax_rate, tax_amount | number | |

## Promotions & Deals

### promo_codes
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| code | text | Unique code |
| discount_type | text | |
| discount_percentage, discount_amount, discount_value | number | Multiple discount columns (legacy compat) |
| min_order_amount, minimum_order_amount | number | Legacy compat |
| max_uses, current_uses | number | Usage tracking |
| start_date, end_date | text | Validity period |
| is_active, is_sitewide | boolean | |
| description | text | |

### flash_deals
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| product_id | UUID FK -> products | |
| discount_percentage | number | |
| start_date, end_date | text | Time-limited |
| is_active | boolean | |

### featured_products
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| product_id | UUID FK -> products | |
| display_order | number | Max 6 items |
| is_active | boolean | |

## Content & Marketing

### hero_slides
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| image_url, title, description, sub_description | text | |
| button_text, button_link | text | CTA button |
| display_order | number | |
| is_active | boolean | |

### testimonials
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| customer_name, customer_image, review | text | |
| rating | number | |
| user_id, user_email | text | Nullable (admin-created vs user-submitted) |
| source | text | |
| status | text | 'pending' for user-submitted, approved by admin |
| display_order | number | |
| is_active | boolean | |

### festivals
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name, description, banner_image | text | |
| start_date, end_date | text | Auto-active based on dates |
| display_order | number | |
| is_active | boolean | |

### festival_products (junction)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| festival_id | UUID FK -> festivals | |
| product_id | UUID FK -> products | |
| display_order | number | |

### recipes
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| title, description, image_url | text | Required |
| ingredients, instructions | text | |
| difficulty, display_order | number | |
| is_active | boolean | |
| prep_time_minutes, cook_time_minutes, servings | number | |

### recipe_products (junction)
Links recipes to purchasable products.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| recipe_id | UUID FK -> recipes | |
| product_id | UUID FK -> products | |
| quantity | text | |
| unit, amount | text/number | |
| display_order, notes | number/text | |

## Lunch Box Subscriptions

### lunch_box_subscriptions
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | text FK | |
| subscription_type | text | 'weekly' or 'monthly' |
| status | text | 'active', 'paused', 'cancelled' |
| start_date, next_delivery_date | date | |
| cancelled_at, paused_at | timestamp | |
| company | text | |
| address_line1, address_line2, city, state, postal_code | text | Delivery address |
| delivery_instructions | text | |
| delivery_schedule | JSON | Custom schedule config |
| price_per_day, total_price | number | |
| total_delivery_days | number | |

### lunch_box_deliveries
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| subscription_id | UUID FK -> lunch_box_subscriptions | |
| menu_item_id | UUID FK -> menu_items | |
| delivery_date | text | |
| scheduled_time | timestamp | |
| status | text | |
| customer_notes, driver_notes | text | |
| delivered_at | timestamp | |

### lunch_box_notifications
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id, subscription_id | text/UUID FK | |
| title, message, type | text | |
| read | boolean | |
| read_at | timestamp | |

## Catering

### catering_requests
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | text FK | |
| name, email, phone | text | |
| event_type, event_date, event_time, venue | text | |
| guest_count | number | |
| dietary_restrictions, additional_info | text | |
| selected_items | JSON | Menu items selected |
| status | text | 'pending', 'confirmed', 'completed', 'cancelled' |

## TikTok Integration

### tiktok_videos
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| video_id | text UNIQUE | TikTok video identifier |
| video_url | text | TikTok page URL |
| video_file_url | text | Direct MP4 URL (expires ~2hrs) |
| author_name, author_url | text | |
| title, thumbnail_url | text | |
| embed_html | text | oEmbed HTML |
| duration, view_count, like_count | number | |
| published_at | timestamp | |
| display_order | number | |
| is_active | boolean | |

### tiktok_video_products (junction)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| tiktok_video_id | UUID FK -> tiktok_videos | |
| product_id | UUID FK -> products | |
| display_order | number | |
| UNIQUE(tiktok_video_id, product_id) | | |

### tiktok_sync_logs
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| status | text | 'running', 'success', 'error' |
| videos_fetched, videos_added, videos_updated | number | |
| error_message | text | |
| sync_started_at, sync_completed_at | timestamp | |

## Store Configuration

### delivery_zones
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| zone_name | text | |
| min_distance, max_distance | number | Miles |
| delivery_fee | number | |
| free_shipping_threshold | number | Order amount for free delivery |
| display_order | number | |
| is_active | boolean | |

### delivery_time_slots
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| label | text | Display name |
| day_of_week | number | 0-6 |
| start_hour, start_minute, end_hour, end_minute | number | |
| display_order | number | |
| is_active | boolean | |

### pickup_settings
Single row configuration table.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| is_pickup_enabled | boolean | |
| opening_time, closing_time | text | |
| min_advance_hours, max_days_advance | number | |
| last_order_cutoff_minutes | number | |
| preparation_time_minutes | number | |
| default_max_orders_per_slot | number | |
| delivery_time_buffer_minutes | number | |
| store_address_line1, city, state, postal_code, phone | text | |
| timezone | text | America/Chicago |
| use_delivery_slots | boolean | |

### pickup_slots
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| label | text | |
| start_hour, start_minute, end_hour, end_minute | number | |
| max_orders_per_slot | number | |
| is_active | boolean | |

### delivery_settings
Key-value configuration store.

| Column | Type | Notes |
|--------|------|-------|
| key | text PK | Setting name |
| value | text | Setting value |
| description | text | |

## Printing

### print_jobs
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| order_id | UUID FK -> orders | |
| status | text | 'pending', 'claimed', 'printed', 'failed' |
| claimed_at, printed_at, failed_at | timestamp | |
| retry_count | number | |
| error_message | text | |

## Database Functions (RPC)

| Function | Returns | Purpose |
|----------|---------|---------|
| `has_role(user_id, role)` | boolean | Check user role |
| `validate_promo_code(code, user_id, order_amount)` | {valid, discount, promo_id, message} | Validate promo codes |
| `validate_profile_access(profile_id, requesting_user_id)` | boolean | Access control |
| `check_product_inventory(product_id, quantity)` | boolean | Stock check |
| `deduct_product_inventory(product_id, quantity)` | boolean | Reduce stock |
| `restore_product_inventory(product_id, quantity)` | boolean | Restore stock (cancellation) |
| `auto_generate_subscription_deliveries(subscription_id)` | number | Generate lunch box deliveries |
| `bulk_generate_missing_deliveries()` | [{count, subscription_id}] | Bulk delivery generation |
| `calculate_next_delivery_date(subscription_id)` | string | Next delivery date |
| `generate_deliveries_for_subscription(id, dates[])` | void | Custom delivery dates |
| `get_category_product_stats(category_id)` | {total, active, inactive, ...} | Category stats |

## Security Notes

- Most tables have RLS **disabled** - security handled at application layer (Clerk auth)
- Service role key used in edge functions for admin operations
- API key authentication for printer endpoints
- Rate limiting on public endpoints

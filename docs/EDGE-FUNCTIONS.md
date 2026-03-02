# Edge Functions

22 Supabase Deno edge functions in `supabase/functions/`.

## Authentication & User Management

### clerk-webhook
Handles Clerk webhook events to sync users with Supabase.
- **Events**: `user.created`, `user.updated`, `user.deleted`
- **Actions**: Creates/updates `profiles`, creates `user_roles` (admin/user), creates `carts`
- **Auth**: Clerk webhook signature verification
- **Uses**: Service role key (bypasses RLS)

### get-user-role
Returns user's role from `user_roles` table.
- **Returns**: `'admin'` or `'user'`
- **Auth**: JWT

## Order Processing

### create-checkout
Creates Stripe checkout session for card payments.
- **Validates**: promo codes, calculates totals (tax, delivery fees, discounts)
- **Sends**: line items to Stripe (products, delivery fee, tax)
- **Rate limit**: 30 requests/60s per IP
- **Returns**: Stripe checkout URL

### create-cash-order
Creates order for cash payments (delivery or pickup).
- **Validates**: promo codes, pickup slot capacity
- **Actions**: Creates order + order items, creates print job, clears cart
- **Sends**: confirmation emails (customer + admin)
- **Rate limit**: 20 requests/60s per IP

### complete-stripe-order
Finalizes order after successful Stripe payment.
- **Verifies**: payment status, session completion
- **Actions**: Fetches cart items, creates order + items, creates print job, clears cart
- **Sends**: confirmation emails
- **Handles**: Both delivery and pickup orders

## Printer System

### printer-create-job
Admin-only. Creates print job for a specific order.
- **Auth**: JWT + admin role check

### printer-get-jobs
Fetches pending print jobs with full order details.
- **Auth**: API key via `x-printer-api-key` header
- **Returns**: Job info with customer, items, delivery/pickup details
- **Order**: Creation order (FIFO)

### printer-claim-job
Printer marks job as claimed/processing.
- **Auth**: API key
- **Updates**: `claimed_at` timestamp, status to 'claimed'

### printer-ack-job
Printer acknowledges job completion.
- **Auth**: API key
- **Updates**: `printed_at` timestamp, status to 'printed'

## Email Notifications

### send-contact-email
Handles contact form submissions.
- **Rate limit**: 30 req/60s per IP, 5 req/hr per email
- **Detects**: catering requests in subject/message
- **Sends**: Formatted HTML emails (admin + customer confirmation)
- **Service**: Resend

### send-order-status-email
Sends order status update emails to customers.
- Template-based for different order states.

### send-lunchbox-subscription-email
Sends lunch box subscription and delivery schedule confirmations.

### send-pickup-reminder
Sends reminder emails 1 hour before pickup time.
- **Updates**: `pickup_reminder_sent_at` timestamp

### send-password-reset
Sends password reset emails via Resend.

## Admin Operations

### admin-get-orders
Admin-only. Lists all orders with filters.
- **Auth**: JWT + admin role

### admin-get-subscriptions
Admin-only. Lists lunch box subscriptions.
- **Auth**: JWT + admin role

### admin-update-order
Admin-only. Updates order status, fulfillment info, payment details.
- **Auth**: JWT + admin role

## Delivery & Location

### calculate-delivery-distance
Calculates distance from store to delivery address.
- **Returns**: Distance and delivery fee based on configured zones

### check-pickup-reminders
Scheduled function. Finds orders needing pickup reminders.
- **Triggers**: 1 hour before pickup time

## TikTok Integration

### fetch-tiktok-videos
Scrapes TikTok profile @spiceandslicedfw for videos.
- **API**: tikwm.com for video data
- **Fetches**: Top 10 videos with metadata (title, thumbnail, duration, views, likes)
- **Gets**: Direct MP4 URLs or oEmbed fallback
- **Actions**: Inserts new videos, updates existing, creates sync log

### refresh-tiktok-video
Scheduled task. Refreshes expired video URLs.
- **Why**: tikwm.com URLs expire after ~2 hours
- **Runs**: Every 90 minutes (via GitHub Actions workflow)
- **Filters**: Videos older than 1.5 hours
- **Rate limit**: 500ms between requests

## Rate Limiting

### api-rate-limiter
Shared rate-limiting utilities used by other functions.
- IP-based limiting
- Email-based limiting

## CI/CD Integration

### GitHub Actions: refresh-tiktok-videos.yml
- **Schedule**: Every 90 minutes
- **Action**: Calls `refresh-tiktok-video` edge function
- **Secrets**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`

# Pickup Reminder System Setup

## Overview

The pickup reminder system automatically sends emails to customers 1 hour before their scheduled pickup window.

## Components

### 1. Database Migration

File: `supabase/migrations/20251224000001_add_pickup_reminder_fields.sql`

- Adds `pickup_reminder_sent_at` and `pickup_reminder_scheduled_for` columns to orders table
- Creates index for efficient querying

**To apply:**

```bash
supabase db push
```

### 2. Edge Functions

#### send-pickup-reminder

File: `supabase/functions/send-pickup-reminder/index.ts`

- Sends pickup reminder email to customer
- Updates `pickup_reminder_sent_at` timestamp
- Includes order details, pickup window, store location, and items

#### check-pickup-reminders

File: `supabase/functions/check-pickup-reminders/index.ts`

- Runs every 30 minutes via cron
- Queries orders needing reminders
- Calls send-pickup-reminder for each eligible order

**To deploy:**

```bash
supabase functions deploy send-pickup-reminder
supabase functions deploy check-pickup-reminders
```

### 3. Cron Configuration

**Option A: Supabase Dashboard (Recommended)**

1. Go to Supabase Dashboard → Edge Functions
2. Select `check-pickup-reminders` function
3. Click "Enable Cron" or "Add Cron Schedule"
4. Set schedule: `*/30 * * * *` (every 30 minutes)
5. Save

**Option B: Using Supabase CLI**
The cron schedule can be configured via the Supabase dashboard or by adding to your project's configuration.

**Option C: pg_cron (Alternative)**
If you prefer using PostgreSQL's pg_cron extension instead:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the checker to run every 30 minutes
SELECT cron.schedule(
  'check-pickup-reminders',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/check-pickup-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

## How It Works

### Order Creation

When a pickup order is created:

1. `create-cash-order` or `complete-stripe-order` calculates reminder time
2. Sets `pickup_reminder_scheduled_for` = pickup window start - 1 hour
3. Order is saved with this timestamp

### Reminder Sending

Every 30 minutes, `check-pickup-reminders`:

1. Queries orders where:
   - `fulfillment_type = 'pickup'`
   - `fulfillment_status IN ('confirmed', 'preparing')`
   - `pickup_reminder_sent_at IS NULL`
   - `pickup_reminder_scheduled_for <= now() + 2 hours`
2. For each order, calls `send-pickup-reminder`
3. Email is sent with:
   - Pickup date and time window
   - Store address with Google Maps link
   - Order items and total
   - Order details link
4. Updates `pickup_reminder_sent_at` timestamp

### Edge Cases

- **Last-minute orders**: If order is placed less than 1 hour before pickup, reminder is sent immediately on next cron run
- **Pickup time changes**: Reset `pickup_reminder_sent_at` to NULL and recalculate `pickup_reminder_scheduled_for` (manual admin update for now)
- **Cancelled orders**: No reminder sent (query filters by status)

## Email Template

- **Subject**: "Pickup Reminder - Order #XXXXXXXX"
- **Color Theme**: Orange (#f97316)
- **Includes**:
  - Pickup date (formatted: "Monday, December 24, 2025")
  - Time window (e.g., "2:00 PM - 4:00 PM")
  - Store location: 7451 N Beach St #172, Fort Worth, TX 76137
  - Google Maps direction link
  - Order items with quantities and prices
  - Total amount
  - Contact info: (682) 255-5004, spiceandslicedfw@gmail.com
  - CTA button to view order details

## Testing

### Test the send-pickup-reminder function:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/send-pickup-reminder \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "your-order-id"}'
```

### Test the check-pickup-reminders function:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/check-pickup-reminders \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Manual testing:

1. Create a pickup order with pickup time 1-2 hours from now
2. Check that `pickup_reminder_scheduled_for` is set correctly
3. Wait for cron to run (or manually invoke check-pickup-reminders)
4. Verify email is received
5. Check that `pickup_reminder_sent_at` is updated

## Monitoring

### Check logs in Supabase Dashboard:

1. Go to Edge Functions → Logs
2. Filter by function name
3. Look for:
   - "Checking for orders needing pickup reminders..."
   - "Found X order(s) needing reminders"
   - "Successfully sent reminder for order..."

### Query orders pending reminders:

```sql
SELECT
  id,
  pickup_date,
  pickup_time,
  pickup_reminder_scheduled_for,
  pickup_reminder_sent_at,
  fulfillment_status
FROM orders
WHERE fulfillment_type = 'pickup'
  AND pickup_reminder_sent_at IS NULL
  AND pickup_date >= CURRENT_DATE
ORDER BY pickup_reminder_scheduled_for;
```

## Environment Variables Required

- `RESEND_API_KEY` - For sending emails
- `SUPABASE_URL` - Auto-provided
- `SUPABASE_ANON_KEY` - Auto-provided
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-provided

All should already be configured in your Supabase project.

## Future Enhancements

- [ ] Admin interface to manually trigger reminders
- [ ] Support for rescheduled pickups (auto-reset reminder)
- [ ] Multiple reminder stages (24h, 1h, arrived)
- [ ] SMS reminders via Twilio
- [ ] Customer preference for reminder timing

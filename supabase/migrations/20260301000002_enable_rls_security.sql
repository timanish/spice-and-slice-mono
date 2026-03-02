-- =============================================================================
-- Phase 5: Enable Row Level Security on all tables
-- =============================================================================
-- DEPLOY LAST — only after all edge functions and frontend updates are verified.
--
-- Strategy:
--   Public-read tables: anon can SELECT, all writes blocked (go through admin-crud)
--   Service-role-only tables: all access revoked for anon/authenticated (go through
--     user-data or admin-crud edge functions using service_role key)
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- A. Public-read tables — anon can SELECT, writes revoked
-- ---------------------------------------------------------------------------
-- These tables contain non-sensitive catalog, marketing, and configuration data.
-- The frontend reads them directly via the anon supabase client.
-- All writes go through the admin-crud edge function (service_role).

DO $$
DECLARE
  t TEXT;
  public_tables TEXT[] := ARRAY[
    'products',
    'categories',
    'collections',
    'menu_items',
    'hero_slides',
    'testimonials',
    'festivals',
    'festival_products',
    'recipes',
    'recipe_products',
    'flash_deals',
    'featured_products',
    'delivery_zones',
    'delivery_time_slots',
    'delivery_settings',
    'pickup_settings',
    'pickup_slots',
    'promo_codes',
    'tiktok_videos',
    'tiktok_video_products'
  ];
BEGIN
  FOREACH t IN ARRAY public_tables LOOP
    -- Enable RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- Allow anon SELECT
    EXECUTE format(
      'CREATE POLICY "anon_select" ON public.%I FOR SELECT TO anon USING (true)',
      t
    );

    -- Also allow authenticated SELECT (for logged-in users browsing)
    EXECUTE format(
      'CREATE POLICY "authenticated_select" ON public.%I FOR SELECT TO authenticated USING (true)',
      t
    );

    -- Block all writes from anon and authenticated roles
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON public.%I FROM anon, authenticated', t);
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- B. Service-role-only tables — no anon/authenticated access at all
-- ---------------------------------------------------------------------------
-- These contain sensitive user data, orders, and subscriptions.
-- All access goes through edge functions (user-data, admin-crud, create-checkout,
-- create-cash-order, clerk-webhook) using the service_role key.

DO $$
DECLARE
  t TEXT;
  restricted_tables TEXT[] := ARRAY[
    'profiles',
    'user_roles',
    'user_addresses',
    'carts',
    'cart_items',
    'orders',
    'order_items',
    'catering_requests',
    'lunch_box_subscriptions',
    'lunch_box_deliveries',
    'lunch_box_notifications',
    'print_jobs'
  ];
BEGIN
  FOREACH t IN ARRAY restricted_tables LOOP
    -- Enable RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- Revoke all access from anon and authenticated
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- C. Revoke access to sensitive RPC functions
-- ---------------------------------------------------------------------------
-- These functions bypass RLS via SECURITY DEFINER and accept arbitrary user IDs.
-- After this migration, admin role checks go through edge functions with JWT verification.

REVOKE EXECUTE ON FUNCTION public.has_role(TEXT, TEXT) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_profile_access(TEXT, TEXT) FROM anon, authenticated;

COMMIT;

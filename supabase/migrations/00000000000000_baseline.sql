


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."app_role" AS ENUM (
    'admin',
    'user'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_generate_subscription_deliveries"("p_subscription_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_subscription_type TEXT;
  v_start_date DATE;
  v_end_date DATE;
  v_current_date DATE;
  v_days_to_generate INTEGER;
  v_generated_count INTEGER := 0;
BEGIN
  -- Get subscription details
  SELECT subscription_type, start_date
  INTO v_subscription_type, v_start_date
  FROM lunch_box_subscriptions
  WHERE id = p_subscription_id;

  -- If subscription not found, return 0
  IF v_subscription_type IS NULL THEN
    RETURN 0;
  END IF;

  -- Determine how many days to generate based on subscription type
  IF v_subscription_type = 'weekly' THEN
    v_days_to_generate := 14; -- 2 weeks ahead
  ELSIF v_subscription_type = 'monthly' THEN
    v_days_to_generate := 30; -- 30 days ahead
  ELSE
    -- Custom plans handle their own delivery generation
    RETURN 0;
  END IF;

  -- Set start date to today or subscription start date (whichever is later)
  v_current_date := GREATEST(CURRENT_DATE, v_start_date);
  v_end_date := v_current_date + v_days_to_generate;

  -- Loop through date range and create delivery records for weekdays only
  WHILE v_current_date <= v_end_date LOOP
    -- Only create for weekdays (Monday = 1 to Friday = 5)
    IF EXTRACT(ISODOW FROM v_current_date) BETWEEN 1 AND 5 THEN
      -- Insert delivery record if it doesn't already exist
      INSERT INTO lunch_box_deliveries (
        subscription_id,
        delivery_date,
        status,
        scheduled_time
      )
      VALUES (
        p_subscription_id,
        v_current_date,
        'scheduled',
        '12:00:00'
      )
      ON CONFLICT (subscription_id, delivery_date) DO NOTHING;
      
      -- Count successful inserts
      IF FOUND THEN
        v_generated_count := v_generated_count + 1;
      END IF;
    END IF;

    -- Move to next day
    v_current_date := v_current_date + 1;
  END LOOP;

  -- Update subscription's next_delivery_date
  UPDATE lunch_box_subscriptions
  SET next_delivery_date = (
    SELECT MIN(delivery_date)
    FROM lunch_box_deliveries
    WHERE subscription_id = p_subscription_id
      AND delivery_date >= CURRENT_DATE
      AND status IN ('scheduled', 'out_for_delivery')
  )
  WHERE id = p_subscription_id;

  RETURN v_generated_count;
END;
$$;


ALTER FUNCTION "public"."auto_generate_subscription_deliveries"("p_subscription_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."auto_generate_subscription_deliveries"("p_subscription_id" "uuid") IS 'Auto-generates delivery records for weekly (14 days) and monthly (30 days) subscriptions. Skips weekends and avoids duplicates.';



CREATE OR REPLACE FUNCTION "public"."bulk_generate_missing_deliveries"() RETURNS TABLE("subscription_id" "uuid", "generated_count" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    auto_generate_subscription_deliveries(s.id)
  FROM lunch_box_subscriptions s
  WHERE s.status = 'active'
    AND s.subscription_type IN ('weekly', 'monthly');
END;
$$;


ALTER FUNCTION "public"."bulk_generate_missing_deliveries"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."bulk_generate_missing_deliveries"() IS 'Generates missing delivery records for all active weekly/monthly subscriptions.';



CREATE OR REPLACE FUNCTION "public"."calculate_next_delivery_date"("p_subscription_id" "uuid") RETURNS "date"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  next_date DATE;
  sub_start_date DATE;
BEGIN
  -- Get subscription start date
  SELECT start_date INTO sub_start_date
  FROM lunch_box_subscriptions
  WHERE id = p_subscription_id;
  
  -- Find next delivery date that is >= start_date and >= today
  SELECT delivery_date INTO next_date
  FROM lunch_box_deliveries
  WHERE subscription_id = p_subscription_id
    AND delivery_date >= GREATEST(CURRENT_DATE, sub_start_date)
    AND status IN ('scheduled', 'out_for_delivery')
  ORDER BY delivery_date ASC
  LIMIT 1;
  
  RETURN next_date;
END;
$$;


ALTER FUNCTION "public"."calculate_next_delivery_date"("p_subscription_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_next_delivery_date"("p_subscription_id" "uuid") IS 'Calculates the next scheduled delivery date for a subscription, respecting start_date';



CREATE OR REPLACE FUNCTION "public"."check_product_inventory"("product_id" "uuid", "requested_quantity" numeric) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  product_record RECORD;
BEGIN
  SELECT * INTO product_record FROM public.products WHERE id = product_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- If not tracking inventory, always return true
  IF NOT product_record.track_inventory THEN
    RETURN TRUE;
  END IF;
  
  -- Check based on whether product is weight-based or count-based
  IF product_record.is_weighted THEN
    RETURN product_record.inventory_weight >= requested_quantity;
  ELSE
    RETURN product_record.inventory_count >= requested_quantity;
  END IF;
END;
$$;


ALTER FUNCTION "public"."check_product_inventory"("product_id" "uuid", "requested_quantity" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_guest_profile"("_real_user_id" "text", "_clerk_email" "text") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  guest_row         public.profiles%ROWTYPE;
  orders_moved      INTEGER := 0;
  moved_this        INTEGER;
  normalized_email  TEXT;
BEGIN
  IF _real_user_id IS NULL OR _clerk_email IS NULL OR _clerk_email = '' THEN
    RAISE EXCEPTION 'real_user_id and clerk_email are required';
  END IF;

  normalized_email := LOWER(TRIM(_clerk_email));

  FOR guest_row IN
    SELECT *
    FROM public.profiles
    WHERE is_guest = TRUE
      AND claimed_clerk_id IS NULL
      AND LOWER(email) = normalized_email
      AND id <> _real_user_id
  LOOP
    UPDATE public.profiles
    SET email = NULL, updated_at = NOW()
    WHERE id = guest_row.id;

    INSERT INTO public.profiles (id, email, is_guest, onboarding_shown)
    VALUES (_real_user_id, normalized_email, FALSE, FALSE)
    ON CONFLICT (id) DO UPDATE
      SET email      = EXCLUDED.email,
          updated_at = NOW();

    UPDATE public.orders
    SET user_id = _real_user_id
    WHERE user_id = guest_row.id;
    GET DIAGNOSTICS moved_this = ROW_COUNT;
    orders_moved := orders_moved + moved_this;

    UPDATE public.user_addresses
    SET user_id = _real_user_id
    WHERE user_id = guest_row.id;

    UPDATE public.profiles
    SET is_guest         = FALSE,
        claimed_clerk_id = _real_user_id,
        claimed_at       = NOW(),
        updated_at       = NOW()
    WHERE id = guest_row.id;
  END LOOP;

  -- Safety net for callers with no guest match: make sure the real profile
  -- still exists. Handles rare cases where autoCreateProfile failed for
  -- reasons unrelated to a guest email collision.
  INSERT INTO public.profiles (id, email, is_guest, onboarding_shown)
  VALUES (_real_user_id, normalized_email, FALSE, FALSE)
  ON CONFLICT (id) DO NOTHING;

  RETURN orders_moved;
END;
$$;


ALTER FUNCTION "public"."claim_guest_profile"("_real_user_id" "text", "_clerk_email" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."claim_guest_profile"("_real_user_id" "text", "_clerk_email" "text") IS 'Atomically reparents guest orders/addresses onto a Clerk profile and marks the guest row claimed. Called by claim-guest-profile edge function.';



CREATE OR REPLACE FUNCTION "public"."deduct_product_inventory"("product_id" "uuid", "quantity" numeric) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  product_record RECORD;
BEGIN
  SELECT * INTO product_record FROM public.products WHERE id = product_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
  
  -- If not tracking inventory, just return success
  IF NOT product_record.track_inventory THEN
    RETURN TRUE;
  END IF;
  
  -- Deduct based on whether product is weight-based or count-based
  IF product_record.is_weighted THEN
    IF product_record.inventory_weight < quantity THEN
      RAISE EXCEPTION 'Insufficient inventory weight';
    END IF;
    
    UPDATE public.products 
    SET 
      inventory_weight = inventory_weight - quantity,
      updated_at = NOW()
    WHERE id = product_id;
  ELSE
    IF product_record.inventory_count < quantity THEN
      RAISE EXCEPTION 'Insufficient inventory count';
    END IF;
    
    UPDATE public.products 
    SET 
      inventory_count = inventory_count - quantity::INTEGER,
      updated_at = NOW()
    WHERE id = product_id;
  END IF;
  
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."deduct_product_inventory"("product_id" "uuid", "quantity" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_deliveries_for_subscription"("p_subscription_id" "uuid", "p_delivery_dates" "date"[]) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_delivery_date DATE;
BEGIN
  -- First, delete scheduled deliveries that are NOT in the new schedule
  -- Only delete 'scheduled' status to preserve delivery history
  DELETE FROM lunch_box_deliveries
  WHERE subscription_id = p_subscription_id
    AND status = 'scheduled'
    AND lunch_box_deliveries.delivery_date NOT IN (SELECT unnest(p_delivery_dates));
  
  -- Then, insert new delivery records (skip if already exists)
  FOREACH v_delivery_date IN ARRAY p_delivery_dates
  LOOP
    INSERT INTO lunch_box_deliveries (subscription_id, delivery_date, status)
    VALUES (p_subscription_id, v_delivery_date, 'scheduled')
    ON CONFLICT (subscription_id, delivery_date) 
    DO UPDATE SET 
      status = CASE 
        WHEN lunch_box_deliveries.status = 'scheduled' THEN 'scheduled'
        ELSE lunch_box_deliveries.status  -- Keep existing status for non-scheduled deliveries
      END;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."generate_deliveries_for_subscription"("p_subscription_id" "uuid", "p_delivery_dates" "date"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_deliveries_for_subscription"("p_subscription_id" "uuid", "p_delivery_dates" "date"[]) IS 'Updates delivery records for a subscription - removes old scheduled deliveries and adds new ones';



CREATE OR REPLACE FUNCTION "public"."get_category_product_stats"("category_id_param" "uuid") RETURNS TABLE("total_products" bigint, "active_products" bigint, "inactive_products" bigint, "manually_inactive" bigint, "auto_inactive" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_products,
    COUNT(*) FILTER (WHERE is_active = TRUE)::BIGINT as active_products,
    COUNT(*) FILTER (WHERE is_active = FALSE)::BIGINT as inactive_products,
    COUNT(*) FILTER (WHERE is_active = FALSE AND deactivated_by_category = FALSE)::BIGINT as manually_inactive,
    COUNT(*) FILTER (WHERE is_active = FALSE AND deactivated_by_category = TRUE)::BIGINT as auto_inactive
  FROM public.products
  WHERE category_id = category_id_param;
END;
$$;


ALTER FUNCTION "public"."get_category_product_stats"("category_id_param" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_category_product_stats"("category_id_param" "uuid") IS 'Returns statistics about products in a category: total, active, inactive (manual vs automatic)';



CREATE OR REPLACE FUNCTION "public"."handle_category_activation_cascade"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Check if is_active column changed
  IF NEW.is_active != OLD.is_active THEN
    
    IF NEW.is_active = FALSE THEN
      -- Category is being deactivated
      -- Deactivate all currently active products in this category
      UPDATE public.products
      SET 
        is_active = FALSE,
        deactivated_by_category = TRUE,
        updated_at = NOW()
      WHERE 
        category_id = NEW.id 
        AND is_active = TRUE;
      
      RAISE NOTICE 'Category % deactivated. Deactivated % products.', 
        NEW.name, 
        (SELECT COUNT(*) FROM public.products WHERE category_id = NEW.id AND is_active = FALSE AND deactivated_by_category = TRUE);
    
    ELSE
      -- Category is being reactivated
      -- Reactivate products that were automatically deactivated by category
      UPDATE public.products
      SET 
        is_active = TRUE,
        deactivated_by_category = FALSE,
        updated_at = NOW()
      WHERE 
        category_id = NEW.id 
        AND deactivated_by_category = TRUE;
      
      RAISE NOTICE 'Category % reactivated. Reactivated % products.', 
        NEW.name,
        (SELECT COUNT(*) FROM public.products WHERE category_id = NEW.id AND is_active = TRUE);
    
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_category_activation_cascade"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."restore_product_inventory"("product_id" "uuid", "quantity" numeric) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  product_record RECORD;
BEGIN
  SELECT * INTO product_record FROM public.products WHERE id = product_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
  
  -- If not tracking inventory, just return success
  IF NOT product_record.track_inventory THEN
    RETURN TRUE;
  END IF;
  
  -- Restore based on whether product is weight-based or count-based
  IF product_record.is_weighted THEN
    UPDATE public.products 
    SET 
      inventory_weight = inventory_weight + quantity,
      updated_at = NOW()
    WHERE id = product_id;
  ELSE
    UPDATE public.products 
    SET 
      inventory_count = inventory_count + quantity::INTEGER,
      updated_at = NOW()
    WHERE id = product_id;
  END IF;
  
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."restore_product_inventory"("product_id" "uuid", "quantity" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_promo_discount_value"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Sync discount_value and discount_type from the specific columns
  IF NEW.discount_percentage IS NOT NULL THEN
    NEW.discount_value := NEW.discount_percentage;
    NEW.discount_type := 'percentage';
    NEW.discount_amount := NULL;
  ELSIF NEW.discount_amount IS NOT NULL THEN
    NEW.discount_value := NEW.discount_amount;
    NEW.discount_type := 'amount';
    NEW.discount_percentage := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_promo_discount_value"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_collections_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."update_collections_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_delivery_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_delivery_settings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_delivery_time_slots_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_delivery_time_slots_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_featured_products_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."update_featured_products_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_festivals_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."update_festivals_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_flash_deals_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."update_flash_deals_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_hero_slides_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_hero_slides_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_lunch_box_deliveries_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_lunch_box_deliveries_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_lunch_box_subscriptions_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_lunch_box_subscriptions_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_recipes_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."update_recipes_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_testimonials_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."update_testimonials_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_tiktok_videos_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_tiktok_videos_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_tv_menu_boards_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_tv_menu_boards_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_promo_code"("_code" "text", "_user_id" "text", "_order_amount" numeric) RETURNS TABLE("valid" boolean, "discount" numeric, "promo_id" "uuid", "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  promo_record RECORD;
  calculated_discount NUMERIC;
  min_order NUMERIC;
BEGIN
  -- Normalize the code to lowercase for case-insensitive comparison
  _code := LOWER(TRIM(_code));
  
  -- Find the promo code
  SELECT *
  INTO promo_record
  FROM public.promo_codes
  WHERE LOWER(code) = _code
  LIMIT 1;
  
  -- Check if promo code exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, 'Promo code not found'::TEXT;
    RETURN;
  END IF;
  
  -- Check if promo code is active
  IF NOT promo_record.is_active THEN
    RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, 'Promo code is not active'::TEXT;
    RETURN;
  END IF;
  
  -- Check if promo code has started
  IF promo_record.start_date IS NOT NULL AND promo_record.start_date > NOW() THEN
    RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, 'Promo code has not started yet'::TEXT;
    RETURN;
  END IF;
  
  -- Check if promo code has expired
  IF promo_record.end_date IS NOT NULL AND promo_record.end_date < NOW() THEN
    RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, 'Promo code has expired'::TEXT;
    RETURN;
  END IF;
  
  -- Check minimum order amount (support both column names)
  min_order := COALESCE(promo_record.minimum_order_amount, promo_record.min_order_amount);
  IF min_order IS NOT NULL AND _order_amount < min_order THEN
    RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, 
      FORMAT('Minimum order amount of $%s required', min_order)::TEXT;
    RETURN;
  END IF;
  
  -- Check if max uses has been reached
  IF promo_record.max_uses IS NOT NULL AND promo_record.current_uses >= promo_record.max_uses THEN
    RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, 'Promo code has reached maximum uses'::TEXT;
    RETURN;
  END IF;
  
  -- Calculate discount (prefer the specific columns over discount_value)
  IF promo_record.discount_percentage IS NOT NULL THEN
    calculated_discount := (_order_amount * promo_record.discount_percentage / 100.0);
  ELSIF promo_record.discount_amount IS NOT NULL THEN
    calculated_discount := promo_record.discount_amount;
  ELSIF promo_record.discount_type = 'percentage' AND promo_record.discount_value IS NOT NULL THEN
    calculated_discount := (_order_amount * promo_record.discount_value / 100.0);
  ELSIF promo_record.discount_type = 'amount' AND promo_record.discount_value IS NOT NULL THEN
    calculated_discount := promo_record.discount_value;
  ELSE
    calculated_discount := 0;
  END IF;
  
  -- Ensure discount doesn't exceed order amount
  calculated_discount := LEAST(calculated_discount, _order_amount);
  
  -- Return valid result
  RETURN QUERY SELECT 
    true, 
    calculated_discount, 
    promo_record.id, 
    'Promo code applied successfully'::TEXT;
END;
$_$;


ALTER FUNCTION "public"."validate_promo_code"("_code" "text", "_user_id" "text", "_order_amount" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_promo_code"("_code" "text", "_user_id" "text", "_order_amount" numeric) IS 'Validates a promo code and calculates the discount amount. Supports both discount_percentage/discount_amount and discount_type/discount_value column sets.';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_message_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "body" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_message_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cart_combo_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cart_id" "uuid" NOT NULL,
    "combo_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "selected_addon_ids" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cart_combo_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cart_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cart_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "weight" numeric(10,3),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "discount_percentage" numeric DEFAULT 0,
    "flash_deal_id" "uuid"
);


ALTER TABLE "public"."cart_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."cart_items" IS 'RLS DISABLED: Using Clerk authentication with application-layer authorization.
Cart items are secured by joining with carts table and filtering by user_id.
All cart operations MUST filter by the authenticated user''s cart ID.';



COMMENT ON COLUMN "public"."cart_items"."discount_percentage" IS 'Discount percentage applied to this cart item (e.g., 20 for 20% off)';



COMMENT ON COLUMN "public"."cart_items"."flash_deal_id" IS 'Reference to flash deal if item was added during a flash sale';



CREATE TABLE IF NOT EXISTS "public"."carts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."carts" OWNER TO "postgres";


COMMENT ON TABLE "public"."carts" IS 'RLS DISABLED: Using Clerk authentication with application-layer authorization. 
All queries MUST filter by user_id matching the Clerk user ID.
Security is enforced by:
1. Clerk validates user identity
2. Application code filters all queries by authenticated user ID
3. Webhook (service role) creates user records on signup';



CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "display_order" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tax_rate" numeric(5,4),
    "is_active" boolean DEFAULT true,
    "priority" integer DEFAULT 0,
    "shippable_nationwide" boolean DEFAULT false,
    "show_on_website" boolean DEFAULT true,
    CONSTRAINT "categories_priority_check" CHECK ((("priority" >= 0) AND ("priority" <= 10))),
    CONSTRAINT "categories_tax_rate_check" CHECK ((("tax_rate" IS NULL) OR (("tax_rate" >= (0)::numeric) AND ("tax_rate" <= (1)::numeric))))
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."categories" IS 'Product categories with tax rates and display settings';



COMMENT ON COLUMN "public"."categories"."name" IS 'Unique category name';



COMMENT ON COLUMN "public"."categories"."description" IS 'Optional category description';



COMMENT ON COLUMN "public"."categories"."display_order" IS 'Order for displaying categories (lower = first)';



COMMENT ON COLUMN "public"."categories"."tax_rate" IS 'Default tax rate for this category (0-1 decimal). Can be overridden at product level.';



COMMENT ON COLUMN "public"."categories"."is_active" IS 'Whether category is active and visible in dropdowns';



COMMENT ON COLUMN "public"."categories"."priority" IS 'Category display priority (0-10). Higher number = shown first. Used as tiebreaker when product priorities are equal.';



COMMENT ON COLUMN "public"."categories"."shippable_nationwide" IS 'Default shipping eligibility for products in this category. TRUE = products can ship nationwide.';



COMMENT ON COLUMN "public"."categories"."show_on_website" IS 'When false, category and its items are hidden from the customer website but still available for TV menu boards.';



CREATE TABLE IF NOT EXISTS "public"."catering_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "guest_count" integer NOT NULL,
    "event_type" "text" NOT NULL,
    "event_date" "text" NOT NULL,
    "event_time" "text" NOT NULL,
    "venue" "text" NOT NULL,
    "dietary_restrictions" "text",
    "additional_info" "text",
    "selected_items" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    CONSTRAINT "catering_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."catering_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."collections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "image_url" "text" NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "category_id" "uuid"
);


ALTER TABLE "public"."collections" OWNER TO "postgres";


COMMENT ON TABLE "public"."collections" IS 'RLS disabled. Admin-only table. Authentication and authorization handled by Clerk at application layer.';



CREATE TABLE IF NOT EXISTS "public"."combo_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "combo_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" numeric DEFAULT 1 NOT NULL,
    "weight" numeric,
    "is_addon" boolean DEFAULT false,
    "addon_price" numeric,
    "position" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."combo_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "order_id" "uuid",
    "template_id" "uuid" NOT NULL,
    "subject" "text" NOT NULL,
    "message_body" "text" NOT NULL,
    "sent_at" timestamp with time zone,
    "sent_by_user_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."customer_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."delivery_settings" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "description" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."delivery_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."delivery_settings" IS 'Global delivery system settings';



CREATE TABLE IF NOT EXISTS "public"."delivery_time_slots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "start_hour" integer NOT NULL,
    "start_minute" integer DEFAULT 0 NOT NULL,
    "end_hour" integer NOT NULL,
    "end_minute" integer DEFAULT 0 NOT NULL,
    "label" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "display_order" integer NOT NULL,
    "day_of_week" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "delivery_time_slots_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6))),
    CONSTRAINT "delivery_time_slots_end_hour_check" CHECK ((("end_hour" >= 0) AND ("end_hour" <= 23))),
    CONSTRAINT "delivery_time_slots_end_minute_check" CHECK ((("end_minute" >= 0) AND ("end_minute" <= 59))),
    CONSTRAINT "delivery_time_slots_start_hour_check" CHECK ((("start_hour" >= 0) AND ("start_hour" <= 23))),
    CONSTRAINT "delivery_time_slots_start_minute_check" CHECK ((("start_minute" >= 0) AND ("start_minute" <= 59)))
);


ALTER TABLE "public"."delivery_time_slots" OWNER TO "postgres";


COMMENT ON TABLE "public"."delivery_time_slots" IS 'Dynamic delivery time slots configuration';



COMMENT ON COLUMN "public"."delivery_time_slots"."day_of_week" IS 'NULL = all days, 0 = Sunday, 1 = Monday, ..., 6 = Saturday';



CREATE TABLE IF NOT EXISTS "public"."delivery_zones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "zone_name" "text" NOT NULL,
    "min_distance" numeric(10,2) NOT NULL,
    "max_distance" numeric(10,2) NOT NULL,
    "free_shipping_threshold" numeric(10,2) NOT NULL,
    "delivery_fee" numeric(10,2) NOT NULL,
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."delivery_zones" OWNER TO "postgres";


COMMENT ON TABLE "public"."delivery_zones" IS 'Configuration for distance-based delivery zones and fees. Updated 2025-12-19: Zone 0 (0-5 miles) and Zone 1 (5-10 miles) both now charge $5.99 with free shipping above $100';



CREATE TABLE IF NOT EXISTS "public"."featured_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."featured_products" OWNER TO "postgres";


COMMENT ON TABLE "public"."featured_products" IS 'RLS disabled. Admin-only table. Authentication and authorization handled by Clerk at application layer.';



CREATE TABLE IF NOT EXISTS "public"."festival_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "festival_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."festival_products" OWNER TO "postgres";


COMMENT ON TABLE "public"."festival_products" IS 'RLS disabled. Admin-only table. Authentication and authorization handled by Clerk at application layer.';



CREATE TABLE IF NOT EXISTS "public"."festivals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone NOT NULL,
    "banner_image" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."festivals" OWNER TO "postgres";


COMMENT ON TABLE "public"."festivals" IS 'RLS disabled. Admin-only table. Authentication and authorization handled by Clerk at application layer.';



CREATE TABLE IF NOT EXISTS "public"."flash_deals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "discount_percentage" integer NOT NULL,
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "flash_deals_discount_percentage_check" CHECK ((("discount_percentage" > 0) AND ("discount_percentage" <= 100)))
);


ALTER TABLE "public"."flash_deals" OWNER TO "postgres";


COMMENT ON TABLE "public"."flash_deals" IS 'RLS disabled. Admin-only table. Authentication and authorization handled by Clerk at application layer.';



CREATE TABLE IF NOT EXISTS "public"."guest_order_rate_limits" (
    "ip" "text" NOT NULL,
    "attempts" integer DEFAULT 1 NOT NULL,
    "first_attempt_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_attempt_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."guest_order_rate_limits" OWNER TO "postgres";


COMMENT ON TABLE "public"."guest_order_rate_limits" IS 'RLS DISABLED - Edge-function only. Rolling-window rate limits for guest checkout per IP.';



CREATE TABLE IF NOT EXISTS "public"."hero_slides" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "sub_description" "text",
    "image_url" "text" NOT NULL,
    "button_text" "text",
    "button_link" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."hero_slides" OWNER TO "postgres";


COMMENT ON TABLE "public"."hero_slides" IS 'Hero carousel slides for the home page.
SECURITY MODEL: RLS is disabled because we use Clerk (not Supabase Auth).
- Authentication: Handled by Clerk
- Authorization: Admin-only operations enforced in application code via AdminGuard
- Frontend: Uses anon key but admin routes protected by Clerk role checks
- Public read access: All users can view active slides (no auth required)
- Admin write access: Protected by AdminGuard component in application layer
This follows the same pattern as other admin-managed tables in the Clerk + Supabase integration.';



CREATE TABLE IF NOT EXISTS "public"."lunch_box_deliveries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subscription_id" "uuid" NOT NULL,
    "delivery_date" "date" NOT NULL,
    "menu_item_id" "uuid",
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "scheduled_time" time without time zone DEFAULT '12:00:00'::time without time zone,
    "delivered_at" timestamp with time zone,
    "driver_notes" "text",
    "customer_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "lunch_box_deliveries_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'out_for_delivery'::"text", 'delivered'::"text", 'skipped'::"text", 'cancelled'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."lunch_box_deliveries" OWNER TO "postgres";


COMMENT ON TABLE "public"."lunch_box_deliveries" IS 'Tracks individual lunch box deliveries for granular status tracking';



COMMENT ON COLUMN "public"."lunch_box_deliveries"."menu_item_id" IS 'What menu item is being served on this delivery day (set by admin)';



COMMENT ON COLUMN "public"."lunch_box_deliveries"."status" IS 'Current status of the delivery';



COMMENT ON COLUMN "public"."lunch_box_deliveries"."scheduled_time" IS 'Scheduled delivery time (default 12:00 PM)';



CREATE TABLE IF NOT EXISTS "public"."lunch_box_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "subscription_id" "uuid",
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "read_at" timestamp with time zone,
    CONSTRAINT "lunch_box_notifications_type_check" CHECK (("type" = ANY (ARRAY['delivery_reminder'::"text", 'subscription_ending'::"text"])))
);


ALTER TABLE "public"."lunch_box_notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."lunch_box_notifications" IS 'In-app notifications for lunch box subscription events';



CREATE TABLE IF NOT EXISTS "public"."lunch_box_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "subscription_type" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "start_date" "date" NOT NULL,
    "next_delivery_date" "date",
    "company" "text" NOT NULL,
    "address_line1" "text" NOT NULL,
    "address_line2" "text",
    "city" "text" NOT NULL,
    "state" "text" NOT NULL,
    "postal_code" "text" NOT NULL,
    "delivery_instructions" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "cancelled_at" timestamp with time zone,
    "paused_at" timestamp with time zone,
    "delivery_schedule" "jsonb" DEFAULT '[]'::"jsonb",
    "total_delivery_days" integer,
    "price_per_day" numeric(10,2),
    "total_price" numeric(10,2),
    "end_date" "date",
    "stripe_session_id" "text",
    CONSTRAINT "lunch_box_subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'paused'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "lunch_box_subscriptions_subscription_type_check" CHECK (("subscription_type" = ANY (ARRAY['weekly'::"text", 'monthly'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."lunch_box_subscriptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."lunch_box_subscriptions" IS 'Stores lunch box delivery subscription information for users';



COMMENT ON COLUMN "public"."lunch_box_subscriptions"."user_id" IS 'Clerk user ID';



COMMENT ON COLUMN "public"."lunch_box_subscriptions"."subscription_type" IS 'weekly or monthly subscription plan';



COMMENT ON COLUMN "public"."lunch_box_subscriptions"."status" IS 'active, paused, or cancelled';



COMMENT ON COLUMN "public"."lunch_box_subscriptions"."next_delivery_date" IS 'Next scheduled delivery date (auto-updated)';



COMMENT ON COLUMN "public"."lunch_box_subscriptions"."delivery_schedule" IS 'Array of selected delivery dates for custom plans (JSONB array of date strings)';



COMMENT ON COLUMN "public"."lunch_box_subscriptions"."total_delivery_days" IS 'Total number of delivery days for custom plans (5-30)';



COMMENT ON COLUMN "public"."lunch_box_subscriptions"."price_per_day" IS 'Price per delivery day (set by admin for custom plans)';



COMMENT ON COLUMN "public"."lunch_box_subscriptions"."total_price" IS 'Total subscription price (calculated or set by admin)';



CREATE TABLE IF NOT EXISTS "public"."menu_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "description" "text",
    "image_url" "text",
    "is_available" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "lunch_box_eligible" boolean DEFAULT false,
    "sub_category" "text",
    "is_vegetarian" boolean,
    "is_spicy" boolean,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "category_id" "uuid",
    "serves_people" integer
);


ALTER TABLE "public"."menu_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."menu_items" IS 'Menu items table - matches MenuItem interface in src/hooks/products/types.ts';



COMMENT ON COLUMN "public"."menu_items"."sub_category" IS 'Menu item sub-category';



COMMENT ON COLUMN "public"."menu_items"."is_vegetarian" IS 'Whether the item is vegetarian';



COMMENT ON COLUMN "public"."menu_items"."is_spicy" IS 'Whether the item is spicy';



COMMENT ON COLUMN "public"."menu_items"."updated_at" IS 'Last update timestamp';



COMMENT ON COLUMN "public"."menu_items"."serves_people" IS 'Number of people that one tray of this menu item serves';



CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" numeric(10,3) NOT NULL,
    "price_per_unit" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tax_rate" numeric(5,4),
    "tax_amount" numeric(10,2) DEFAULT 0,
    "combo_id" "uuid",
    "combo_name" "text",
    "original_quantity" numeric(10,3),
    "original_product_id" "uuid",
    "original_product_name" "text",
    "is_addon" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


COMMENT ON COLUMN "public"."order_items"."tax_rate" IS 'Tax rate applied to this item at order time (historical record)';



COMMENT ON COLUMN "public"."order_items"."tax_amount" IS 'Tax amount for this specific order item';



COMMENT ON COLUMN "public"."order_items"."original_quantity" IS 'Quantity as originally placed by customer; admin may adjust quantity column during order review';



COMMENT ON COLUMN "public"."order_items"."original_product_id" IS 'Product ID as originally ordered by customer; admin may substitute during order review';



COMMENT ON COLUMN "public"."order_items"."original_product_name" IS 'Name snapshot of original product (prevents join queries in confirmation email)';



CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "total_amount" numeric(10,2) NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "payment_method" "text" NOT NULL,
    "fulfillment_type" "text" DEFAULT 'delivery'::"text" NOT NULL,
    "promo_code_id" "uuid",
    "discount_amount" numeric(10,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "payment_status" "text" DEFAULT 'pending'::"text",
    "fulfillment_status" "text" DEFAULT 'pending'::"text",
    "stripe_session_id" "text",
    "cancelled_at" timestamp with time zone,
    "delivery_fee" numeric(10,2) DEFAULT 0,
    "delivery_distance" numeric(10,2),
    "delivery_zone" "text",
    "pickup_ready_at" timestamp with time zone,
    "tax_amount" numeric(10,2) DEFAULT 0,
    "taxable_amount" numeric(10,2) DEFAULT 0,
    "estimated_delivery_time" timestamp with time zone,
    "pickup_date" "date",
    "pickup_time" "text",
    "delivery_date" "date",
    "delivery_time" "text",
    "address_id" "uuid",
    "pickup_reminder_sent_at" timestamp with time zone,
    "pickup_reminder_scheduled_for" timestamp with time zone,
    "delivery_address_line1" "text",
    "delivery_city" "text",
    "delivery_state" "text",
    "delivery_postal_code" "text",
    "delivery_address_label" "text",
    "card_last4" "text",
    "card_brand" "text",
    "card_exp_month" integer,
    "card_exp_year" integer,
    "confirmation_token" "text",
    "confirmation_token_expires_at" timestamp with time zone,
    "customer_notes" "text",
    "guest_tracking_token" "text",
    CONSTRAINT "fulfillment_status_check" CHECK (("fulfillment_status" = ANY (ARRAY['pending'::"text", 'pending_review'::"text", 'awaiting_customer_confirmation'::"text", 'confirmed'::"text", 'preparing'::"text", 'out_for_delivery'::"text", 'delivered'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "orders_fulfillment_type_check" CHECK (("fulfillment_type" = ANY (ARRAY['delivery'::"text", 'pickup'::"text", 'nationwide'::"text"]))),
    CONSTRAINT "payment_status_check" CHECK (("payment_status" = ANY (ARRAY['pending'::"text", 'completed'::"text", 'failed'::"text", 'refunded'::"text"])))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


COMMENT ON TABLE "public"."orders" IS 'RLS DISABLED - Using Clerk auth with application-layer authorization';



COMMENT ON COLUMN "public"."orders"."user_id" IS 'User ID from Clerk authentication (text format: user_xxxxx)';



COMMENT ON COLUMN "public"."orders"."fulfillment_type" IS 'Whether order is for delivery, pickup, or nationwide shipping';



COMMENT ON COLUMN "public"."orders"."payment_status" IS 'Payment status: pending, completed, failed, refunded';



COMMENT ON COLUMN "public"."orders"."fulfillment_status" IS 'Order fulfillment status: pending, confirmed, preparing, out_for_delivery, delivered, cancelled';



COMMENT ON COLUMN "public"."orders"."stripe_session_id" IS 'Stripe checkout session ID for tracking payment';



COMMENT ON COLUMN "public"."orders"."cancelled_at" IS 'Timestamp when order was cancelled';



COMMENT ON COLUMN "public"."orders"."delivery_fee" IS 'Delivery fee charged for this order';



COMMENT ON COLUMN "public"."orders"."delivery_distance" IS 'Distance at time of order';



COMMENT ON COLUMN "public"."orders"."delivery_zone" IS 'Delivery zone name at time of order';



COMMENT ON COLUMN "public"."orders"."pickup_ready_at" IS 'Estimated time when pickup order will be ready';



COMMENT ON COLUMN "public"."orders"."tax_amount" IS 'Total tax amount for the order (sum of all item taxes). Delivery fee is tax-exempt.';



COMMENT ON COLUMN "public"."orders"."taxable_amount" IS 'Subtotal of taxable items (before tax, after discounts)';



COMMENT ON COLUMN "public"."orders"."estimated_delivery_time" IS 'Estimated time when the order will be delivered/ready for pickup';



COMMENT ON COLUMN "public"."orders"."pickup_date" IS 'Scheduled pickup date (when customer will pick up the order)';



COMMENT ON COLUMN "public"."orders"."pickup_time" IS 'Scheduled pickup time slot label (e.g., "2:00 PM - 4:00 PM")';



COMMENT ON COLUMN "public"."orders"."delivery_date" IS 'Scheduled delivery date (when order will be delivered)';



COMMENT ON COLUMN "public"."orders"."delivery_time" IS 'Scheduled delivery time slot label (e.g., "2:00 PM - 4:00 PM")';



COMMENT ON COLUMN "public"."orders"."address_id" IS 'Reference to user_addresses table for historical tracking (address may be modified or deleted by user)';



COMMENT ON COLUMN "public"."orders"."pickup_reminder_sent_at" IS 'Timestamp when pickup reminder email was sent';



COMMENT ON COLUMN "public"."orders"."pickup_reminder_scheduled_for" IS 'Timestamp when pickup reminder should be sent (1 hour before pickup window start)';



COMMENT ON COLUMN "public"."orders"."delivery_address_line1" IS 'Snapshot of delivery address at order time (immutable)';



COMMENT ON COLUMN "public"."orders"."delivery_city" IS 'Snapshot of delivery city at order time (immutable)';



COMMENT ON COLUMN "public"."orders"."delivery_state" IS 'Snapshot of delivery state at order time (immutable)';



COMMENT ON COLUMN "public"."orders"."delivery_postal_code" IS 'Snapshot of delivery postal code at order time (immutable)';



COMMENT ON COLUMN "public"."orders"."delivery_address_label" IS 'Snapshot of delivery address label at order time (immutable, e.g., Home, Work)';



COMMENT ON COLUMN "public"."orders"."card_last4" IS 'Last 4 digits of card used for payment (for display only)';



COMMENT ON COLUMN "public"."orders"."card_brand" IS 'Card brand (e.g., visa, mastercard, amex, discover)';



COMMENT ON COLUMN "public"."orders"."card_exp_month" IS 'Card expiration month (1-12)';



COMMENT ON COLUMN "public"."orders"."card_exp_year" IS 'Card expiration year (e.g., 2025)';



COMMENT ON COLUMN "public"."orders"."confirmation_token" IS 'Single-use random hex token sent to customer via email for order confirmation before payment';



COMMENT ON COLUMN "public"."orders"."confirmation_token_expires_at" IS '48-hour expiry window for the confirmation token; after this timestamp, the token is invalid';



COMMENT ON COLUMN "public"."orders"."customer_notes" IS 'Optional notes from customer submitted when they modify an order back to pending_review status during confirmation';



COMMENT ON COLUMN "public"."orders"."guest_tracking_token" IS 'Long-lived token for guest order tracking. Set at creation for guest orders, NULL for authenticated orders. Never nulled post-payment.';



CREATE TABLE IF NOT EXISTS "public"."pickup_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "preparation_time_minutes" integer DEFAULT 60 NOT NULL,
    "store_address_line1" "text" NOT NULL,
    "store_address_line2" "text",
    "store_city" "text" NOT NULL,
    "store_state" "text" NOT NULL,
    "store_postal_code" "text" NOT NULL,
    "store_phone" "text",
    "opening_time" time without time zone DEFAULT '10:00:00'::time without time zone NOT NULL,
    "closing_time" time without time zone DEFAULT '22:00:00'::time without time zone NOT NULL,
    "last_order_cutoff_minutes" integer DEFAULT 60 NOT NULL,
    "is_pickup_enabled" boolean DEFAULT true NOT NULL,
    "timezone" "text" DEFAULT 'America/Chicago'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "delivery_time_buffer_minutes" integer DEFAULT 30,
    "min_advance_hours" integer DEFAULT 2 NOT NULL,
    "max_days_advance" integer DEFAULT 7 NOT NULL,
    "use_delivery_slots" boolean DEFAULT false NOT NULL,
    "default_max_orders_per_slot" integer DEFAULT 10 NOT NULL
);


ALTER TABLE "public"."pickup_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."pickup_settings" IS 'Configuration for store pickup functionality';



COMMENT ON COLUMN "public"."pickup_settings"."preparation_time_minutes" IS 'Time needed to prepare order for pickup (in minutes)';



COMMENT ON COLUMN "public"."pickup_settings"."last_order_cutoff_minutes" IS 'Minutes before closing time when last pickup order can be placed';



COMMENT ON COLUMN "public"."pickup_settings"."timezone" IS 'Store timezone for time calculations';



COMMENT ON COLUMN "public"."pickup_settings"."delivery_time_buffer_minutes" IS 'Buffer time in minutes to add to estimated delivery times';



COMMENT ON COLUMN "public"."pickup_settings"."min_advance_hours" IS 'Minimum hours in advance required for pickup scheduling';



COMMENT ON COLUMN "public"."pickup_settings"."max_days_advance" IS 'Maximum days in advance customers can schedule pickups';



COMMENT ON COLUMN "public"."pickup_settings"."use_delivery_slots" IS 'If true, use delivery_slots table; if false, use pickup_slots table';



COMMENT ON COLUMN "public"."pickup_settings"."default_max_orders_per_slot" IS 'Default maximum orders per time slot when using delivery slots';



CREATE TABLE IF NOT EXISTS "public"."pickup_slots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "label" "text" NOT NULL,
    "start_hour" integer NOT NULL,
    "start_minute" integer NOT NULL,
    "end_hour" integer NOT NULL,
    "end_minute" integer NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "max_orders_per_slot" integer DEFAULT 10 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "pickup_slots_end_hour_check" CHECK ((("end_hour" >= 0) AND ("end_hour" < 24))),
    CONSTRAINT "pickup_slots_end_minute_check" CHECK ((("end_minute" >= 0) AND ("end_minute" < 60))),
    CONSTRAINT "pickup_slots_start_hour_check" CHECK ((("start_hour" >= 0) AND ("start_hour" < 24))),
    CONSTRAINT "pickup_slots_start_minute_check" CHECK ((("start_minute" >= 0) AND ("start_minute" < 60)))
);


ALTER TABLE "public"."pickup_slots" OWNER TO "postgres";


COMMENT ON TABLE "public"."pickup_slots" IS 'Custom time slots for pickup orders (used when use_delivery_slots = false)';



COMMENT ON COLUMN "public"."pickup_slots"."max_orders_per_slot" IS 'Maximum number of pickup orders allowed in this time slot';



CREATE TABLE IF NOT EXISTS "public"."print_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "retry_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "claimed_at" timestamp with time zone,
    "printed_at" timestamp with time zone,
    "failed_at" timestamp with time zone,
    "error_message" "text",
    CONSTRAINT "print_job_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'claimed'::"text", 'printed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."print_jobs" OWNER TO "postgres";


COMMENT ON TABLE "public"."print_jobs" IS 'Queue for store printer jobs - RLS DISABLED';



COMMENT ON COLUMN "public"."print_jobs"."status" IS 'Job status: pending, claimed, printed, failed';



CREATE TABLE IF NOT EXISTS "public"."product_combos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "image_url" "text",
    "combo_price" numeric NOT NULL,
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_combos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "price_per_unit" numeric(10,2) NOT NULL,
    "is_weighted" boolean DEFAULT false,
    "unit_of_measure" "text",
    "image_url" "text",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "min_order_value" numeric(10,2),
    "min_order_unit" "text",
    "tax_rate" numeric(5,4),
    "inventory_count" integer DEFAULT 0,
    "inventory_weight" numeric(10,2) DEFAULT 0,
    "low_stock_threshold" integer DEFAULT 10,
    "low_stock_weight_threshold" numeric(10,2) DEFAULT 10.0,
    "track_inventory" boolean DEFAULT true,
    "upc_code" "text",
    "sub_category" "text",
    "brand" "text",
    "tags" "text"[],
    "is_active" boolean DEFAULT true,
    "priority" integer DEFAULT 5,
    "category_id" "uuid" NOT NULL,
    "has_default_image" boolean DEFAULT false,
    "deactivated_by_category" boolean DEFAULT false,
    "auto_deactivated" boolean DEFAULT false,
    "nutrition" "jsonb",
    "shippable_nationwide" boolean,
    CONSTRAINT "min_order_consistency" CHECK (((("min_order_value" IS NULL) AND ("min_order_unit" IS NULL)) OR (("min_order_value" IS NOT NULL) AND ("min_order_unit" IS NOT NULL)))),
    CONSTRAINT "products_min_order_unit_check" CHECK ((("min_order_unit" IS NULL) OR ("min_order_unit" = ANY (ARRAY['pieces'::"text", 'kg'::"text", 'lbs'::"text"])))),
    CONSTRAINT "products_min_order_value_check" CHECK ((("min_order_value" IS NULL) OR ("min_order_value" > (0)::numeric))),
    CONSTRAINT "products_priority_check" CHECK ((("priority" >= 0) AND ("priority" <= 10))),
    CONSTRAINT "products_tax_rate_check" CHECK ((("tax_rate" >= (0)::numeric) AND ("tax_rate" <= (1)::numeric)))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


COMMENT ON TABLE "public"."products" IS 'Products table - matches Product interface in src/hooks/products/types.ts';



COMMENT ON COLUMN "public"."products"."min_order_value" IS 'Minimum orderable quantity or weight for this product';



COMMENT ON COLUMN "public"."products"."min_order_unit" IS 'Unit for minimum order: pieces (for countable items), kg, or lbs (for weight-based items)';



COMMENT ON COLUMN "public"."products"."tax_rate" IS 'Product-specific tax rate (0-1 decimal). Overrides category tax rate if set. NULL means use category rate or no tax.';



COMMENT ON COLUMN "public"."products"."inventory_count" IS 'Available quantity for count-based items';



COMMENT ON COLUMN "public"."products"."inventory_weight" IS 'Available weight for weight-based items';



COMMENT ON COLUMN "public"."products"."low_stock_threshold" IS 'Alert threshold for count-based items';



COMMENT ON COLUMN "public"."products"."low_stock_weight_threshold" IS 'Alert threshold for weight-based items';



COMMENT ON COLUMN "public"."products"."track_inventory" IS 'Whether to track inventory for this product';



COMMENT ON COLUMN "public"."products"."upc_code" IS 'Universal Product Code for scanning';



COMMENT ON COLUMN "public"."products"."sub_category" IS 'Product sub-category for finer filtering';



COMMENT ON COLUMN "public"."products"."brand" IS 'Product brand name';



COMMENT ON COLUMN "public"."products"."tags" IS 'Product tags for search and filtering';



COMMENT ON COLUMN "public"."products"."is_active" IS 'Whether product is active and visible to customers';



COMMENT ON COLUMN "public"."products"."priority" IS 'Product display priority (0-10). Higher number = shown first. Used for sorting on products page.';



COMMENT ON COLUMN "public"."products"."category_id" IS 'Reference to categories table';



COMMENT ON COLUMN "public"."products"."has_default_image" IS 'True if using placeholder image (image fetch failed during import)';



COMMENT ON COLUMN "public"."products"."deactivated_by_category" IS 'TRUE if product was automatically deactivated due to category deactivation. FALSE if manually deactivated or active.';



COMMENT ON COLUMN "public"."products"."auto_deactivated" IS 'Tracks if product was auto-deactivated when category became inactive. If true, product can be auto-reactivated when category becomes active again. If false and is_active=false, product was manually deactivated.';



COMMENT ON COLUMN "public"."products"."nutrition" IS 'Nutrition facts as JSON: { serving_size, calories, total_fat, saturated_fat, cholesterol, sodium, total_carbs, dietary_fiber, sugars, protein }';



COMMENT ON COLUMN "public"."products"."shippable_nationwide" IS 'Shipping eligibility override. NULL = inherit from category, TRUE = ships nationwide, FALSE = local only.';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "text" NOT NULL,
    "email" "text",
    "full_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "profile_completed" boolean DEFAULT false,
    "onboarding_shown" boolean DEFAULT false,
    "phone_number" "text",
    "is_guest" boolean DEFAULT false NOT NULL,
    "claimed_at" timestamp with time zone,
    "claimed_clerk_id" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'User profiles synced from Clerk authentication.
SECURITY MODEL: RLS is disabled because we use Clerk (not Supabase Auth).
- Authentication: Handled by Clerk
- Authorization: Enforced in application code - all queries filter by Clerk user ID
- Webhook: Uses service role key to create/update profiles
- Frontend: Uses anon key but ALWAYS queries WHERE id = clerk_user_id
This is the standard pattern for Clerk + Supabase integration.';



COMMENT ON COLUMN "public"."profiles"."id" IS 'Clerk user ID (text format, e.g., user_xxxxx)';



COMMENT ON COLUMN "public"."profiles"."email" IS 'User email from Clerk';



COMMENT ON COLUMN "public"."profiles"."full_name" IS 'User full name from Clerk';



COMMENT ON COLUMN "public"."profiles"."profile_completed" IS 'Whether user has completed profile (phone + address)';



COMMENT ON COLUMN "public"."profiles"."onboarding_shown" IS 'Whether user has seen onboarding flow';



COMMENT ON COLUMN "public"."profiles"."phone_number" IS 'User phone number (collected in onboarding)';



COMMENT ON COLUMN "public"."profiles"."is_guest" IS 'TRUE if this profile was created via guest checkout (no Clerk account).';



COMMENT ON COLUMN "public"."profiles"."claimed_at" IS 'Timestamp when a Clerk user claimed this guest profile.';



COMMENT ON COLUMN "public"."profiles"."claimed_clerk_id" IS 'Clerk user ID that claimed this guest profile post-checkout. NULL until claimed.';



CREATE TABLE IF NOT EXISTS "public"."promo_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "discount_type" "text" NOT NULL,
    "discount_value" numeric(10,2),
    "min_order_amount" numeric(10,2),
    "max_uses" integer,
    "current_uses" integer DEFAULT 0,
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "discount_amount" numeric(10,2),
    "discount_percentage" numeric(5,2),
    "description" "text",
    "is_sitewide" boolean DEFAULT false,
    "minimum_order_amount" numeric(10,2),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "promo_codes_discount_percentage_check" CHECK ((("discount_percentage" IS NULL) OR (("discount_percentage" >= (0)::numeric) AND ("discount_percentage" <= (100)::numeric))))
);


ALTER TABLE "public"."promo_codes" OWNER TO "postgres";


COMMENT ON TABLE "public"."promo_codes" IS 'Promo codes table - matches PromoCode interface in src/types/promoCode.ts';



COMMENT ON COLUMN "public"."promo_codes"."discount_amount" IS 'Fixed discount amount in currency';



COMMENT ON COLUMN "public"."promo_codes"."discount_percentage" IS 'Percentage discount (0-100)';



COMMENT ON COLUMN "public"."promo_codes"."description" IS 'Promo code description';



COMMENT ON COLUMN "public"."promo_codes"."is_sitewide" IS 'Whether promo applies to all products';



COMMENT ON COLUMN "public"."promo_codes"."minimum_order_amount" IS 'Minimum order amount to use promo';



CREATE TABLE IF NOT EXISTS "public"."recipe_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipe_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "amount" numeric(10,2) DEFAULT 1,
    "unit" "text" DEFAULT 'piece'::"text",
    "display_order" integer DEFAULT 0,
    "notes" "text",
    CONSTRAINT "check_amount_positive" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "check_unit_not_empty" CHECK ((("unit" IS NOT NULL) AND ("unit" <> ''::"text")))
);


ALTER TABLE "public"."recipe_products" OWNER TO "postgres";


COMMENT ON TABLE "public"."recipe_products" IS 'RLS disabled. Admin-only table. Authentication and authorization handled by Clerk at application layer.';



COMMENT ON COLUMN "public"."recipe_products"."quantity" IS 'DEPRECATED: Legacy text-based quantity field, use amount + unit instead';



COMMENT ON COLUMN "public"."recipe_products"."amount" IS 'Numeric quantity for the ingredient (e.g., 2, 500, 0.5)';



COMMENT ON COLUMN "public"."recipe_products"."unit" IS 'Unit of measurement (e.g., cups, kg, g, lb, oz, tsp, tbsp, pieces, servings)';



COMMENT ON COLUMN "public"."recipe_products"."display_order" IS 'Order in which ingredients should be displayed (0 = first)';



COMMENT ON COLUMN "public"."recipe_products"."notes" IS 'Optional preparation notes (e.g., "finely chopped", "room temperature")';



CREATE TABLE IF NOT EXISTS "public"."recipes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "image_url" "text" NOT NULL,
    "prep_time_minutes" integer,
    "cook_time_minutes" integer,
    "servings" integer,
    "difficulty" "text",
    "instructions" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ingredients" "text"
);


ALTER TABLE "public"."recipes" OWNER TO "postgres";


COMMENT ON TABLE "public"."recipes" IS 'RLS disabled. Admin-only table. Authentication and authorization handled by Clerk at application layer.';



CREATE TABLE IF NOT EXISTS "public"."testimonials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_name" "text" NOT NULL,
    "customer_image" "text",
    "rating" integer NOT NULL,
    "review" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "text",
    "user_email" "text",
    "source" "text" DEFAULT 'admin'::"text" NOT NULL,
    "status" "text" DEFAULT 'approved'::"text" NOT NULL,
    CONSTRAINT "testimonials_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5))),
    CONSTRAINT "testimonials_source_check" CHECK (("source" = ANY (ARRAY['admin'::"text", 'user'::"text"]))),
    CONSTRAINT "testimonials_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text"])))
);


ALTER TABLE "public"."testimonials" OWNER TO "postgres";


COMMENT ON TABLE "public"."testimonials" IS 'RLS disabled. Admin-only table. Authentication and authorization handled by Clerk at application layer.';



COMMENT ON COLUMN "public"."testimonials"."user_id" IS 'Clerk user ID for user-submitted reviews. NULL for admin-created testimonials.';



COMMENT ON COLUMN "public"."testimonials"."user_email" IS 'Email of the user who submitted the review. NULL for admin-created testimonials.';



COMMENT ON COLUMN "public"."testimonials"."source" IS 'Source of the testimonial: admin (created by admin) or user (submitted by user)';



COMMENT ON COLUMN "public"."testimonials"."status" IS 'Approval status: pending (awaiting approval) or approved (visible on site)';



CREATE TABLE IF NOT EXISTS "public"."tiktok_sync_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sync_started_at" timestamp with time zone DEFAULT "now"(),
    "sync_completed_at" timestamp with time zone,
    "status" "text",
    "videos_fetched" integer DEFAULT 0,
    "videos_added" integer DEFAULT 0,
    "videos_updated" integer DEFAULT 0,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "tiktok_sync_logs_status_check" CHECK (("status" = ANY (ARRAY['running'::"text", 'success'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."tiktok_sync_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tiktok_video_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tiktok_video_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tiktok_video_products" OWNER TO "postgres";


COMMENT ON TABLE "public"."tiktok_video_products" IS 'Junction table linking TikTok videos to products featured in them';



COMMENT ON COLUMN "public"."tiktok_video_products"."display_order" IS 'Order of products display (0 = first)';



CREATE TABLE IF NOT EXISTS "public"."tiktok_videos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "video_id" "text" NOT NULL,
    "video_url" "text" NOT NULL,
    "author_name" "text",
    "author_url" "text",
    "title" "text",
    "thumbnail_url" "text",
    "embed_html" "text",
    "duration" integer,
    "view_count" bigint,
    "like_count" bigint,
    "published_at" timestamp with time zone,
    "display_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "video_file_url" "text"
);


ALTER TABLE "public"."tiktok_videos" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tiktok_videos"."video_file_url" IS 'Direct MP4 video URL from TikTok CDN (scraped via API)';



CREATE TABLE IF NOT EXISTS "public"."tv_menu_boards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "is_published" boolean DEFAULT false,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "slug" "text"
);


ALTER TABLE "public"."tv_menu_boards" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tv_menu_boards"."slug" IS 'URL-friendly identifier, e.g. /tv-menu/meat-shop';



CREATE TABLE IF NOT EXISTS "public"."user_addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "label" "text" NOT NULL,
    "address_line1" "text" NOT NULL,
    "city" "text" NOT NULL,
    "state" "text" NOT NULL,
    "postal_code" "text" NOT NULL,
    "distance_from_store" numeric(10,2),
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "distance_calculated_at" timestamp with time zone,
    "is_default" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_addresses" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_addresses" IS 'Stores multiple delivery addresses per user. Each address is a separate entry (no address_line2). Replaces single address storage in profiles table.';



COMMENT ON COLUMN "public"."user_addresses"."label" IS 'User-defined label like Home, Work, etc. Used for quick identification during checkout.';



COMMENT ON COLUMN "public"."user_addresses"."address_line1" IS 'Full street address including apartment/suite/unit number. No separate line2 field.';



COMMENT ON COLUMN "public"."user_addresses"."is_default" IS 'True for the users preferred/primary address. Auto-selected at checkout.';



CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_roles" IS 'RLS enabled with strict policies. All access restricted to service role. Frontend should use Edge Functions to check user roles securely.';



ALTER TABLE ONLY "public"."admin_message_templates"
    ADD CONSTRAINT "admin_message_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cart_combo_items"
    ADD CONSTRAINT "cart_combo_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."carts"
    ADD CONSTRAINT "carts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."carts"
    ADD CONSTRAINT "carts_user_id_unique" UNIQUE ("user_id");



COMMENT ON CONSTRAINT "carts_user_id_unique" ON "public"."carts" IS 'Ensures each user has exactly one cart. Prevents duplicate cart creation issues.';



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."catering_requests"
    ADD CONSTRAINT "catering_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collections"
    ADD CONSTRAINT "collections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."combo_items"
    ADD CONSTRAINT "combo_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_messages"
    ADD CONSTRAINT "customer_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."delivery_settings"
    ADD CONSTRAINT "delivery_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."delivery_time_slots"
    ADD CONSTRAINT "delivery_time_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."delivery_zones"
    ADD CONSTRAINT "delivery_zones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."featured_products"
    ADD CONSTRAINT "featured_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."featured_products"
    ADD CONSTRAINT "featured_products_product_id_key" UNIQUE ("product_id");



ALTER TABLE ONLY "public"."festival_products"
    ADD CONSTRAINT "festival_products_festival_id_product_id_key" UNIQUE ("festival_id", "product_id");



ALTER TABLE ONLY "public"."festival_products"
    ADD CONSTRAINT "festival_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."festivals"
    ADD CONSTRAINT "festivals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."flash_deals"
    ADD CONSTRAINT "flash_deals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."flash_deals"
    ADD CONSTRAINT "flash_deals_product_id_key" UNIQUE ("product_id");



ALTER TABLE ONLY "public"."guest_order_rate_limits"
    ADD CONSTRAINT "guest_order_rate_limits_pkey" PRIMARY KEY ("ip");



ALTER TABLE ONLY "public"."hero_slides"
    ADD CONSTRAINT "hero_slides_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lunch_box_deliveries"
    ADD CONSTRAINT "lunch_box_deliveries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lunch_box_deliveries"
    ADD CONSTRAINT "lunch_box_deliveries_subscription_id_delivery_date_key" UNIQUE ("subscription_id", "delivery_date");



ALTER TABLE ONLY "public"."lunch_box_notifications"
    ADD CONSTRAINT "lunch_box_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lunch_box_subscriptions"
    ADD CONSTRAINT "lunch_box_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."menu_items"
    ADD CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pickup_settings"
    ADD CONSTRAINT "pickup_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pickup_slots"
    ADD CONSTRAINT "pickup_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."print_jobs"
    ADD CONSTRAINT "print_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_combos"
    ADD CONSTRAINT "product_combos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promo_codes"
    ADD CONSTRAINT "promo_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."promo_codes"
    ADD CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipe_products"
    ADD CONSTRAINT "recipe_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipe_products"
    ADD CONSTRAINT "recipe_products_recipe_id_product_id_key" UNIQUE ("recipe_id", "product_id");



ALTER TABLE ONLY "public"."recipes"
    ADD CONSTRAINT "recipes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."testimonials"
    ADD CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tiktok_sync_logs"
    ADD CONSTRAINT "tiktok_sync_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tiktok_video_products"
    ADD CONSTRAINT "tiktok_video_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tiktok_video_products"
    ADD CONSTRAINT "tiktok_video_products_tiktok_video_id_product_id_key" UNIQUE ("tiktok_video_id", "product_id");



ALTER TABLE ONLY "public"."tiktok_videos"
    ADD CONSTRAINT "tiktok_videos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tiktok_videos"
    ADD CONSTRAINT "tiktok_videos_video_id_key" UNIQUE ("video_id");



ALTER TABLE ONLY "public"."tv_menu_boards"
    ADD CONSTRAINT "tv_menu_boards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_addresses"
    ADD CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_cart_combo_items_cart_id" ON "public"."cart_combo_items" USING "btree" ("cart_id");



CREATE INDEX "idx_cart_items_cart_id" ON "public"."cart_items" USING "btree" ("cart_id");



CREATE INDEX "idx_cart_items_flash_deal_id" ON "public"."cart_items" USING "btree" ("flash_deal_id");



CREATE INDEX "idx_cart_items_product_id" ON "public"."cart_items" USING "btree" ("product_id");



CREATE INDEX "idx_carts_user_id" ON "public"."carts" USING "btree" ("user_id");



CREATE INDEX "idx_categories_display_order" ON "public"."categories" USING "btree" ("display_order");



CREATE INDEX "idx_categories_is_active" ON "public"."categories" USING "btree" ("is_active");



CREATE INDEX "idx_categories_name" ON "public"."categories" USING "btree" ("name");



CREATE INDEX "idx_categories_priority" ON "public"."categories" USING "btree" ("priority" DESC);



CREATE INDEX "idx_catering_requests_created_at" ON "public"."catering_requests" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_catering_requests_status" ON "public"."catering_requests" USING "btree" ("status");



CREATE INDEX "idx_catering_requests_user_id" ON "public"."catering_requests" USING "btree" ("user_id");



CREATE INDEX "idx_collections_active_order" ON "public"."collections" USING "btree" ("is_active", "display_order");



CREATE INDEX "idx_collections_category_id" ON "public"."collections" USING "btree" ("category_id");



CREATE INDEX "idx_combo_items_combo_id" ON "public"."combo_items" USING "btree" ("combo_id");



CREATE INDEX "idx_customer_messages_order_id" ON "public"."customer_messages" USING "btree" ("order_id");



CREATE INDEX "idx_customer_messages_sent_at" ON "public"."customer_messages" USING "btree" ("sent_at" DESC);



CREATE INDEX "idx_customer_messages_user_id" ON "public"."customer_messages" USING "btree" ("user_id");



CREATE INDEX "idx_delivery_time_slots_active" ON "public"."delivery_time_slots" USING "btree" ("is_active");



CREATE INDEX "idx_delivery_time_slots_day" ON "public"."delivery_time_slots" USING "btree" ("day_of_week");



CREATE INDEX "idx_delivery_time_slots_order" ON "public"."delivery_time_slots" USING "btree" ("display_order");



CREATE INDEX "idx_featured_products_active_order" ON "public"."featured_products" USING "btree" ("is_active", "display_order");



CREATE INDEX "idx_festivals_dates" ON "public"."festivals" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_flash_deals_dates" ON "public"."flash_deals" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_lunch_box_deliveries_date" ON "public"."lunch_box_deliveries" USING "btree" ("delivery_date");



CREATE INDEX "idx_lunch_box_deliveries_date_status" ON "public"."lunch_box_deliveries" USING "btree" ("delivery_date", "status");



CREATE INDEX "idx_lunch_box_deliveries_status" ON "public"."lunch_box_deliveries" USING "btree" ("status");



CREATE INDEX "idx_lunch_box_deliveries_subscription" ON "public"."lunch_box_deliveries" USING "btree" ("subscription_id");



CREATE INDEX "idx_lunch_box_notifications_created" ON "public"."lunch_box_notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_lunch_box_notifications_unread" ON "public"."lunch_box_notifications" USING "btree" ("user_id", "read") WHERE ("read" = false);



CREATE INDEX "idx_lunch_box_notifications_user_id" ON "public"."lunch_box_notifications" USING "btree" ("user_id");



CREATE INDEX "idx_lunch_box_subscriptions_end_date" ON "public"."lunch_box_subscriptions" USING "btree" ("end_date");



CREATE INDEX "idx_lunch_box_subscriptions_next_delivery" ON "public"."lunch_box_subscriptions" USING "btree" ("next_delivery_date");



CREATE INDEX "idx_lunch_box_subscriptions_status" ON "public"."lunch_box_subscriptions" USING "btree" ("status");



CREATE UNIQUE INDEX "idx_lunch_box_subscriptions_stripe_session_id" ON "public"."lunch_box_subscriptions" USING "btree" ("stripe_session_id") WHERE ("stripe_session_id" IS NOT NULL);



CREATE INDEX "idx_lunch_box_subscriptions_user_id" ON "public"."lunch_box_subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_menu_items_category_id" ON "public"."menu_items" USING "btree" ("category_id");



CREATE INDEX "idx_menu_items_is_spicy" ON "public"."menu_items" USING "btree" ("is_spicy");



CREATE INDEX "idx_menu_items_is_vegetarian" ON "public"."menu_items" USING "btree" ("is_vegetarian");



CREATE INDEX "idx_menu_items_lunch_box_eligible" ON "public"."menu_items" USING "btree" ("lunch_box_eligible") WHERE ("lunch_box_eligible" = true);



CREATE INDEX "idx_menu_items_sub_category" ON "public"."menu_items" USING "btree" ("sub_category");



CREATE INDEX "idx_order_items_combo_id" ON "public"."order_items" USING "btree" ("combo_id") WHERE ("combo_id" IS NOT NULL);



CREATE INDEX "idx_order_items_order_id" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_orders_address_id" ON "public"."orders" USING "btree" ("address_id");



CREATE UNIQUE INDEX "idx_orders_confirmation_token" ON "public"."orders" USING "btree" ("confirmation_token") WHERE ("confirmation_token" IS NOT NULL);



CREATE INDEX "idx_orders_delivery_date" ON "public"."orders" USING "btree" ("delivery_date") WHERE ("fulfillment_type" = 'delivery'::"text");



CREATE INDEX "idx_orders_delivery_date_time" ON "public"."orders" USING "btree" ("delivery_date", "delivery_time") WHERE ("fulfillment_type" = 'delivery'::"text");



CREATE INDEX "idx_orders_delivery_time" ON "public"."orders" USING "btree" ("delivery_time") WHERE ("fulfillment_type" = 'delivery'::"text");



CREATE INDEX "idx_orders_fulfillment_status" ON "public"."orders" USING "btree" ("fulfillment_status");



CREATE INDEX "idx_orders_fulfillment_type" ON "public"."orders" USING "btree" ("fulfillment_type");



CREATE INDEX "idx_orders_guest_tracking_token" ON "public"."orders" USING "btree" ("guest_tracking_token") WHERE ("guest_tracking_token" IS NOT NULL);



CREATE INDEX "idx_orders_nationwide_delivery_date" ON "public"."orders" USING "btree" ("delivery_date") WHERE ("fulfillment_type" = 'nationwide'::"text");



CREATE INDEX "idx_orders_payment_status" ON "public"."orders" USING "btree" ("payment_status");



CREATE INDEX "idx_orders_pickup_date" ON "public"."orders" USING "btree" ("pickup_date") WHERE ("fulfillment_type" = 'pickup'::"text");



CREATE INDEX "idx_orders_pickup_date_time" ON "public"."orders" USING "btree" ("pickup_date", "pickup_time") WHERE ("fulfillment_type" = 'pickup'::"text");



CREATE INDEX "idx_orders_pickup_reminder" ON "public"."orders" USING "btree" ("pickup_reminder_scheduled_for", "pickup_reminder_sent_at") WHERE (("fulfillment_type" = 'pickup'::"text") AND ("pickup_reminder_sent_at" IS NULL));



CREATE INDEX "idx_orders_pickup_time" ON "public"."orders" USING "btree" ("pickup_time") WHERE ("fulfillment_type" = 'pickup'::"text");



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "idx_orders_stripe_session_id" ON "public"."orders" USING "btree" ("stripe_session_id") WHERE ("stripe_session_id" IS NOT NULL);



CREATE INDEX "idx_orders_user_id" ON "public"."orders" USING "btree" ("user_id");



CREATE INDEX "idx_pickup_slots_active" ON "public"."pickup_slots" USING "btree" ("is_active");



CREATE INDEX "idx_print_jobs_created_at" ON "public"."print_jobs" USING "btree" ("created_at");



CREATE INDEX "idx_print_jobs_order_id" ON "public"."print_jobs" USING "btree" ("order_id");



CREATE INDEX "idx_print_jobs_status" ON "public"."print_jobs" USING "btree" ("status");



CREATE INDEX "idx_product_combos_active" ON "public"."product_combos" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_products_auto_deactivated" ON "public"."products" USING "btree" ("auto_deactivated") WHERE ("auto_deactivated" = true);



CREATE INDEX "idx_products_brand" ON "public"."products" USING "btree" ("brand");



CREATE INDEX "idx_products_category_id" ON "public"."products" USING "btree" ("category_id");



CREATE INDEX "idx_products_deactivated_by_category" ON "public"."products" USING "btree" ("deactivated_by_category");



CREATE INDEX "idx_products_has_default_image" ON "public"."products" USING "btree" ("has_default_image") WHERE ("has_default_image" = true);



CREATE INDEX "idx_products_inventory_count" ON "public"."products" USING "btree" ("inventory_count") WHERE ("track_inventory" = true);



CREATE INDEX "idx_products_inventory_weight" ON "public"."products" USING "btree" ("inventory_weight") WHERE (("track_inventory" = true) AND ("is_weighted" = true));



CREATE INDEX "idx_products_is_active" ON "public"."products" USING "btree" ("is_active");



CREATE INDEX "idx_products_priority" ON "public"."products" USING "btree" ("priority");



CREATE INDEX "idx_products_shippable_nationwide" ON "public"."products" USING "btree" ("shippable_nationwide");



CREATE INDEX "idx_products_sub_category" ON "public"."products" USING "btree" ("sub_category");



CREATE INDEX "idx_products_track_inventory" ON "public"."products" USING "btree" ("track_inventory");



CREATE INDEX "idx_products_upc_code" ON "public"."products" USING "btree" ("upc_code");



CREATE INDEX "idx_profiles_completed" ON "public"."profiles" USING "btree" ("profile_completed");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE UNIQUE INDEX "idx_profiles_email_unique" ON "public"."profiles" USING "btree" ("lower"("email")) WHERE ("email" IS NOT NULL);



COMMENT ON INDEX "public"."idx_profiles_email_unique" IS 'Enforces case-insensitive uniqueness of non-NULL emails across all profile rows (guest and Clerk).';



CREATE INDEX "idx_profiles_onboarding_shown" ON "public"."profiles" USING "btree" ("onboarding_shown");



CREATE INDEX "idx_profiles_unclaimed_guest_email" ON "public"."profiles" USING "btree" ("email") WHERE (("is_guest" = true) AND ("claimed_clerk_id" IS NULL));



CREATE INDEX "idx_promo_codes_code" ON "public"."promo_codes" USING "btree" ("code");



CREATE INDEX "idx_promo_codes_is_active" ON "public"."promo_codes" USING "btree" ("is_active");



CREATE INDEX "idx_promo_codes_is_sitewide" ON "public"."promo_codes" USING "btree" ("is_sitewide");



CREATE INDEX "idx_recipe_products_product_id" ON "public"."recipe_products" USING "btree" ("product_id");



CREATE INDEX "idx_recipe_products_recipe_id_display_order" ON "public"."recipe_products" USING "btree" ("recipe_id", "display_order");



CREATE INDEX "idx_templates_is_active" ON "public"."admin_message_templates" USING "btree" ("is_active");



CREATE INDEX "idx_testimonials_source" ON "public"."testimonials" USING "btree" ("source");



CREATE INDEX "idx_testimonials_status_active" ON "public"."testimonials" USING "btree" ("status", "is_active");



CREATE INDEX "idx_testimonials_user_id" ON "public"."testimonials" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_tiktok_sync_logs_created" ON "public"."tiktok_sync_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_tiktok_video_products_order" ON "public"."tiktok_video_products" USING "btree" ("tiktok_video_id", "display_order");



CREATE INDEX "idx_tiktok_video_products_product" ON "public"."tiktok_video_products" USING "btree" ("product_id");



CREATE INDEX "idx_tiktok_video_products_video" ON "public"."tiktok_video_products" USING "btree" ("tiktok_video_id");



CREATE INDEX "idx_tiktok_videos_active" ON "public"."tiktok_videos" USING "btree" ("is_active", "display_order");



CREATE INDEX "idx_tiktok_videos_published" ON "public"."tiktok_videos" USING "btree" ("published_at" DESC);



CREATE INDEX "idx_tiktok_videos_video_id" ON "public"."tiktok_videos" USING "btree" ("video_id");



CREATE INDEX "idx_tv_menu_boards_published" ON "public"."tv_menu_boards" USING "btree" ("is_published") WHERE ("is_published" = true);



CREATE UNIQUE INDEX "idx_tv_menu_boards_slug" ON "public"."tv_menu_boards" USING "btree" ("slug") WHERE ("slug" IS NOT NULL);



CREATE INDEX "idx_user_addresses_active" ON "public"."user_addresses" USING "btree" ("user_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_user_addresses_user_default" ON "public"."user_addresses" USING "btree" ("user_id", "is_default") WHERE ("is_default" = true);



CREATE INDEX "idx_user_addresses_user_id" ON "public"."user_addresses" USING "btree" ("user_id");



CREATE INDEX "idx_user_roles_user_id" ON "public"."user_roles" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "delivery_settings_updated_at" BEFORE UPDATE ON "public"."delivery_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_delivery_settings_updated_at"();



CREATE OR REPLACE TRIGGER "delivery_time_slots_updated_at" BEFORE UPDATE ON "public"."delivery_time_slots" FOR EACH ROW EXECUTE FUNCTION "public"."update_delivery_time_slots_updated_at"();



CREATE OR REPLACE TRIGGER "lunch_box_deliveries_updated_at" BEFORE UPDATE ON "public"."lunch_box_deliveries" FOR EACH ROW EXECUTE FUNCTION "public"."update_lunch_box_deliveries_updated_at"();



CREATE OR REPLACE TRIGGER "lunch_box_subscriptions_updated_at" BEFORE UPDATE ON "public"."lunch_box_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_lunch_box_subscriptions_updated_at"();



CREATE OR REPLACE TRIGGER "sync_promo_discount_before_insert_update" BEFORE INSERT OR UPDATE ON "public"."promo_codes" FOR EACH ROW EXECUTE FUNCTION "public"."sync_promo_discount_value"();



CREATE OR REPLACE TRIGGER "tiktok_videos_updated_at" BEFORE UPDATE ON "public"."tiktok_videos" FOR EACH ROW EXECUTE FUNCTION "public"."update_tiktok_videos_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_category_activation_cascade" AFTER UPDATE ON "public"."categories" FOR EACH ROW WHEN (("old"."is_active" IS DISTINCT FROM "new"."is_active")) EXECUTE FUNCTION "public"."handle_category_activation_cascade"();



CREATE OR REPLACE TRIGGER "update_cart_combo_items_updated_at" BEFORE UPDATE ON "public"."cart_combo_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_categories_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_catering_requests_updated_at" BEFORE UPDATE ON "public"."catering_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_collections_updated_at" BEFORE UPDATE ON "public"."collections" FOR EACH ROW EXECUTE FUNCTION "public"."update_collections_updated_at"();



CREATE OR REPLACE TRIGGER "update_featured_products_updated_at" BEFORE UPDATE ON "public"."featured_products" FOR EACH ROW EXECUTE FUNCTION "public"."update_featured_products_updated_at"();



CREATE OR REPLACE TRIGGER "update_festivals_updated_at" BEFORE UPDATE ON "public"."festivals" FOR EACH ROW EXECUTE FUNCTION "public"."update_festivals_updated_at"();



CREATE OR REPLACE TRIGGER "update_flash_deals_updated_at" BEFORE UPDATE ON "public"."flash_deals" FOR EACH ROW EXECUTE FUNCTION "public"."update_flash_deals_updated_at"();



CREATE OR REPLACE TRIGGER "update_hero_slides_updated_at" BEFORE UPDATE ON "public"."hero_slides" FOR EACH ROW EXECUTE FUNCTION "public"."update_hero_slides_updated_at"();



CREATE OR REPLACE TRIGGER "update_menu_items_updated_at" BEFORE UPDATE ON "public"."menu_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_product_combos_updated_at" BEFORE UPDATE ON "public"."product_combos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_promo_codes_updated_at" BEFORE UPDATE ON "public"."promo_codes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_recipes_updated_at" BEFORE UPDATE ON "public"."recipes" FOR EACH ROW EXECUTE FUNCTION "public"."update_recipes_updated_at"();



CREATE OR REPLACE TRIGGER "update_testimonials_updated_at" BEFORE UPDATE ON "public"."testimonials" FOR EACH ROW EXECUTE FUNCTION "public"."update_testimonials_updated_at"();



CREATE OR REPLACE TRIGGER "update_tv_menu_boards_updated_at" BEFORE UPDATE ON "public"."tv_menu_boards" FOR EACH ROW EXECUTE FUNCTION "public"."update_tv_menu_boards_updated_at"();



ALTER TABLE ONLY "public"."cart_combo_items"
    ADD CONSTRAINT "cart_combo_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_combo_items"
    ADD CONSTRAINT "cart_combo_items_combo_id_fkey" FOREIGN KEY ("combo_id") REFERENCES "public"."product_combos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_flash_deal_id_fkey" FOREIGN KEY ("flash_deal_id") REFERENCES "public"."flash_deals"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."carts"
    ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collections"
    ADD CONSTRAINT "collections_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."combo_items"
    ADD CONSTRAINT "combo_items_combo_id_fkey" FOREIGN KEY ("combo_id") REFERENCES "public"."product_combos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."combo_items"
    ADD CONSTRAINT "combo_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_messages"
    ADD CONSTRAINT "customer_messages_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."customer_messages"
    ADD CONSTRAINT "customer_messages_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."admin_message_templates"("id");



ALTER TABLE ONLY "public"."customer_messages"
    ADD CONSTRAINT "customer_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."featured_products"
    ADD CONSTRAINT "featured_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."festival_products"
    ADD CONSTRAINT "festival_products_festival_id_fkey" FOREIGN KEY ("festival_id") REFERENCES "public"."festivals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."festival_products"
    ADD CONSTRAINT "festival_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."flash_deals"
    ADD CONSTRAINT "flash_deals_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lunch_box_deliveries"
    ADD CONSTRAINT "lunch_box_deliveries_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lunch_box_deliveries"
    ADD CONSTRAINT "lunch_box_deliveries_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."lunch_box_subscriptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lunch_box_notifications"
    ADD CONSTRAINT "lunch_box_notifications_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."lunch_box_subscriptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."menu_items"
    ADD CONSTRAINT "menu_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_combo_id_fkey" FOREIGN KEY ("combo_id") REFERENCES "public"."product_combos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_original_product_id_fkey" FOREIGN KEY ("original_product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "public"."user_addresses"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_promo_code_id_fkey" FOREIGN KEY ("promo_code_id") REFERENCES "public"."promo_codes"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."print_jobs"
    ADD CONSTRAINT "print_jobs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."recipe_products"
    ADD CONSTRAINT "recipe_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_products"
    ADD CONSTRAINT "recipe_products_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tiktok_video_products"
    ADD CONSTRAINT "tiktok_video_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tiktok_video_products"
    ADD CONSTRAINT "tiktok_video_products_tiktok_video_id_fkey" FOREIGN KEY ("tiktok_video_id") REFERENCES "public"."tiktok_videos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Everyone can view active collections" ON "public"."collections" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Everyone can view active featured products" ON "public"."featured_products" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Everyone can view active festivals" ON "public"."festivals" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Everyone can view active flash deals" ON "public"."flash_deals" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Everyone can view active recipes" ON "public"."recipes" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Everyone can view active testimonials" ON "public"."testimonials" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Everyone can view festival products" ON "public"."festival_products" FOR SELECT USING (true);



CREATE POLICY "Everyone can view recipe products" ON "public"."recipe_products" FOR SELECT USING (true);



CREATE POLICY "No direct access - use service role" ON "public"."user_roles" FOR SELECT USING (false);



CREATE POLICY "Service role only for deletes" ON "public"."user_roles" FOR DELETE USING (false);



CREATE POLICY "Service role only for modifications" ON "public"."user_roles" FOR INSERT WITH CHECK (false);



CREATE POLICY "Service role only for updates" ON "public"."user_roles" FOR UPDATE USING (false);



CREATE POLICY "Users can add items to their own cart" ON "public"."cart_items" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."carts"
  WHERE (("carts"."id" = "cart_items"."cart_id") AND ("carts"."user_id" = ("auth"."uid"())::"text")))));



CREATE POLICY "Users can delete items from their own cart" ON "public"."cart_items" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."carts"
  WHERE (("carts"."id" = "cart_items"."cart_id") AND ("carts"."user_id" = ("auth"."uid"())::"text")))));



CREATE POLICY "Users can update items in their own cart" ON "public"."cart_items" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."carts"
  WHERE (("carts"."id" = "cart_items"."cart_id") AND ("carts"."user_id" = ("auth"."uid"())::"text")))));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING ((("auth"."uid"())::"text" = "id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING ((("auth"."uid"())::"text" = "id"));



CREATE POLICY "anon_select" ON "public"."categories" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select" ON "public"."collections" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select" ON "public"."delivery_settings" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select" ON "public"."delivery_time_slots" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select" ON "public"."delivery_zones" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select" ON "public"."featured_products" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select" ON "public"."festival_products" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select" ON "public"."festivals" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select" ON "public"."flash_deals" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select" ON "public"."hero_slides" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select" ON "public"."menu_items" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select" ON "public"."pickup_settings" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select" ON "public"."pickup_slots" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select" ON "public"."products" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select" ON "public"."promo_codes" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select" ON "public"."recipe_products" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select" ON "public"."recipes" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select" ON "public"."testimonials" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select" ON "public"."tiktok_sync_logs" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select" ON "public"."tiktok_video_products" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select" ON "public"."tiktok_videos" FOR SELECT TO "anon" USING (true);



CREATE POLICY "authenticated_select" ON "public"."categories" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."collections" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."delivery_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."delivery_time_slots" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."delivery_zones" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."featured_products" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."festival_products" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."festivals" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."flash_deals" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."hero_slides" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."menu_items" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."pickup_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."pickup_slots" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."products" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."promo_codes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."recipe_products" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."recipes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."testimonials" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."tiktok_sync_logs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."tiktok_video_products" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."tiktok_videos" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."cart_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."carts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."catering_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."delivery_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."delivery_time_slots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."delivery_zones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."featured_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."festival_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."festivals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."flash_deals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hero_slides" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lunch_box_deliveries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lunch_box_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lunch_box_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."menu_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pickup_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pickup_slots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."print_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."promo_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipe_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."testimonials" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tiktok_sync_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tiktok_video_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tiktok_videos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_addresses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_generate_subscription_deliveries"("p_subscription_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."auto_generate_subscription_deliveries"("p_subscription_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_generate_subscription_deliveries"("p_subscription_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."bulk_generate_missing_deliveries"() TO "anon";
GRANT ALL ON FUNCTION "public"."bulk_generate_missing_deliveries"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."bulk_generate_missing_deliveries"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_next_delivery_date"("p_subscription_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_next_delivery_date"("p_subscription_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_next_delivery_date"("p_subscription_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_product_inventory"("product_id" "uuid", "requested_quantity" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."check_product_inventory"("product_id" "uuid", "requested_quantity" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_product_inventory"("product_id" "uuid", "requested_quantity" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."claim_guest_profile"("_real_user_id" "text", "_clerk_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."claim_guest_profile"("_real_user_id" "text", "_clerk_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_guest_profile"("_real_user_id" "text", "_clerk_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."deduct_product_inventory"("product_id" "uuid", "quantity" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."deduct_product_inventory"("product_id" "uuid", "quantity" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."deduct_product_inventory"("product_id" "uuid", "quantity" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_deliveries_for_subscription"("p_subscription_id" "uuid", "p_delivery_dates" "date"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_deliveries_for_subscription"("p_subscription_id" "uuid", "p_delivery_dates" "date"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_deliveries_for_subscription"("p_subscription_id" "uuid", "p_delivery_dates" "date"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_category_product_stats"("category_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_category_product_stats"("category_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_category_product_stats"("category_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_category_activation_cascade"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_category_activation_cascade"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_category_activation_cascade"() TO "service_role";



GRANT ALL ON FUNCTION "public"."restore_product_inventory"("product_id" "uuid", "quantity" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."restore_product_inventory"("product_id" "uuid", "quantity" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_product_inventory"("product_id" "uuid", "quantity" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_promo_discount_value"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_promo_discount_value"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_promo_discount_value"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_collections_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_collections_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_collections_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_delivery_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_delivery_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_delivery_settings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_delivery_time_slots_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_delivery_time_slots_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_delivery_time_slots_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_featured_products_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_featured_products_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_featured_products_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_festivals_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_festivals_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_festivals_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_flash_deals_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_flash_deals_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_flash_deals_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_hero_slides_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_hero_slides_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_hero_slides_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_lunch_box_deliveries_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_lunch_box_deliveries_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_lunch_box_deliveries_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_lunch_box_subscriptions_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_lunch_box_subscriptions_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_lunch_box_subscriptions_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_recipes_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_recipes_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_recipes_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_testimonials_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_testimonials_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_testimonials_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_tiktok_videos_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_tiktok_videos_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_tiktok_videos_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_tv_menu_boards_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_tv_menu_boards_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_tv_menu_boards_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_promo_code"("_code" "text", "_user_id" "text", "_order_amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."validate_promo_code"("_code" "text", "_user_id" "text", "_order_amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_promo_code"("_code" "text", "_user_id" "text", "_order_amount" numeric) TO "service_role";



GRANT ALL ON TABLE "public"."admin_message_templates" TO "anon";
GRANT ALL ON TABLE "public"."admin_message_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_message_templates" TO "service_role";



GRANT ALL ON TABLE "public"."cart_combo_items" TO "anon";
GRANT ALL ON TABLE "public"."cart_combo_items" TO "authenticated";
GRANT ALL ON TABLE "public"."cart_combo_items" TO "service_role";



GRANT ALL ON TABLE "public"."cart_items" TO "service_role";



GRANT ALL ON TABLE "public"."carts" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."categories" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."catering_requests" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."collections" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."collections" TO "authenticated";
GRANT ALL ON TABLE "public"."collections" TO "service_role";



GRANT ALL ON TABLE "public"."combo_items" TO "anon";
GRANT ALL ON TABLE "public"."combo_items" TO "authenticated";
GRANT ALL ON TABLE "public"."combo_items" TO "service_role";



GRANT ALL ON TABLE "public"."customer_messages" TO "anon";
GRANT ALL ON TABLE "public"."customer_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_messages" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."delivery_settings" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."delivery_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."delivery_settings" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."delivery_time_slots" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."delivery_time_slots" TO "authenticated";
GRANT ALL ON TABLE "public"."delivery_time_slots" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."delivery_zones" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."delivery_zones" TO "authenticated";
GRANT ALL ON TABLE "public"."delivery_zones" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."featured_products" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."featured_products" TO "authenticated";
GRANT ALL ON TABLE "public"."featured_products" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."festival_products" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."festival_products" TO "authenticated";
GRANT ALL ON TABLE "public"."festival_products" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."festivals" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."festivals" TO "authenticated";
GRANT ALL ON TABLE "public"."festivals" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."flash_deals" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."flash_deals" TO "authenticated";
GRANT ALL ON TABLE "public"."flash_deals" TO "service_role";



GRANT ALL ON TABLE "public"."guest_order_rate_limits" TO "anon";
GRANT ALL ON TABLE "public"."guest_order_rate_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."guest_order_rate_limits" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."hero_slides" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."hero_slides" TO "authenticated";
GRANT ALL ON TABLE "public"."hero_slides" TO "service_role";



GRANT ALL ON TABLE "public"."lunch_box_deliveries" TO "service_role";



GRANT ALL ON TABLE "public"."lunch_box_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."lunch_box_subscriptions" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."menu_items" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."menu_items" TO "authenticated";
GRANT ALL ON TABLE "public"."menu_items" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."pickup_settings" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."pickup_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."pickup_settings" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."pickup_slots" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."pickup_slots" TO "authenticated";
GRANT ALL ON TABLE "public"."pickup_slots" TO "service_role";



GRANT ALL ON TABLE "public"."print_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."product_combos" TO "anon";
GRANT ALL ON TABLE "public"."product_combos" TO "authenticated";
GRANT ALL ON TABLE "public"."product_combos" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."products" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."promo_codes" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."promo_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."promo_codes" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."recipe_products" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."recipe_products" TO "authenticated";
GRANT ALL ON TABLE "public"."recipe_products" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."recipes" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."recipes" TO "authenticated";
GRANT ALL ON TABLE "public"."recipes" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."testimonials" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."testimonials" TO "authenticated";
GRANT ALL ON TABLE "public"."testimonials" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."tiktok_sync_logs" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."tiktok_sync_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."tiktok_sync_logs" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."tiktok_video_products" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."tiktok_video_products" TO "authenticated";
GRANT ALL ON TABLE "public"."tiktok_video_products" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."tiktok_videos" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."tiktok_videos" TO "authenticated";
GRANT ALL ON TABLE "public"."tiktok_videos" TO "service_role";



GRANT ALL ON TABLE "public"."tv_menu_boards" TO "anon";
GRANT ALL ON TABLE "public"."tv_menu_boards" TO "authenticated";
GRANT ALL ON TABLE "public"."tv_menu_boards" TO "service_role";



GRANT ALL ON TABLE "public"."user_addresses" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";








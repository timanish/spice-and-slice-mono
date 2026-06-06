-- ============================================================================
-- Local test seed — runs automatically on `supabase db reset` / `supabase start`.
-- Provides enough catalog for public browsing, cart, checkout and the TV menu.
--
-- User-specific rows (profiles / admin role) are NOT seeded here because Clerk
-- user IDs are dynamic. Use:  bash scripts/sync-clerk-profile.sh <email> --admin
-- (manual testing) or the Playwright global-setup (E2E) to create them.
--
-- Fixed UUIDs are used so products/menu_items/TV board can reference each other.
-- ============================================================================

-- Idempotent: clear catalog tables so re-seeding is clean.
truncate table public.tv_menu_boards restart identity cascade;
delete from public.menu_items;
delete from public.products;
delete from public.categories;

-- --- Categories -------------------------------------------------------------
insert into public.categories (id, name, description, display_order, tax_rate, is_active, shippable_nationwide, show_on_website) values
  ('11111111-1111-1111-1111-111111111111', 'Kitchen',   'Restaurant hot kitchen dishes', 1, 0.0825, true, false, true),
  ('22222222-2222-2222-2222-222222222222', 'Meat Shop', 'Fresh halal meat',              2, 0.00, true, false, true),
  ('33333333-3333-3333-3333-333333333333', 'Groceries', 'Pantry & spices',               3, 0.0825, true, true,  true);

-- --- Products (used by the store + TV board when data_source includes products)
-- Meat Shop: one weighted item (tests the WeightSelector) + fixed-qty items.
insert into public.products
  (id, name, description, price_per_unit, category_id, is_weighted, unit_of_measure, min_order_unit, min_order_value, tax_rate, inventory_count, is_active, image_url) values
  ('a0000000-0000-0000-0000-000000000001', 'Goat Meat (bone-in)', 'Fresh halal goat, cut to order', 10.99, '22222222-2222-2222-2222-222222222222', true,  'kg', 'kg', 0.5, 0.0825, 100, true, null),
  ('a0000000-0000-0000-0000-000000000002', 'Chicken (whole)',     'Whole halal chicken',            8.49,  '22222222-2222-2222-2222-222222222222', false, 'each', 'pieces', 1, 0.00, 50, true, null),
  ('b0000000-0000-0000-0000-000000000001', 'Basmati Rice 10lb',   'Premium aged basmati',           18.99, '33333333-3333-3333-3333-333333333333', false, 'each', 'pieces', 1, 0.0825, 40, true, null),
  ('b0000000-0000-0000-0000-000000000002', 'Masala Tea 200g',     'Spiced black tea',               6.49,  '33333333-3333-3333-3333-333333333333', false, 'each', 'pieces', 1, 0.0825, 30, true, null);

-- --- Menu items (restaurant — used by TV board / lunch box) ------------------
insert into public.menu_items (id, name, price, description, category_id, is_available, is_vegetarian, is_spicy, serves_people) values
  ('c0000000-0000-0000-0000-000000000001', 'Chicken Momo (10pc)', 12.99, 'Steamed dumplings with achar', '11111111-1111-1111-1111-111111111111', true, false, true, 1),
  ('c0000000-0000-0000-0000-000000000002', 'Chicken Curry',       14.99, 'House chicken curry with rice', '11111111-1111-1111-1111-111111111111', true, false, true, 1),
  ('c0000000-0000-0000-0000-000000000003', 'Veg Thali',           13.49, 'Dal, sabji, rice, roti',        '11111111-1111-1111-1111-111111111111', true, true,  false, 1),
  ('c0000000-0000-0000-0000-000000000004', 'Sekuwa Platter',      16.99, 'Grilled marinated meat platter','11111111-1111-1111-1111-111111111111', true, false, true, 2);

-- --- Published TV menu board (data_source=both so it shows both tables) ------
insert into public.tv_menu_boards (id, name, slug, is_published, config) values
  ('d0000000-0000-0000-0000-000000000001', 'Main Board', 'main', true,
   jsonb_build_object(
     'data_source', 'both',
     'category_ids', jsonb_build_array(
       '11111111-1111-1111-1111-111111111111',
       '22222222-2222-2222-2222-222222222222'
     ),
     'excluded_item_ids', jsonb_build_array(),
     'layout', 'classic',
     'show_images', false,
     'show_descriptions', false,
     'show_prices', true,
     'columns', 2,
     'group_by_subcategory', true,
     'display_mode', 'pages',
     'auto_scroll', true,
     'scroll_speed', 'medium',
     'page_duration', 10,
     'total_screens', 1,
     'header_text', 'Our Menu',
     'footer_text', 'Prices subject to change',
     'theme', jsonb_build_object(
       'background_color', '#1a1a2e',
       'text_color', '#e0e0e0',
       'accent_color', '#FFD700',
       'category_header_color', '#FFD700',
       'price_color', '#4ade80',
       'font_size_scale', 1
     )
   ));

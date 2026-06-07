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

-- --- Published TV menu board — demos the full assembled look: Restaurant layout
-- + black/gold background template + logo header + custom numbered section labels.
-- (Background/logo are served locally from /public/tv-menu/*.png.)
insert into public.tv_menu_boards (id, name, slug, is_published, config) values
  ('d0000000-0000-0000-0000-000000000001', 'Main Board', 'main', true,
   jsonb_build_object(
     'data_source', 'both',
     'category_ids', jsonb_build_array(
       '11111111-1111-1111-1111-111111111111',
       '22222222-2222-2222-2222-222222222222'
     ),
     'excluded_item_ids', jsonb_build_array(),
     'layout', 'restaurant',
     'show_images', false,
     'show_descriptions', false,
     'show_prices', true,
     'columns', 2,
     'group_by_subcategory', false,
     'display_mode', 'static',
     'auto_scroll', false,
     'scroll_speed', 'medium',
     'page_duration', 10,
     'total_screens', 1,
     'header_text', 'Spice & Slice',
     'footer_text', 'Prices subject to change',
     'background_image_url', '/tv-menu/restaurant-template.png',
     'background_size', 'cover',
     'overlay_color', '#000000',
     'overlay_opacity', 0.2,
     'logo_image_url', '/tv-menu/logo.png',
     'logo_height', 110,
     'accent_images', jsonb_build_array(
       '/tv-menu/accents/dish1.png',
       '/tv-menu/accents/dish2.png',
       '/tv-menu/accents/dish3.png',
       '/tv-menu/accents/dish4.png'
     ),
     'show_section_numbers', true,
     'heading_font', 'Cinzel',
     'body_font', 'Inter',
     'section_labels', jsonb_build_object(
       '11111111-1111-1111-1111-111111111111', 'Kitchen Favorites',
       '22222222-2222-2222-2222-222222222222', 'Meat Counter'
     ),
     'theme', jsonb_build_object(
       'background_color', '#1a0f0a',
       'text_color', '#FFF5E1',
       'accent_color', '#FF8C00',
       'category_header_color', '#FFD700',
       'price_color', '#FFC83D',
       'font_size_scale', 1
     )
   ));

-- --- Local dev admin -------------------------------------------------------
-- Persists admin access across `db reset` for the dev Clerk user
-- timsina.anish@gmail.com. Local-only seed; the id is a Clerk DEV user id (not
-- a secret). For any OTHER account, use: scripts/sync-clerk-profile.sh <email> --admin
insert into public.profiles (id, email, full_name, profile_completed, onboarding_shown)
values ('user_37ne5C13HVWcFtoBNM68rNnbrzb', 'timsina.anish@gmail.com', 'Anish Timsina', true, true)
on conflict (id) do nothing;

insert into public.user_roles (user_id, role)
select 'user_37ne5C13HVWcFtoBNM68rNnbrzb', 'admin'
where not exists (
  select 1 from public.user_roles where user_id = 'user_37ne5C13HVWcFtoBNM68rNnbrzb'
);

insert into public.carts (user_id)
select 'user_37ne5C13HVWcFtoBNM68rNnbrzb'
where not exists (
  select 1 from public.carts where user_id = 'user_37ne5C13HVWcFtoBNM68rNnbrzb'
);

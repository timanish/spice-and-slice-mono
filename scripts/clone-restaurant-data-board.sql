-- ============================================================================
-- Editable, data-driven clone of the image-based "restaurant" (Menu 1) board.
-- Transcribes the printed menu's sections/items/prices into LOCAL categories +
-- menu_items, then creates a Restaurant-layout board at slug 'restaurant-data'.
--
-- Idempotent: re-run anytime (e.g. after `supabase db reset`):
--   docker exec -i supabase_db_spice-and-slice-bazaar psql -U postgres -d postgres \
--     < scripts/clone-restaurant-data-board.sql
--
-- Categories are TV-only (show_on_website = false) so they don't appear on the
-- storefront. Edit prices/items in /admin (Menu Items / Categories) or the DB.
-- ============================================================================
begin;

-- Fixed category ids so this is re-runnable.
\set veg     '''a1111111-0000-0000-0000-000000000001'''
\set nonveg  '''a1111111-0000-0000-0000-000000000002'''
\set momo    '''a1111111-0000-0000-0000-000000000003'''
\set tacos   '''a1111111-0000-0000-0000-000000000004'''
\set combo   '''a1111111-0000-0000-0000-000000000005'''

delete from public.tv_menu_boards where slug = 'restaurant-data';
delete from public.menu_items where category_id in (:veg, :nonveg, :momo, :tacos, :combo);
delete from public.categories  where id        in (:veg, :nonveg, :momo, :tacos, :combo);

insert into public.categories (id, name, description, display_order, tax_rate, is_active, shippable_nationwide, show_on_website) values
  (:veg,    'Appetizer - Veg',         'TV menu', 1, 0.0825, true, false, false),
  (:nonveg, 'Appetizer - Non Veg',     'TV menu', 2, 0.0825, true, false, false),
  (:momo,   'Momo',                    'TV menu', 3, 0.0825, true, false, false),
  (:tacos,  'Tacos',                   'TV menu', 4, 0.0825, true, false, false),
  (:combo,  'Combo Platter / Special', 'TV menu', 5, 0.0825, true, false, false);

insert into public.menu_items (name, price, category_id, is_available, is_vegetarian, is_spicy, display_order) values
  -- 1. Appetizer - Veg (display_order preserves the printed-menu sequence)
  ('Samosa',        5.99,  :veg, true, true,  false, 1),
  ('Samosa Chaat',  9.99,  :veg, true, true,  false, 2),
  ('Pani Puri',     6.99,  :veg, true, true,  false, 3),
  ('Chatpate',      6.99,  :veg, true, true,  false, 4),
  ('Mustang Aloo',  9.99,  :veg, true, true,  false, 5),
  ('Paneer Chilli', 10.99, :veg, true, true,  false, 6),
  ('Aloo Chilli',   10.99, :veg, true, true,  false, 7),
  ('Paneer 65',     10.99, :veg, true, true,  false, 8),
  ('Chowmein',      9.99,  :veg, true, true,  false, 9),
  -- 2. Appetizer - Non Veg
  ('Sukuti Chatpate',      13.99, :nonveg, true, false, true, 1),
  ('Fried Chicken Wings',  13.99, :nonveg, true, false, true, 2),
  ('Timur Chicken Fry',    13.99, :nonveg, true, false, true, 3),
  ('Chicken Sheekh Kebab', 12.99, :nonveg, true, false, true, 4),
  ('Chicken 65',           11.99, :nonveg, true, false, true, 5),
  ('Chicken Chilli',       11.99, :nonveg, true, false, true, 6),
  ('Chicken Roast',        11.99, :nonveg, true, false, true, 7),
  ('Chicken Chowmein',     11.99, :nonveg, true, false, true, 8),
  ('Kerala Fried Chicken', 12.99, :nonveg, true, false, true, 9),
  -- 3. Momo
  ('Steamed Chicken Momo', 9.99,  :momo, true, false, false, 1),
  ('Chilli Chicken Momo',  10.99, :momo, true, false, true,  2),
  ('Kothey Momo',          10.99, :momo, true, false, false, 3),
  ('Fried Momo',           10.99, :momo, true, false, false, 4),
  ('Jhol Momo',            10.99, :momo, true, false, false, 5),
  -- 4. Tacos
  ('Mutton Choila Tacos',  9.99, :tacos, true, false, true, 1),
  ('Chicken Choila Tacos', 8.99, :tacos, true, false, true, 2),
  ('Chicken Tikka Tacos',  8.99, :tacos, true, false, true, 3),
  ('Paneer Tikka Tacos',   7.99, :tacos, true, true,  true, 4),
  -- 6. Combo Platter / Special
  ('Combo Platter',     19.99, :combo, true, false, false, 1),
  ('Sukuti Set',        17.99, :combo, true, false, false, 2),
  ('Mutton Choila Set', 17.99, :combo, true, false, false, 3),
  ('Mutton Sekuwa Set', 17.99, :combo, true, false, false, 4),
  ('Mutton Tass Set',   17.99, :combo, true, false, false, 5),
  ('Hyakula Set',       18.99, :combo, true, false, false, 6);

insert into public.tv_menu_boards (name, slug, is_published, config) values
  ('Restaurant (data-driven)', 'restaurant-data', true,
   jsonb_build_object(
     'data_source', 'menu_items',
     'category_ids', jsonb_build_array(:veg, :nonveg, :momo, :tacos, :combo),
     'excluded_item_ids', jsonb_build_array(),
     'layout', 'restaurant',
     'show_images', false,
     'show_descriptions', false,
     'show_prices', true,
     'columns', 3,
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
     'overlay_opacity', 0.25,
     'logo_image_url', '/tv-menu/logo.png',
     'logo_height', 96,
     'show_section_numbers', false,
     'heading_font', 'Cinzel',
     'body_font', 'Inter',
     -- Match the printed menu's numbering exactly (1,2,3,4,6).
     'section_labels', jsonb_build_object(
       :veg,    '1. Appetizer - Veg',
       :nonveg, '2. Appetizer - Non Veg',
       :momo,   '3. Momo',
       :tacos,  '4. Tacos',
       :combo,  '6. Combo Platter / Special'
     ),
     'full_width_category_ids', jsonb_build_array(:combo),
     'theme', jsonb_build_object(
       'background_color', '#1a0f0a',
       'text_color', '#FFF5E1',
       'accent_color', '#FF8C00',
       'category_header_color', '#FFD700',
       'price_color', '#FFC83D',
       'font_size_scale', 1
     )
   ));

commit;

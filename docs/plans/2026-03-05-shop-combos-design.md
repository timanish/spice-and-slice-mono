# Shop Combos Feature Design

## Overview

Admin-configurable product combos displayed prominently on the homepage. Combos are fixed-price bundles with optional paid add-ons. They appear as a single collapsible line item in the cart.

## Database Schema

### `product_combos`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| name | text, not null | e.g. "Chicken-Goat Combo" |
| description | text | |
| image_url | text | |
| combo_price | numeric, not null | Fixed bundle price (e.g. 74.00) |
| is_active | boolean, default true | |
| display_order | integer, default 0 | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `combo_items`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| combo_id | uuid, FK -> product_combos | |
| product_id | uuid, FK -> products | |
| quantity | numeric | e.g. 2 for "2 whole chicken" |
| weight | numeric, nullable | e.g. 5 for "5 lb goat" |
| is_addon | boolean, default false | true = optional paid add-on |
| addon_price | numeric, nullable | Extra cost when add-on selected (e.g. 24.99) |
| position | integer, default 0 | Display order within combo |

### `cart_combo_items`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| cart_id | uuid, FK -> carts | |
| combo_id | uuid, FK -> product_combos | |
| quantity | integer, default 1 | How many of this combo |
| selected_addon_ids | jsonb, default [] | Array of combo_items.id for toggled-on add-ons |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### Example Data

Chicken-Goat Combo ($74):
- combo_items row 1: Goat meat, weight=5, is_addon=false
- combo_items row 2: Whole chicken, quantity=2, is_addon=false
- combo_items row 3: Frozen momo, quantity=50, is_addon=true, addon_price=24.99

## Homepage Layout

Split the area below hero into two columns:

```
|-------------------------------|
|          Hero Section         |
|-------------------------------|
| Shop Combos (60%) | TikTok (40%) |
| - Combo cards     | - 2-3 videos |
| - Stacked vertical|   compact    |
|-------------------------------|
|    Search -> Collections -> ... |
```

Mobile: Stack vertically, combos on top, TikTok below.

### Combo Card UI

- Combo image, name, price in bold
- "You save $X" badge (savings vs buying individually)
- List of included items
- Add-on toggles: checkbox/switch for each optional add-on with price
- "Add to Cart" button showing total (base + selected add-ons)
- Quantity selector when already in cart

## Cart Handling

### Store Changes (Zustand)

- New `comboItems` array alongside existing `items`
- New actions: `addCombo()`, `removeCombo()`, `updateComboQuantity()`, `toggleComboAddon()`
- Cart total = sum(regular items) + sum(combo_price * qty + selected addon prices * qty)

### Cart Display

- Combo renders as collapsible single row: "Chicken-Goat Combo x2 -- $148"
- Expand to see contents (view-only, no individual modification)
- Selected add-ons shown with checkmark
- Quantity +/- controls on collapsed row
- Remove button removes entire combo

### Edge Function Changes

Extend `user-data` edge function with:
- `cart.addCombo` -- insert into cart_combo_items
- `cart.removeCombo` -- delete from cart_combo_items
- `cart.updateComboQuantity` -- update quantity
- `cart.toggleComboAddon` -- update selected_addon_ids jsonb

`fetchCart` response includes both `cart_items` and `cart_combo_items` (with joined combo + product data).

## Admin Page (`/admin/combos`)

Under Marketing section in sidebar.

- Card-based list of combos with active/inactive toggle
- Create/Edit dialog:
  - Name, description, image upload
  - Combo price input
  - Product search to add items (reuse flash deals pattern)
  - Per item: quantity or weight
  - Add-on toggle per item with addon_price input
  - Display order
- Delete with confirmation
- Uses existing `useAdminCrud` hook pattern

## Checkout Flow

- Cart summary includes combo line items with expandable details
- Order stores combo info so order history shows "Chicken-Goat Combo" not individual items

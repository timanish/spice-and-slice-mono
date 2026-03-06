# Shop Combos Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Admin-configurable product combos with optional add-ons, displayed on the homepage and handled as single collapsible line items in the cart.

**Architecture:** New DB tables (product_combos, combo_items, cart_combo_items) + homepage section with side-by-side TikTok layout + Zustand combo cart state + edge function CRUD + admin management page. Combos are independent from regular cart items.

**Tech Stack:** React, TypeScript, Tailwind, Zustand, Supabase (Postgres + Edge Functions), React Query, Shadcn UI, Lucide icons.

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260305000001_create_product_combos.sql`

**Step 1: Write the migration SQL**

```sql
-- Product combos table
CREATE TABLE IF NOT EXISTS public.product_combos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  combo_price NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Combo items (contents + add-ons)
CREATE TABLE IF NOT EXISTS public.combo_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id UUID NOT NULL REFERENCES public.product_combos(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 1,
  weight NUMERIC,
  is_addon BOOLEAN DEFAULT false,
  addon_price NUMERIC,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Cart combo items
CREATE TABLE IF NOT EXISTS public.cart_combo_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  combo_id UUID NOT NULL REFERENCES public.product_combos(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  selected_addon_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_combo_items_combo_id ON public.combo_items(combo_id);
CREATE INDEX IF NOT EXISTS idx_cart_combo_items_cart_id ON public.cart_combo_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_product_combos_active ON public.product_combos(is_active) WHERE is_active = true;

-- Disable RLS (service role access via edge functions)
ALTER TABLE public.product_combos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_combo_items DISABLE ROW LEVEL SECURITY;

-- Updated_at triggers
CREATE TRIGGER update_product_combos_updated_at
  BEFORE UPDATE ON public.product_combos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cart_combo_items_updated_at
  BEFORE UPDATE ON public.cart_combo_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Step 2: Apply the migration**

Run: `npx supabase db push` (or apply via Supabase dashboard SQL editor)

**Step 3: Regenerate Supabase types**

Run: `npx supabase gen types typescript --project-id <project-id> > src/integrations/supabase/types.ts`

Note: If gen types is not configured, manually add the type definitions inline where needed.

**Step 4: Commit**

```
feat: add product_combos, combo_items, and cart_combo_items tables
```

---

### Task 2: Combo Cart Types & Zustand Store

**Files:**
- Modify: `src/stores/cart/types.ts`
- Create: `src/stores/cart/operations/comboOperations.ts`
- Modify: `src/stores/cart/store.ts`
- Create: `src/stores/cart/operations/index.ts` (if needed to re-export)

**Step 1: Add CartComboItem type to `src/stores/cart/types.ts`**

After the `CartItem` interface, add:

```typescript
export interface ComboItemDetail {
  id: string;
  product_id: string;
  quantity: number;
  weight?: number;
  is_addon: boolean;
  addon_price?: number;
  position: number;
  product: {
    name: string;
    price_per_unit: number;
    image_url?: string;
    is_weighted?: boolean;
    unit_of_measure?: string;
  };
}

export interface CartComboItem {
  id: string;
  combo_id: string;
  quantity: number;
  selected_addon_ids: string[];
  combo: {
    name: string;
    description?: string;
    image_url?: string;
    combo_price: number;
    items: ComboItemDetail[];
  };
}
```

Add to `CartStore` interface:

```typescript
comboItems: CartComboItem[];
addCombo: (comboId: string, selectedAddonIds?: string[]) => Promise<void>;
removeCombo: (cartComboItemId: string) => Promise<void>;
updateComboQuantity: (cartComboItemId: string, quantity: number) => Promise<void>;
toggleComboAddon: (cartComboItemId: string, addonId: string) => Promise<void>;
```

**Step 2: Create combo operations at `src/stores/cart/operations/comboOperations.ts`**

```typescript
import { fetchWithAuth } from "@/lib/auth-token";
import { CartStoreState } from "../store";
import { CartComboItem } from "../types";
import { fetchCart } from "./fetchCart";

export const addCombo = async (
  comboId: string,
  selectedAddonIds: string[],
  set: (state: Partial<CartStoreState>) => void,
  get: () => CartStoreState,
) => {
  set({ hasError: false, errorMessage: null });

  try {
    const res = await fetchWithAuth("user-data", {
      action: "cart.addCombo",
      combo_id: comboId,
      selected_addon_ids: selectedAddonIds,
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to add combo to cart");

    // Refresh full cart to get shaped combo data
    await fetchCart(set, get, true);
  } catch (error) {
    console.error("Error adding combo to cart:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to add combo";
    set({ hasError: true, errorMessage });
  }
};

export const removeCombo = async (
  cartComboItemId: string,
  set: (state: Partial<CartStoreState>) => void,
  get: () => CartStoreState,
) => {
  // Optimistic removal
  const currentCombos = [...get().comboItems];
  set({
    comboItems: currentCombos.filter((c) => c.id !== cartComboItemId),
    hasError: false,
    errorMessage: null,
  });

  try {
    const res = await fetchWithAuth("user-data", {
      action: "cart.removeCombo",
      id: cartComboItemId,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to remove combo");
  } catch (error) {
    console.error("Error removing combo:", error);
    set({ comboItems: currentCombos, hasError: true, errorMessage: (error as Error).message });
  }
};

export const updateComboQuantity = async (
  cartComboItemId: string,
  quantity: number,
  set: (state: Partial<CartStoreState>) => void,
  get: () => CartStoreState,
) => {
  if (quantity <= 0) {
    return removeCombo(cartComboItemId, set, get);
  }

  // Optimistic update
  const currentCombos = [...get().comboItems];
  set({
    comboItems: currentCombos.map((c) =>
      c.id === cartComboItemId ? { ...c, quantity } : c
    ),
    hasError: false,
    errorMessage: null,
  });

  try {
    const res = await fetchWithAuth("user-data", {
      action: "cart.updateComboQuantity",
      id: cartComboItemId,
      quantity,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to update combo quantity");
  } catch (error) {
    console.error("Error updating combo quantity:", error);
    set({ comboItems: currentCombos, hasError: true, errorMessage: (error as Error).message });
  }
};

export const toggleComboAddon = async (
  cartComboItemId: string,
  addonId: string,
  set: (state: Partial<CartStoreState>) => void,
  get: () => CartStoreState,
) => {
  const currentCombos = [...get().comboItems];
  const combo = currentCombos.find((c) => c.id === cartComboItemId);
  if (!combo) return;

  const currentAddons = [...combo.selected_addon_ids];
  const newAddons = currentAddons.includes(addonId)
    ? currentAddons.filter((id) => id !== addonId)
    : [...currentAddons, addonId];

  // Optimistic update
  set({
    comboItems: currentCombos.map((c) =>
      c.id === cartComboItemId ? { ...c, selected_addon_ids: newAddons } : c
    ),
    hasError: false,
    errorMessage: null,
  });

  try {
    const res = await fetchWithAuth("user-data", {
      action: "cart.toggleComboAddon",
      id: cartComboItemId,
      selected_addon_ids: newAddons,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to toggle addon");
  } catch (error) {
    console.error("Error toggling addon:", error);
    set({ comboItems: currentCombos, hasError: true, errorMessage: (error as Error).message });
  }
};
```

**Step 3: Update `src/stores/cart/store.ts`**

Add `comboItems: []` to initial state. Add the four combo methods that delegate to comboOperations. Follow the same pattern as existing addToCart/removeFromCart.

**Step 4: Update `fetchCart` operation**

Modify `src/stores/cart/operations/fetchCart.ts` to also set `comboItems` from the server response. The edge function (Task 3) will return both `data` (regular items) and `comboData` (combo items).

**Step 5: Update `src/stores/cart/utils.ts`**

Update `fetchCartViaEdge` to return combo items alongside regular items from the response.

**Step 6: Commit**

```
feat: add combo cart types and Zustand store operations
```

---

### Task 3: Edge Function - Combo Cart Actions

**Files:**
- Modify: `supabase/functions/user-data/index.ts`

**Step 1: Add combo handler functions**

After the existing cart handlers (after `handleCartRemoveItem`), add:

```typescript
async function handleCartAddCombo(db: any, userId: string, payload: any) {
  const cartId = await getOrCreateCart(db, userId);

  const { data, error } = await db
    .from("cart_combo_items")
    .insert({
      cart_id: cartId,
      combo_id: payload.combo_id,
      quantity: 1,
      selected_addon_ids: payload.selected_addon_ids || [],
    })
    .select()
    .single();
  if (error) throw error;
  return jsonResponse({ data }, 201);
}

async function handleCartRemoveCombo(db: any, userId: string, payload: any) {
  if (!payload.id) return errorResponse("Missing cart combo item id");
  const cartId = await getOrCreateCart(db, userId);

  const { error } = await db
    .from("cart_combo_items")
    .delete()
    .eq("id", payload.id)
    .eq("cart_id", cartId);
  if (error) throw error;
  return jsonResponse({ success: true });
}

async function handleCartUpdateComboQuantity(db: any, userId: string, payload: any) {
  if (!payload.id) return errorResponse("Missing cart combo item id");
  const cartId = await getOrCreateCart(db, userId);

  if (payload.quantity <= 0) {
    const { error } = await db
      .from("cart_combo_items")
      .delete()
      .eq("id", payload.id)
      .eq("cart_id", cartId);
    if (error) throw error;
    return jsonResponse({ success: true, removed: true });
  }

  const { data, error } = await db
    .from("cart_combo_items")
    .update({ quantity: payload.quantity })
    .eq("id", payload.id)
    .eq("cart_id", cartId)
    .select()
    .single();
  if (error) throw error;
  return jsonResponse({ data });
}

async function handleCartToggleComboAddon(db: any, userId: string, payload: any) {
  if (!payload.id) return errorResponse("Missing cart combo item id");
  const cartId = await getOrCreateCart(db, userId);

  const { data, error } = await db
    .from("cart_combo_items")
    .update({ selected_addon_ids: payload.selected_addon_ids })
    .eq("id", payload.id)
    .eq("cart_id", cartId)
    .select()
    .single();
  if (error) throw error;
  return jsonResponse({ data });
}
```

**Step 2: Update `handleCartGet` to also fetch combo items**

After fetching regular cart_items, add:

```typescript
  // Fetch combo items
  const { data: comboCartItems, error: comboError } = await db
    .from("cart_combo_items")
    .select(`
      id,
      combo_id,
      quantity,
      selected_addon_ids,
      product_combos:combo_id (
        id, name, description, image_url, combo_price
      )
    `)
    .eq("cart_id", cartId);

  if (comboError) throw comboError;

  // For each combo cart item, fetch its combo_items with product details
  const shapedCombos = await Promise.all(
    (comboCartItems || []).map(async (cci: any) => {
      const { data: items } = await db
        .from("combo_items")
        .select(`
          id, product_id, quantity, weight, is_addon, addon_price, position,
          products:product_id (id, name, price_per_unit, image_url, is_weighted, unit_of_measure)
        `)
        .eq("combo_id", cci.combo_id)
        .order("position");

      return {
        id: cci.id,
        combo_id: cci.combo_id,
        quantity: cci.quantity,
        selected_addon_ids: cci.selected_addon_ids || [],
        combo: {
          ...cci.product_combos,
          items: (items || []).map((i: any) => ({
            ...i,
            product: i.products,
          })),
        },
      };
    })
  );
```

Update the return to: `return jsonResponse({ data: shaped, comboData: shapedCombos, cartId });`

**Step 3: Register new action handlers**

Add to `actionHandlers` object:

```typescript
  "cart.addCombo": handleCartAddCombo,
  "cart.removeCombo": handleCartRemoveCombo,
  "cart.updateComboQuantity": handleCartUpdateComboQuantity,
  "cart.toggleComboAddon": handleCartToggleComboAddon,
```

**Step 4: Update cart clearing in `create-cash-order/index.ts`**

After clearing `cart_items`, also clear `cart_combo_items`:

```typescript
    if (userCart?.id) {
      await serviceClient.from("cart_items").delete().eq("cart_id", userCart.id);
      await serviceClient.from("cart_combo_items").delete().eq("cart_id", userCart.id);
    }
```

**Step 5: Commit**

```
feat: add combo cart edge function handlers and update cart.get
```

---

### Task 4: Homepage Section - ShopCombosSection Component

**Files:**
- Create: `src/components/home/ShopCombosSection.tsx`
- Modify: `src/pages/Index.tsx`

**Step 1: Create `src/components/home/ShopCombosSection.tsx`**

Key structure:
- Fetch active combos: `useQuery` from `product_combos` where `is_active = true`, joined with `combo_items` and their products
- Display combo cards vertically stacked
- Each card shows: name, image, combo price, "You save $X" badge, list of included items, add-on toggles, Add to Cart button
- Uses `useCartStore` for `addCombo`
- Auth check before add (same as ProductCard pattern)

Data fetching query:

```typescript
const { data: combos } = useQuery({
  queryKey: ["active-combos"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("product_combos")
      .select(`
        *,
        combo_items (
          id, product_id, quantity, weight, is_addon, addon_price, position,
          products:product_id (id, name, price_per_unit, image_url, is_weighted, unit_of_measure)
        )
      `)
      .eq("is_active", true)
      .order("display_order");
    if (error) throw error;
    return data;
  },
});
```

Each combo card:
- Calculate individual price sum for "You save $X" badge
- Checkboxes for add-ons with addon_price display
- Track selected add-on IDs in local state per combo
- "Add to Cart" calls `addCombo(combo.id, selectedAddonIds)`
- Show quantity controls if combo is already in cart

**Step 2: Update `src/pages/Index.tsx`**

Replace the standalone `<TikTokSection />` with a side-by-side layout:

```tsx
import ShopCombosSection from '@/components/home/ShopCombosSection';

// Replace: <TikTokSection />
// With:
<section className="py-8 md:py-12 px-4 max-w-7xl mx-auto">
  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
    <div className="lg:col-span-3">
      <ShopCombosSection />
    </div>
    <div className="lg:col-span-2">
      <TikTokSection compact />
    </div>
  </div>
</section>
```

**Step 3: Update TikTokSection to accept `compact` prop**

Modify `src/components/home/TikTokSection.tsx`:
- Accept `compact?: boolean` prop
- When `compact=true`: show fewer videos (2-3 max), remove product showcase, use simpler vertical layout, remove section padding (parent handles it)
- When `compact=false` (default): render as today for backward compat

**Step 4: Commit**

```
feat: add ShopCombosSection with side-by-side TikTok layout on homepage
```

---

### Task 5: Cart Display - Combo Line Items

**Files:**
- Create: `src/components/shopping-cart/CartComboItem.tsx`
- Modify: `src/components/shopping-cart/cart-content/CartItemList.tsx`
- Modify: `src/components/shopping-cart/CartContent.tsx`

**Step 1: Create `src/components/shopping-cart/CartComboItem.tsx`**

Collapsible combo display component:

```typescript
interface CartComboItemProps {
  item: CartComboItem;
  onRemove: () => void;
  onUpdateQuantity: (quantity: number) => void;
}
```

Structure:
- Collapsed: combo name, quantity controls (+/-), total price, expand chevron
- Expanded: list of included items (name, quantity/weight) as read-only rows, selected add-ons with checkmark
- Total = (combo.combo_price + sum of selected addon prices) * quantity
- Remove button
- Use `useState` for expanded/collapsed toggle
- Style consistent with existing CartItem (bg-white rounded-lg p-4 border)

**Step 2: Update `CartItemList.tsx`**

Import `CartComboItem` and `CartComboItem` type. Accept new prop `comboItems`. Render combo items after regular items:

```tsx
interface CartItemListProps {
  items: CartItemType[];
  comboItems: CartComboItemType[];
  onRemoveItem: (productId: string) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveCombo: (cartComboItemId: string) => void;
  onUpdateComboQuantity: (cartComboItemId: string, quantity: number) => void;
}
```

**Step 3: Update `CartContent.tsx`**

- Pull `comboItems`, `removeCombo`, `updateComboQuantity` from `useCartStore`
- Include combo totals in subtotal calculation:

```typescript
const comboSubtotal = comboItems.reduce((sum, item) => {
  const addonTotal = item.combo.items
    .filter((ci) => ci.is_addon && item.selected_addon_ids.includes(ci.id))
    .reduce((s, ci) => s + (ci.addon_price || 0), 0);
  return sum + (item.combo.combo_price + addonTotal) * item.quantity;
}, 0);

const totalSubtotal = subtotal + comboSubtotal;
```

- Pass comboItems and handlers to CartItemList
- Update empty cart check: `items.length === 0 && comboItems.length === 0`

**Step 4: Commit**

```
feat: add collapsible combo line items in cart drawer
```

---

### Task 6: Admin Page - Shop Combos Management

**Files:**
- Create: `src/pages/AdminShopCombosPage.tsx`
- Modify: `src/components/admin/AdminSidebar.tsx`
- Modify: `src/App.tsx`

**Step 1: Create `src/pages/AdminShopCombosPage.tsx`**

Follow the AdminFlashDealsPage pattern:
- `useQuery` to fetch all combos with their items
- `useMutation` for create/update/delete using `useAdminCrud` hook
- Dialog form with:
  - Name, description, image_url inputs
  - Combo price input (numeric)
  - Display order input
  - Active toggle switch
  - Product search (reuse pattern from flash deals: search products by name with `.ilike()`)
  - Add product button -> adds to local items list
  - For each item: quantity input, weight input (if weighted), is_addon toggle, addon_price input (shown when is_addon=true)
  - Remove item button
- Card list showing all combos:
  - Combo name, price, active status badge
  - Number of items + add-ons count
  - Edit/Delete buttons
- Use `queryClient.invalidateQueries({ queryKey: ["admin-combos"] })` on mutations

Combo creation flow:
1. Insert into `product_combos` table -> get combo ID
2. Insert all `combo_items` rows with the combo ID
3. For update: delete existing combo_items, re-insert new ones (simpler than diffing)

**Step 2: Add route to `src/App.tsx`**

After the flash-deals route, add:

```tsx
<Route path="/admin/shop-combos" element={
  <AdminGuard>
    <AdminShopCombosPage />
  </AdminGuard>
} />
```

Import: `import AdminShopCombosPage from "./pages/AdminShopCombosPage";`

**Step 3: Add nav item to `src/components/admin/AdminSidebar.tsx`**

In the Marketing section items array, add after "Featured Products":

```typescript
{ label: "Shop Combos", path: "/admin/shop-combos", icon: ShoppingBag },
```

`ShoppingBag` is already imported.

**Step 4: Commit**

```
feat: add admin Shop Combos management page
```

---

### Task 7: Checkout Integration

**Files:**
- Modify: `supabase/functions/create-cash-order/index.ts`
- Check: `src/pages/Checkout.tsx` (ensure combo totals are included)

**Step 1: Update order creation to include combo items**

In `create-cash-order`, after creating regular order_items, also create order items from combo cart items:

- Fetch `cart_combo_items` for the user's cart
- For each combo: create order_items for each product in the combo (with the combo's proportional pricing or a reference)
- Alternative simpler approach: store combo as a single order_item with a `combo_id` reference and the combo_price as the price_per_unit

**Step 2: Clear combo cart items on checkout**

Already addressed in Task 3 Step 4.

**Step 3: Commit**

```
feat: include combo items in order creation and clear on checkout
```

---

### Task 8: Final Integration Testing & Polish

**Step 1:** Verify full flow:
1. Admin creates a combo with items and add-ons
2. Combo appears on homepage
3. Customer adds combo to cart (with/without add-ons)
4. Cart shows combo as collapsible single line
5. Quantity can be increased
6. Checkout includes combo in order total
7. Cart clears after order

**Step 2:** Verify edge cases:
- Adding same combo twice (should create separate cart entries or increment quantity)
- Removing add-on from cart combo
- Empty combos section (no active combos -> section hidden)
- Mobile responsiveness of side-by-side layout

**Step 3:** Type check

Run: `npx tsc --noEmit`

**Step 4: Commit**

```
feat: shop combos feature complete with admin, cart, and checkout integration
```

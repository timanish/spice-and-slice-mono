---
name: checkout-phase11
description: Phase 11 checkout features — customer order modifications, tax fix, Stripe weighted item fix
type: project
---

Phase 11 implemented on 2026-04-06. CHECKOUT_WORKFLOW.md updated to reflect all changes.

**What was built:**

1. **Customer per-item accept/reject** (`OrderConfirmPage.tsx`): For each admin-adjusted item, customer sees a "Revert" toggle button. When toggled, the item shows original quantity. Customer can then submit changes for re-review.

2. **Customer can add items** (`OrderConfirmPage.tsx`): Product search (uses `fetchAllProducts` with client-side filtering, 300ms debounce). Select a product, set integer quantity, add to pending list. Items show in "Items You're Adding" card.

3. **Submit Changes for Review** (`OrderConfirmPage.tsx` + `confirm-customer-order`): New `action='submit_modifications'` endpoint. Sends `{ rejectedItemIds, newItems, customerNotes }`. Reverts rejected items to original, inserts new items, recalculates totals, sets order back to `pending_review`, invalidates token, notifies admin. Button only enabled when `hasAnyChanges` is true (rejections, new items, or notes).

4. **Tax recalculation fix** (`admin-adjust-order`): When admin changes `price_per_unit`, the code now also updates `order_items.tax_amount` by fetching the product's `tax_rate`. Also updates `orders.tax_amount` in the totals recalculation. Fixed in both the `adjust_items` and embedded `send_for_confirmation` adjustment blocks.

5. **Stripe weighted item fix** (`confirm-customer-order`): Was using `quantity=Math.round(qty*100), unit_amount=price*100` which multiplied total by 100. Fixed to `quantity=1, unit_amount=Math.round(qty*price*100)`. Non-weighted items unchanged (`unit_amount=price*100, quantity=item.quantity`).

6. **DB migration**: `20260407000001_add_customer_notes_to_orders.sql` adds `customer_notes TEXT` to orders table.

**Key files changed:**
- `supabase/migrations/20260407000001_add_customer_notes_to_orders.sql` — new
- `supabase/functions/admin-adjust-order/index.ts` — tax recalc fix
- `supabase/functions/confirm-customer-order/index.ts` — Stripe fix + submit_modifications action
- `src/pages/OrderConfirmPage.tsx` — full interactive UI
- `CHECKOUT_WORKFLOW.md` — updated to Phase 11

**Why:** Customer needed agency in the confirmation phase to accept/reject admin changes per line-item and add items, rather than accept-all-or-contact-support. Tax calculation was silently wrong when admin adjusted prices. Stripe amounts were 100× wrong for weighted items (e.g. 2.5kg chicken was charging $2500 instead of $25).

**How to apply:** When working on checkout/order confirmation flow, check CHECKOUT_WORKFLOW.md for the full status state machine. The loop is: `pending_review → awaiting_customer_confirmation → (customer modifies) → pending_review` until customer accepts all.

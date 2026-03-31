# Checkout Workflow Documentation

**Last Updated:** 2026-03-31
**Current Version:** Phase 10 (Admin Review Flow + Customer Confirmation)

---

## Overview

The checkout workflow has been significantly restructured (Phases 2-10). All orders now go through an **admin review process** before customers complete payment, regardless of payment method or fulfillment type.

**Key Insight:** The workflow is **identical for cash and card payments** at the customer-facing level. The difference is only in how payment is processed after admin approval.

---

## The Complete Workflow (All Payment Methods + Fulfillment Types)

```
1. Customer at Checkout Page
   ↓
2. [UNIFIED] Call create-pending-order (regardless of payment method)
   ↓
3. Order created in "pending_review" status
   ↓
4. Customer sees OrderPendingPage (waiting for admin review)
   ↓
5. Admin reviews order in AdminOrdersManagementPage
   ↓
6. Admin either:
   a) Adjusts items/amounts (admin-adjust-order)
   b) Sends for customer confirmation (admin-update-order → awaiting_customer_confirmation)
   ↓
7. Customer receives confirmation email with link
   ↓
8. [DIFFERENT PATHS HERE]

   IF CASH PAYMENT:
   ├─ Customer clicks confirmation link
   ├─ Call confirm-customer-order (validates token)
   ├─ Order status: confirmed
   ├─ Print job created
   ├─ Payment status: completed (no actual payment)
   └─ Customer shows up to pickup/receives delivery

   IF CARD PAYMENT:
   ├─ Customer clicks confirmation link or button
   ├─ Call confirm-customer-order (validates token)
   ├─ Stripe checkout session created
   ├─ Customer redirected to Stripe payment page
   ├─ After payment success
   ├─ complete-stripe-order webhook processes payment
   ├─ Order status: confirmed
   └─ Print job created
```

---

## Phase Timeline: How We Got Here

### Phase 2: Admin Review Workflow Foundation
- **Commit:** `fba81f8 feat(admin-review-flow): add database schema for order review workflow`
- Created new database schema for admin review
- Added orders table fields: `fulfillment_status`, `confirmation_token`, `confirmation_token_expires_at`

### Phase 5: Complete Stripe Order Integration
- **Commit:** `50f225e feat(phase-5): update complete-stripe-order for admin review flow`
- Updated Stripe completion to work with new flow
- Added payment status management

### Phase 7: Checkout Flow Cut-Over
- **Commit:** `7e4a65e feat(phase-7): implement checkout flow cut-over to admin review`
- **Major change:** Both card and cash now call `create-pending-order`
- Removed separate `create-checkout` and `create-cash-order` logic
- Created `OrderPendingPage` to show "admin is reviewing" state
- Now navigates to `/order-pending/:orderId` instead of payment page

### Phase 8: Order Confirmation Page
- **Commit:** `31872f2 feat(phase-8): add order confirmation page with token-based access`
- Created `OrderConfirmPage` for customers to confirm after admin review
- Token-based validation (works without login if you have the email link)
- Shows what admin adjusted (if anything)

### Phase 9: Admin Review UI
- **Commit:** `ebd44eb feat(phase-9): add admin review UI for pending orders`
- Admin dashboard for reviewing/adjusting orders
- Admin can adjust items, amounts, dates
- Admin sends for confirmation

### Phase 10: Customer-Facing Order Status UI
- **Commit:** `6e50446 feat(phase-10): add customer-facing UI for new order statuses`
- Updated OrderDetailsPage to show status badges
- Updated OrderHistory to show action buttons
- Shows "awaiting confirmation" status with button

---

## The Unified Checkout Flow (CheckoutPage.tsx)

### Step 1: Collect Order Data

```typescript
const requestBody = {
  cartItems: enrichedCartItems,
  comboCartItems: comboItems,
  paymentMethod: paymentMethod,        // "card" or "cash"
  fulfillmentType: fulfillmentType,    // "delivery", "pickup", or "nationwide"
  addressId: selectedAddressId,         // Only for delivery/nationwide
  deliveryDate: deliveryDate,           // Only for delivery
  deliveryTime: deliveryTime,           // Only for delivery
  pickupDate: pickupDate,               // Only for pickup
  pickupTime: pickupTime,               // Only for pickup
  promoCode: promoCode,
};
```

**Key:** No distinction between card/cash at this point. Same endpoint for both.

### Step 2: Call `create-pending-order`

```typescript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/create-pending-order`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,  // Clerk JWT
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  }
);
```

### Step 3: Navigate to Pending Page

```typescript
navigate(`/order-pending/${orderResult.orderId}`);
```

Customer sees: "Your order is being reviewed. We'll email you shortly."

---

## Edge Function Flow

### create-pending-order (Line 285-313)

```typescript
// ✅ SAME for both cash and card
const { data: order, error: orderError } = await serviceClient
  .from("orders")
  .insert({
    user_id: userId,
    total_amount: totalAmount,
    fulfillment_status: "pending_review",  // ← Same status for all
    payment_status: "pending",              // ← Same for all
    payment_method: paymentMethod,          // "card" or "cash" - stored but not used yet
    fulfillment_type: fulfillmentType,
    address_id: addressId || null,
    delivery_date: deliveryDate || null,
    delivery_time: deliveryTime || null,
    pickup_date: pickupDate || null,
    pickup_time: pickupTime || null,
    promo_code_id: finalPromoCodeId,
    discount_amount: finalPromoDiscount,
    delivery_fee: deliveryFee,
    tax_amount: taxAmount,
    // ... other fields
  })
  .select()
  .single();
```

**Return:** `{ orderId, status: 'pending_review' }`

### Admin Review Phase (admin-update-order)

Admin can:
- View order in AdminOrdersManagementPage
- Adjust items (admin-adjust-order)
- Change dates/times
- Then send for confirmation

When admin clicks "Send for Confirmation":

```typescript
// Update order status
await serviceClient
  .from("orders")
  .update({
    fulfillment_status: "awaiting_customer_confirmation",
    confirmation_token: generateToken(),
    confirmation_token_expires_at: expiresIn48Hours(),
  })
  .eq("id", orderId);
```

Customer receives email with link: `/order-confirm/:orderId?token=xxxx`

### confirm-customer-order (Line 134-195 for CASH, 198+ for CARD)

#### Cash Flow
```typescript
if (order.payment_method === "cash") {
  // Update status
  await serviceClient.from("orders").update({
    fulfillment_status: "confirmed",
    payment_status: "completed",  // ← Mark as paid (no actual payment)
    confirmation_token: null,
    confirmation_token_expires_at: null,
  });

  // Create print job
  await serviceClient.from("print_jobs").insert({ order_id: orderId });

  // Send email
  await fetch(`${origin}/functions/v1/send-order-status-email`, {
    body: JSON.stringify({ orderId, newStatus: "confirmed" })
  });

  return { success: true, paymentMethod: "cash", orderId };
}
```

**Result:** Order is confirmed, kitchen gets print job, customer gets email.

#### Card Flow
```typescript
if (order.payment_method === "card") {
  // Create Stripe session (no payment yet, just session)
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: buildLineItems(orderItems, deliveryFee),
    mode: "payment",
    success_url: `.../order-success?session_id={CHECKOUT_SESSION_ID}&orderId=${orderId}`,
    cancel_url: `.../order-confirm/${orderId}?token=${token}`,
    metadata: { order_id: orderId, user_id: order.user_id },
  });

  // Store session ID
  await serviceClient.from("orders").update({
    stripe_session_id: session.id,
  });

  return { success: true, paymentMethod: "card", stripeUrl: session.url, orderId };
}
```

**Result:** Customer gets Stripe payment page URL.

### complete-stripe-order (Stripe Webhook)

When Stripe webhook fires after successful payment:

```typescript
// Mark order as paid
await serviceClient.from("orders").update({
  payment_status: "completed",
  fulfillment_status: "confirmed",
  stripe_charge_id: charge.id,
});

// Create print job
await serviceClient.from("print_jobs").insert({ order_id: orderId });

// Send confirmation email
await fetch(`...send-order-status-email`, {
  body: JSON.stringify({ orderId, newStatus: "confirmed" })
});
```

---

## Cash vs Card: The Differences

| Step | Cash | Card |
|------|------|------|
| **1. Checkout** | Same: `create-pending-order` | Same: `create-pending-order` |
| **2. Order Created** | `fulfillment_status: "pending_review"` | `fulfillment_status: "pending_review"` |
| **3. Admin Reviews** | Admin in dashboard | Admin in dashboard |
| **4. Sends for Confirm** | Same: `admin-update-order` | Same: `admin-update-order` |
| **5. Confirmation Link** | Customer gets email | Customer gets email |
| **6. Customer Confirms** | Calls `confirm-customer-order` | Calls `confirm-customer-order` |
| **7. Payment** | ❌ No payment (already "paid") | ✅ Customer pays via Stripe |
| **8. After Payment** | Sets `payment_status: completed` | Stripe webhook sets `payment_status: completed` |
| **9. Kitchen Job** | Print job created immediately | Print job created after Stripe webhook |

### The Critical Difference

```typescript
// CASH: Customer confirmation = done paying
if (order.payment_method === "cash") {
  payment_status: "completed"  // Mark as paid immediately
  // ✓ Kitchen can start preparing
}

// CARD: Customer confirmation = not yet paid, customer pays stripe
if (order.payment_method === "card") {
  // Return Stripe checkout URL
  // Customer pays
  // Webhook completes the transaction
  // payment_status: "completed" only after webhook
}
```

---

## Fulfillment Types (Same for Cash and Card)

### Delivery
- Requires: `addressId`, `deliveryDate`, `deliveryTime`
- Delivery fee calculated and added to total
- Address snapshot stored with order
- No print job (kitchen doesn't need pickup instructions)

### Pickup
- Requires: `pickupDate`, `pickupTime`
- Pickup slot capacity validated
- Pickup reminder email scheduled (90 mins before)
- Print job created (kitchen knows pickup time)

### Nationwide
- Requires: `addressId`, minimum $50 order
- Only non-local items allowed
- 3-5 day shipping estimate
- Delivery fee = shipping cost (fixed)

---

## Order Status Flow

```
pending_review
    ↓ (admin reviews/adjusts)
awaiting_customer_confirmation
    ↓ (customer confirms via email link)
confirmed
    ↓ (kitchen preparing)
preparing
    ↓ (out on delivery or ready for pickup)
out_for_delivery / ready_for_pickup
    ↓
delivered / completed
```

---

## Key Files

| File | Purpose | Cash vs Card |
|------|---------|-------------|
| `CheckoutPage.tsx` | Initial order submission | **Same** |
| `OrderPendingPage.tsx` | "Admin is reviewing" page | **Same** |
| `supabase/functions/create-pending-order` | Create order in pending status | **Same** |
| `supabase/functions/admin-update-order` | Admin sends for confirmation | **Same** |
| `OrderConfirmPage.tsx` | Customer review before payment | **Same** |
| `supabase/functions/confirm-customer-order` | **DIVERGES HERE** | Cash: confirms immediately; Card: creates Stripe session |
| `supabase/functions/complete-stripe-order` | Webhook after Stripe payment | Card only |
| `send-order-status-email` | Notify customer | Both, at different points |

---

## Payment Method Restrictions

From CheckoutPage.tsx (lines 92-97):

```typescript
// Auto-switch to card if delivery/nationwide selected with cash
useEffect(() => {
  if ((fulfillmentType === 'delivery' || fulfillmentType === 'nationwide') && paymentMethod === 'cash') {
    setPaymentMethod('card');  // Force card for delivery/nationwide
  }
}, [fulfillmentType, paymentMethod]);
```

**Rules:**
- ✅ Cash + Pickup: Allowed
- ✅ Card + Pickup: Allowed
- ❌ Cash + Delivery: **Automatically switched to Card**
- ❌ Cash + Nationwide: **Automatically switched to Card**
- ✅ Card + Delivery: Allowed
- ✅ Card + Nationwide: Allowed

**Reason:** Cash is pickup-only (customer pays when they arrive). Delivery requires upfront payment.

---

## Recent Changes (Phase 10)

### What Changed in Phase 10
1. **OrderDetailsPage.tsx** - Added status badges for new statuses
2. **OrderHistory.tsx** - Added action buttons for "awaiting confirmation" orders
3. Customer can now see which orders are awaiting their confirmation
4. One-click confirmation button on order history

### What Stayed the Same
- Entire checkout flow (same as Phase 7)
- Admin review flow (same as Phase 9)
- Payment processing (same as Phase 5+)

---

## Testing the Workflow

### Cash Payment (Pickup)
1. Add items → Checkout
2. Select Pickup + Date/Time + Cash
3. Submit → See OrderPendingPage
4. (Admin reviews and confirms)
5. Receive email with confirmation link
6. Click link → OrderConfirmPage
7. Confirm → Order shows as "confirmed"
8. Kitchen receives print job

### Card Payment (Delivery)
1. Add items → Checkout
2. Select Delivery + Address + Date/Time + Card
3. Submit → See OrderPendingPage
4. (Admin reviews and confirms)
5. Receive email with confirmation link
6. Click link → OrderConfirmPage
7. Confirm → Redirected to Stripe
8. Pay via Stripe → Success page
9. Webhook processes payment
10. Kitchen receives print job

---

## Summary

**The checkout workflow is unified:** Both cash and card payments follow the **exact same process** until the confirmation step. The only difference is how payment is handled after customer confirmation:

- **Cash:** Payment is assumed complete (customer pays at pickup)
- **Card:** Customer completes payment via Stripe

All fulfillment types (delivery, pickup, nationwide) work with both payment methods (except cash + delivery/nationwide are auto-switched to card).

The admin review step exists for **all orders**, providing opportunity to adjust items, quantities, and amounts before customer pays.

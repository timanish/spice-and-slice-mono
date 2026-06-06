import { test, expect } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";
import { signInAs, getClerkToken, callFunction } from "./helpers";
import { adminDb } from "./local-db";
import { TEST_USERS } from "./users";

// Full order lifecycle (cash + pickup — the only all-cash path), driving the
// SAME edge functions the checkout UI posts to, with real Clerk JWTs:
//
//   create-pending-order   (customer)  → pending_review
//   admin-adjust-order      (admin)     → awaiting_customer_confirmation (+ token)
//   confirm-customer-order  (token)     → confirmed + payment completed
//
// Requires `supabase functions serve` (npm run sandbox). Order items come from
// the request payload (exactly as CheckoutPage builds them), so no cart needed.
const RICE_PRODUCT_ID = "b0000000-0000-0000-0000-000000000001";

test("full checkout: place → admin sends for confirmation → customer confirms (cash + pickup)", async ({
  page,
}) => {
  const db = adminDb();

  // --- 1. Customer places a pending order ----------------------------------
  await signInAs(page, TEST_USERS.customer);
  const customerToken = await getClerkToken(page);

  const { data: rice } = await db.from("products").select("*").eq("id", RICE_PRODUCT_ID).single();
  expect(rice).toBeTruthy();

  const place = await callFunction(
    "create-pending-order",
    {
      cartItems: [{ product_id: RICE_PRODUCT_ID, quantity: 2, weight: null, discount_percentage: 0, product: rice }],
      paymentMethod: "cash",
      fulfillmentType: "pickup",
      addressId: null,
      deliveryDate: null,
      deliveryTime: null,
      pickupDate: "2026-06-12",
      pickupTime: "2:00 PM - 4:00 PM",
      promoCode: null,
    },
    customerToken,
  );
  expect(place.status, JSON.stringify(place.json)).toBe(200);
  const orderId: string = place.json.orderId;
  expect(orderId).toBeTruthy();

  let { data: order } = await db
    .from("orders")
    .select("fulfillment_status, payment_method")
    .eq("id", orderId)
    .single();
  expect(order.fulfillment_status).toBe("pending_review");
  expect(order.payment_method).toBe("cash");

  // Customer can see the pending order page.
  await page.goto(`/order-pending/${orderId}`);
  await expect(page).toHaveURL(new RegExp(`/order-pending/${orderId}`));

  // --- 2. Admin sends the order for customer confirmation -------------------
  await clerk.signOut({ page });
  await signInAs(page, TEST_USERS.admin);
  const adminToken = await getClerkToken(page);

  const send = await callFunction(
    "admin-adjust-order",
    { action: "send_for_confirmation", orderId },
    adminToken,
  );
  expect(send.status, JSON.stringify(send.json)).toBe(200);

  ({ data: order } = await db
    .from("orders")
    .select("fulfillment_status, confirmation_token")
    .eq("id", orderId)
    .single());
  expect(order.fulfillment_status).toBe("awaiting_customer_confirmation");
  expect(order.confirmation_token).toBeTruthy();

  // --- 3. Customer confirms via the token link (cash → no payment) ---------
  const confirm = await callFunction("confirm-customer-order", {
    orderId,
    token: order.confirmation_token,
  });
  expect(confirm.status, JSON.stringify(confirm.json)).toBe(200);

  ({ data: order } = await db
    .from("orders")
    .select("fulfillment_status, payment_status")
    .eq("id", orderId)
    .single());
  expect(order.fulfillment_status).toBe("confirmed");
  expect(order.payment_status).toBe("completed");
});

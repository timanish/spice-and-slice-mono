import { test, expect } from "@playwright/test";
import { signInAs } from "./helpers";
import { TEST_USERS } from "./users";

// Authenticated flow. Exercises the full chain:
//   Clerk sign-in → Clerk JWT → user-data edge function → local Supabase cart.
// Requires `supabase functions serve` to be running (npm run sandbox does this).
test.describe("authenticated cart", () => {
  test("customer can sign in and add an item to the cart", async ({ page }) => {
    await signInAs(page, TEST_USERS.customer);

    await page.goto("/products");
    await page.waitForLoadState("networkidle");

    // Scope to the seeded non-weighted product's card (stable card root class).
    const card = page.locator(".min-h-\\[420px\\]").filter({ hasText: "Basmati Rice 10lb" });
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: /add to cart/i }).click();

    // The edge-function round-trip succeeded if the nav cart button now shows a
    // count of 1 (getByRole only matches the visible button, not hidden dupes).
    await expect(page.getByRole("button", { name: "1" })).toBeVisible();
  });
});

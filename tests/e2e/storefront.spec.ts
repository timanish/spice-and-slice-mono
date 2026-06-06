import { test, expect } from "@playwright/test";

// Public storefront — no auth. Validates the frontend → local Supabase wiring
// using the seeded catalog (see supabase/seed.sql).
test.describe("storefront (public)", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/.+/);
    // App shell rendered (Clerk provider booted without throwing).
    await expect(page.locator("body")).toBeVisible();
  });

  test("products page shows seeded items", async ({ page }) => {
    await page.goto("/products");
    // Seeded products from the Meat Shop + Groceries categories.
    await expect(page.getByText("Goat Meat (bone-in)")).toBeVisible();
    await expect(page.getByText("Basmati Rice 10lb")).toBeVisible();
  });
});

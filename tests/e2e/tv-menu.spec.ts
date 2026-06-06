import { test, expect } from "@playwright/test";

// TV menu board — no auth. The seeded "main" board (data_source=both) pulls the
// Kitchen menu_items + Meat Shop products. See supabase/seed.sql.
test.describe("tv menu board", () => {
  test("published board renders seeded items", async ({ page }) => {
    await page.goto("/tv-menu/main");
    await expect(page.getByText("Our Menu")).toBeVisible();
    // A restaurant menu_item and a meat-shop product should both appear.
    await expect(page.getByText("Chicken Momo (10pc)")).toBeVisible();
    await expect(page.getByText("Goat Meat (bone-in)")).toBeVisible();
  });
});

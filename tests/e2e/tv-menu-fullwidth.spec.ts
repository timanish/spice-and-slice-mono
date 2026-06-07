import { test, expect } from "@playwright/test";

// Full-width feature section (Restaurant layout): the demo board marks the
// "Pantry Specials" (Groceries) category as full-width, rendered below the grid
// with its number preserved.
test("full-width feature section renders below the grid", async ({ page }) => {
  await page.goto("/tv-menu/main");
  await expect(page.getByText("3. Pantry Specials")).toBeVisible();
  await expect(page.getByText("Basmati Rice 10lb")).toBeVisible();
});

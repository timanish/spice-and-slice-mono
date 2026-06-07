import { test, expect } from "@playwright/test";
import { adminDb } from "./local-db";

// Phase 2.2: configurable fonts. Setting a board font loads the matching
// Google Fonts stylesheet on the display.
test("tv board loads the configured heading font", async ({ page }) => {
  const db = adminDb();
  const { data: board } = await db
    .from("tv_menu_boards")
    .select("config")
    .eq("slug", "main")
    .single();
  const original = board!.config;

  await db
    .from("tv_menu_boards")
    .update({ config: { ...original, heading_font: "Marcellus", body_font: "Lato" } })
    .eq("slug", "main");

  try {
    await page.goto("/tv-menu/main");
    await expect(page.getByText("Chicken Momo (10pc)")).toBeVisible();
    // The display injected Google Fonts links for the chosen families.
    await expect(page.locator('link[href*="Marcellus"]')).toHaveCount(1);
    await expect(page.locator('link[href*="Lato"]')).toHaveCount(1);
  } finally {
    await db.from("tv_menu_boards").update({ config: original }).eq("slug", "main");
  }
});

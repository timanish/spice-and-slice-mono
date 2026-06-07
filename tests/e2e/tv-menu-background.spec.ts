import { test, expect } from "@playwright/test";
import { adminDb } from "./local-db";

// Phase 1 of the TV-menu overhaul: a full-bleed background template renders
// behind the data-driven layout, with live items on top. No auth needed.
const BG =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='8'%20height='8'%3E%3Crect%20width='8'%20height='8'%20fill='%23123456'/%3E%3C/svg%3E";

test("tv board renders a background template image with items on top", async ({ page }) => {
  const db = adminDb();
  const { data: board } = await db
    .from("tv_menu_boards")
    .select("config")
    .eq("slug", "main")
    .single();
  const original = board!.config;

  await db
    .from("tv_menu_boards")
    .update({
      config: { ...original, background_image_url: BG, overlay_color: "#000000", overlay_opacity: 0.5 },
    })
    .eq("slug", "main");

  try {
    await page.goto("/tv-menu/main");
    // Background template layer present...
    await expect(
      page.locator('div[style*="background-image"][style*="data:image/svg"]').first(),
    ).toBeVisible();
    // ...and live menu items still render on top.
    await expect(page.getByText("Chicken Momo (10pc)")).toBeVisible();
  } finally {
    // Restore the seeded config so manual preview / other runs are unaffected.
    await db.from("tv_menu_boards").update({ config: original }).eq("slug", "main");
  }
});

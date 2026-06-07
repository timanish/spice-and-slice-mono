import { test, expect } from "@playwright/test";
import { adminDb } from "./local-db";

// menu_items.display_order controls item sequence (overrides alphabetical).
const CHICKEN_MOMO = "c0000000-0000-0000-0000-000000000001"; // alphabetically first
const VEG_THALI = "c0000000-0000-0000-0000-000000000003"; // alphabetically last

test("menu items honor display_order over alphabetical", async ({ page }) => {
  const db = adminDb();
  try {
    // Force Veg Thali first, Chicken Momo last within the Kitchen section.
    await db.from("menu_items").update({ display_order: 1 }).eq("id", VEG_THALI);
    await db.from("menu_items").update({ display_order: 9 }).eq("id", CHICKEN_MOMO);

    await page.goto("/tv-menu/main");
    const thali = await page.getByText("Veg Thali").boundingBox();
    const momo = await page.getByText("Chicken Momo (10pc)").boundingBox();
    expect(thali).not.toBeNull();
    expect(momo).not.toBeNull();
    // Despite alphabetical order putting Chicken Momo first, display_order wins.
    expect(thali!.y).toBeLessThan(momo!.y);
  } finally {
    await db.from("menu_items").update({ display_order: 0 }).in("id", [VEG_THALI, CHICKEN_MOMO]);
  }
});

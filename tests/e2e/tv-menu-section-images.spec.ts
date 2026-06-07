import { test, expect } from "@playwright/test";
import { adminDb } from "./local-db";

// Per-section dish photos (Restaurant layout): config.section_images renders an
// image inside the matching category panel.
const KITCHEN = "11111111-1111-1111-1111-111111111111";
const IMG =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='8'%20height='8'%3E%3Crect%20width='8'%20height='8'%20fill='%23abcdef'/%3E%3C/svg%3E";

test("restaurant panel renders a per-section dish photo", async ({ page }) => {
  const db = adminDb();
  const { data: board } = await db
    .from("tv_menu_boards")
    .select("config")
    .eq("slug", "main")
    .single();
  const original = board!.config;

  await db
    .from("tv_menu_boards")
    .update({ config: { ...original, section_images: { [KITCHEN]: IMG } } })
    .eq("slug", "main");

  try {
    await page.goto("/tv-menu/main");
    await expect(page.locator(`img[src="${IMG}"]`)).toHaveCount(1);
  } finally {
    await db.from("tv_menu_boards").update({ config: original }).eq("slug", "main");
  }
});

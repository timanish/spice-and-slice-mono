import { test, expect } from "@playwright/test";
import { adminDb } from "./local-db";

// Phase 2.1: per-board section header overrides + numbering toggle.
const KITCHEN = "11111111-1111-1111-1111-111111111111";
const MEAT = "22222222-2222-2222-2222-222222222222";

test("tv board renders custom section labels with numbering", async ({ page }) => {
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
      config: {
        ...original,
        show_section_numbers: true,
        section_labels: { [KITCHEN]: "Appetizers", [MEAT]: "Meat Counter" },
      },
    })
    .eq("slug", "main");

  try {
    await page.goto("/tv-menu/main");
    // Custom labels render with auto-numbering (category names are overridden).
    await expect(page.getByText("1. Appetizers")).toBeVisible();
    await expect(page.getByText("2. Meat Counter")).toBeVisible();
    await expect(page.getByText("Kitchen", { exact: true })).toHaveCount(0);

    // Toggling numbers off drops the "N." prefix.
    await db
      .from("tv_menu_boards")
      .update({
        config: {
          ...original,
          show_section_numbers: false,
          section_labels: { [KITCHEN]: "Appetizers", [MEAT]: "Meat Counter" },
        },
      })
      .eq("slug", "main");
    await page.goto("/tv-menu/main");
    await expect(page.getByText("Appetizers", { exact: true })).toBeVisible();
    await expect(page.getByText("1. Appetizers")).toHaveCount(0);
  } finally {
    await db.from("tv_menu_boards").update({ config: original }).eq("slug", "main");
  }
});

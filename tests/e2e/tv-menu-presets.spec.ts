import { test, expect } from "@playwright/test";
import { signInAs } from "./helpers";
import { adminDb } from "./local-db";
import { TEST_USERS } from "./users";

// One-click presets: applying a preset in the editor and saving updates the
// board's presentation (layout/theme/fonts) while keeping content. Also covers
// the admin board-editor save path end-to-end.
test("admin can apply a preset and it persists", async ({ page }) => {
  const db = adminDb();
  const { data: board } = await db
    .from("tv_menu_boards")
    .select("config")
    .eq("slug", "main")
    .single();
  const original = board!.config;

  try {
    await signInAs(page, TEST_USERS.admin);
    await page.goto("/admin/tv-menu");

    // Open the board editor (pencil icon), go to Theme, apply "Grid Compact".
    await page.locator("button:has(.lucide-pencil)").first().click();
    await page.getByRole("tab", { name: "Theme" }).click();
    await page.getByText("Grid Compact").click();
    await page.getByRole("button", { name: "Save Changes" }).click();

    // The saved board now uses the grid layout (content categories preserved).
    await expect
      .poll(
        async () => {
          const { data } = await db
            .from("tv_menu_boards")
            .select("config")
            .eq("slug", "main")
            .single();
          return data?.config?.layout;
        },
        { timeout: 10000 },
      )
      .toBe("grid");

    const { data: after } = await db
      .from("tv_menu_boards")
      .select("config")
      .eq("slug", "main")
      .single();
    expect(after!.config.category_ids?.length).toBe(original.category_ids?.length); // content kept
  } finally {
    await db.from("tv_menu_boards").update({ config: original }).eq("slug", "main");
  }
});

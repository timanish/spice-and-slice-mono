import { test, expect } from "@playwright/test";
import { signInAs } from "./helpers";
import { TEST_USERS } from "./users";

// Admin flow. Exercises Clerk JWT → get-user-role edge fn → user_roles → AdminGuard.
// Requires `supabase functions serve` (npm run sandbox does this).
test.describe("admin flow", () => {
  test("admin user can access the admin dashboard", async ({ page }) => {
    await signInAs(page, TEST_USERS.admin);

    await page.goto("/admin");
    // AdminGuard resolved the admin role → dashboard renders and URL stays /admin.
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("non-admin customer is blocked from the admin area", async ({ page }) => {
    await signInAs(page, TEST_USERS.customer);

    await page.goto("/admin");
    // AdminGuard denies a non-admin → redirected away from /admin (to home).
    await expect(page).not.toHaveURL(/\/admin/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toHaveCount(0);
  });
});

import { test, expect } from "@playwright/test";
import { signInAs } from "./helpers";
import { TEST_USERS } from "./users";

// Regression: landing on /profile?tab=orders and clicking another tab used to
// snap back to "orders" because the URL-sync effect fought the local state.
// Tabs now drive the URL, so switches stick.
test.describe("profile tabs", () => {
  test("switching tabs from a ?tab=orders deep link does not revert", async ({ page }) => {
    await signInAs(page, TEST_USERS.customer);
    await page.goto("/profile?tab=orders");

    const catering = page.getByRole("button", { name: "Catering Requests" });
    await expect(catering).toBeVisible();

    await catering.click();
    await expect(page).toHaveURL(/[?&]tab=catering/);
    await page.waitForTimeout(300); // ensure it doesn't snap back
    await expect(page).toHaveURL(/[?&]tab=catering/);

    await page.getByRole("button", { name: "Lunch Box Subscription" }).click();
    await expect(page).toHaveURL(/[?&]tab=subscription/);

    await page.getByRole("button", { name: "Profile", exact: true }).click();
    await expect(page).toHaveURL(/[?&]tab=profile/);
  });
});

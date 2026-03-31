import { expect, test } from "@playwright/test";

test("smoke: open catalog and navigate to cart", async ({ page }) => {
  await page.goto("/");

  // AppShell should render bottom nav links.
  await expect(page.getByRole("link", { name: /корзин/i })).toBeVisible();

  await page.getByRole("link", { name: /корзин/i }).click();
  await expect(page).toHaveURL(/\/cart$/);
});

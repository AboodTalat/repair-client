// Storefront browse smoke: home loads, /shop category picker → category →
// product grid → product detail, all against the seeded test catalog. Asserts
// real content, not error/empty states.

import { test, expect } from "./fixtures";
import { visible } from "./helpers";

test.describe("storefront browse", () => {
  test("home page loads with real content", async ({ page }) => {
    const resp = await page.goto("/");
    expect(resp?.status()).toBeLessThan(400);
    // Not a Next.js error overlay.
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(page.locator("body")).not.toContainText("This page could not be found");
    // A path into the store exists somewhere on the landing.
    await expect(page.locator('a[href*="/shop"]').first()).toBeAttached();
  });

  test("shop category picker shows seeded categories", async ({ page }) => {
    await page.goto("/shop");
    await expect(page.getByRole("heading", { name: /Pick a category/i })).toBeVisible();
    // The seeded majors render as tiles.
    await expect(visible(page.getByRole("link", { name: /Apparel/i }))).toBeVisible();
  });

  test("picking a category shows the seeded product grid, then product detail", async ({ page }) => {
    await page.goto("/shop");
    await visible(page.getByRole("link", { name: /Apparel/i })).click();
    await page.waitForURL(/\/shop\?category=/);

    // Product grid renders real seeded products (not the empty / coming-soon state).
    const productLink = visible(page.locator('a[href^="/products/"]'));
    await expect(productLink).toBeVisible({ timeout: 20_000 });
    // Assert the grid HAS products, not which one leads it — that ordering is a
    // property of the seed, not of the storefront.
    await expect(page.locator('a[href^="/products/"]')).not.toHaveCount(0);
    await expect(page.getByText(/No products were found/i)).toHaveCount(0);
    await expect(page.getByText(/coming soon/i)).toHaveCount(0);

    // Open the product detail page.
    await productLink.click();
    await page.waitForURL(/\/products\//);
    // Product name appears on the detail page, and size chips (S/M/L) are present.
    await expect(visible(page.getByRole("heading", { level: 1 }))).toBeVisible();
    await expect(visible(page.getByRole("button", { name: "S", exact: true }))).toBeVisible();
  });
});

// Shared helpers for the repair storefront e2e suite.
//
// The catalog + the login user are provisioned by
// Server/test/seedE2eCatalog.ts (run once against repair_test before the
// suite). Selectors favour roles / visible text over brittle CSS.

import { expect } from "@playwright/test";

// Matches the seeded customer in Server/test/seedE2eCatalog.ts.
export const SHOPPER = {
  email: "e2e-shopper@test.local",
  password: "Passw0rd!",
};

// A page renders both a mobile (md:hidden) and a desktop (hidden md:flex) copy
// of most controls; only one is visible at a given viewport. This picks the
// visible one so clicks don't land on the hidden duplicate.
export function visible(locator) {
  return locator.filter({ visible: true }).first();
}

// Log in through the UI as the seeded customer. Lands on /shop (customer home).
export async function login(page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email Address").fill(SHOPPER.email);
  await page.getByLabel("Password", { exact: true }).fill(SHOPPER.password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await page.waitForURL("**/shop**", { timeout: 20_000 });
}

// From /shop, open the seeded "Apparel" category and click into the first
// product. Returns after the product detail page has loaded.
export async function openFirstProduct(page) {
  await page.goto("/shop");
  // Category picker → pick the seeded major that carries products.
  await visible(page.getByRole("link", { name: /Apparel/i })).click();
  await page.waitForURL(/\/shop\?category=/, { timeout: 20_000 });
  const productLink = visible(page.locator('a[href^="/products/"]'));
  await expect(productLink).toBeVisible({ timeout: 20_000 });
  await productLink.click();
  await page.waitForURL(/\/products\//, { timeout: 20_000 });
}

// On a product detail page: pick the first IN-STOCK size for the active colour
// (its CTA reads "Add to Cart") then add it. Robust to a variant being depleted
// by earlier checkouts — an out-of-stock size flips the CTA to "Notify When
// Available", so we just try the next size.
export async function addCurrentProductToCart(page, sizes = ["S", "M", "L"]) {
  for (const s of sizes) {
    await visible(page.getByRole("button", { name: s, exact: true })).click();
    // Give the CTA a tick to re-render for the new size/stock.
    await page.waitForTimeout(200);
    const addBtn = visible(page.getByRole("button", { name: "Add to Cart" }));
    if (await addBtn.isVisible().catch(() => false)) {
      // Wait for the actual myAppAddToCart round-trip before navigating,
      // otherwise a fast goto("/cart") races ahead of the persisted write.
      const addResponse = page
        .waitForResponse(
          (r) =>
            r.url().includes("/repair/graphql") &&
            r.request().method() === "POST" &&
            (r.request().postData() || "").includes("myAppAddToCart"),
          { timeout: 15_000 }
        )
        .catch(() => null);
      await addBtn.click();
      await addResponse;
      await page.waitForTimeout(400);
      return;
    }
  }
  throw new Error("No in-stock size found on the product — re-seed the catalog.");
}

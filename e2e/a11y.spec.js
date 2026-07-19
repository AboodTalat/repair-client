// Accessibility scans (axe-core) across the key storefront surfaces.
//
// Gate: FAIL only on critical/serious violations (the ones with real UX
// impact). Moderate/minor are reported to the console as findings but don't
// fail the build — pre-existing minor issues shouldn't block the suite.
//
// Guest /checkout/payment redirects to /cart, so the checkout surface scanned
// here is /checkout (details), reached as the logged-in seeded customer with an
// item in the cart so it isn't an empty state.

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { login, openFirstProduct, addCurrentProductToCart, visible } from "./helpers";

const SERIOUS = new Set(["critical", "serious"]);

async function scan(page, label) {
  // Let hydration + fonts settle before analysing. NOTE: don't wait for
  // "networkidle" — the Next dev HMR websocket keeps the network perpetually
  // active, so networkidle never fires and would hang the scan. A short fixed
  // settle after DOM content is enough.
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await page.waitForTimeout(800);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const v = results.violations;
  const bad = v.filter((x) => SERIOUS.has(x.impact));
  // Findings dump — all impacts, for the report.
  // eslint-disable-next-line no-console
  console.log(
    `\n[a11y] ${label}: ${v.length} violation rule(s) — ` +
      v
        .map((x) => `${x.id}(${x.impact}, ${x.nodes.length})`)
        .join(", ") || `[a11y] ${label}: no violations`
  );
  return bad;
}

test.describe("accessibility", () => {
  test("home /", async ({ page }) => {
    await page.goto("/");
    const bad = await scan(page, "/");
    expect(bad, JSON.stringify(bad.map((b) => b.id))).toEqual([]);
  });

  test("shop /shop", async ({ page }) => {
    await page.goto("/shop");
    await expect(page.getByRole("heading", { name: /Pick a category/i })).toBeVisible();
    const bad = await scan(page, "/shop");
    expect(bad, JSON.stringify(bad.map((b) => b.id))).toEqual([]);
  });

  test("product detail", async ({ page }) => {
    await openFirstProduct(page);
    const bad = await scan(page, "product-detail");
    expect(bad, JSON.stringify(bad.map((b) => b.id))).toEqual([]);
  });

  test("cart /cart (with item)", async ({ page }) => {
    await login(page);
    await openFirstProduct(page);
    await addCurrentProductToCart(page);
    await page.goto("/cart");
    await expect(visible(page.getByText("Everyday Hoodie"))).toBeVisible({ timeout: 20_000 });
    const bad = await scan(page, "/cart");
    expect(bad, JSON.stringify(bad.map((b) => b.id))).toEqual([]);
  });

  test("checkout /checkout (details, logged-in)", async ({ page }) => {
    await login(page);
    await openFirstProduct(page);
    await addCurrentProductToCart(page);
    await page.goto("/cart");
    await visible(page.getByRole("button", { name: /Continue to Next Step/i })).click();
    await page.waitForURL("**/checkout", { timeout: 20_000 });
    const bad = await scan(page, "/checkout");
    expect(bad, JSON.stringify(bad.map((b) => b.id))).toEqual([]);
  });
});

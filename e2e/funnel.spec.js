// Checkout funnel: product → cart → checkout (details) → payment → DEMO
// gateway → success (approve) / failed (decline).
//
// The storefront's /checkout/payment redirects logged-out users to /cart (the
// guest details step is itself a registration form), so the funnel runs as the
// seeded, logged-in customer — the deterministic way to exercise the full
// funnel without the multi-field guest registration + address drawer. The
// customer ships with a default address (see seedE2eCatalog.ts), so the details
// step needs no address entry.
//
// Reaching the DEMO gateway requires a WALLET method (Apple Pay / Google Pay):
// card methods need a saved card first, and Cash on Delivery skips the gateway
// entirely.

import { test, expect } from "@playwright/test";
import { login, openFirstProduct, addCurrentProductToCart, visible } from "./helpers";

async function fillCartAndReachPayment(page) {
  await login(page);
  await openFirstProduct(page);
  await addCurrentProductToCart(page);

  // Cart shows the line + totals.
  await page.goto("/cart");
  await expect(visible(page.getByText("Everyday Hoodie"))).toBeVisible({ timeout: 20_000 });
  await expect(visible(page.getByText(/Order Total/i))).toBeVisible();

  // Cart → checkout details.
  await visible(page.getByRole("button", { name: /Continue to Next Step/i })).click();
  await page.waitForURL("**/checkout", { timeout: 20_000 });

  // Details → payment (default saved address is preselected).
  await visible(page.getByRole("button", { name: /Continue to Next Step/i })).click();
  await page.waitForURL("**/checkout/payment", { timeout: 20_000 });

  // Choose a wallet so the DEMO gateway opens, accept terms.
  await visible(page.getByRole("button", { name: /Apple Pay/i })).click();
  await visible(page.getByText(/I agree to the/i)).click();
  await visible(
    page.getByRole("button", { name: /Confirm & Pay|PAY & CONFIRM ORDER/i })
  ).click();

  // The DEMO gateway modal appears.
  const gateway = page.getByRole("dialog", { name: /Demo payment gateway/i });
  await expect(gateway).toBeVisible({ timeout: 20_000 });
  return gateway;
}

test.describe("checkout funnel", () => {
  test("approve payment routes to /checkout/success", async ({ page }) => {
    const gateway = await fillCartAndReachPayment(page);
    // Approve — the "Pay JOD X" button.
    await gateway.getByRole("button", { name: /^Pay /i }).click();
    await page.waitForURL("**/checkout/success", { timeout: 30_000 });
    await expect(visible(page.getByText(/Order Successful/i))).toBeVisible();
  });

  test("declined payment routes to /checkout/failed", async ({ page }) => {
    const gateway = await fillCartAndReachPayment(page);
    await gateway.getByRole("button", { name: /Simulate a declined payment/i }).click();
    await page.waitForURL("**/checkout/failed", { timeout: 30_000 });
    await expect(visible(page.getByText(/Payment Declined/i))).toBeVisible();
  });
});

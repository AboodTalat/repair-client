// SPEC 3 — the first-order welcome discount and promo codes are mutually
// exclusive, and a promo that crosses the free-delivery threshold recomputes
// shipping and tax on the POST-promo base.
//
// These are the two places the cart's arithmetic can quietly disagree with
// myAppCheckout, and a disagreement here is the worst kind: the customer is shown
// one total and charged another. cartTotals.js exists to mirror the resolver's
// money math; this spec is the check that the mirror is true through the real UI.
//
// Reference tier the numbers come from (Server/test/harness/reset.ts):
//   standard delivery 8.00, free over 200.00, tax 9% exclusive
//   "Everyday Hoodie" 89.00, promo SAVE30 = 30% (seedE2eCatalog.ts)
import { test, expect } from "./fixtures";
import {
  openFirstProduct,
  addCurrentProductToCart,
  visible,
  emptyCart,
  firstProductId,
  productDetail,
} from "./helpers";

const money = (s) => Number(String(s).replace(/[^0-9.]/g, ""));

// Reference tier — Server/test/harness/reset.ts.
const THRESHOLD = 200;
const STANDARD_SHIPPING = 8;
const TAX_RATE = 9;

// Read a labelled row out of the order-summary block.
async function totalsRow(page, label) {
  const row = visible(page.locator("div,li,p").filter({ hasText: new RegExp(`^\\s*${label}`, "i") }));
  return (await row.first().innerText()).trim();
}

async function addQty(page, qty) {
  // Start from empty — the assertions below are absolute money figures, and the
  // cart survives across tests (see emptyCart).
  await emptyCart(page);
  let name = "";
  for (let i = 0; i < qty; i++) {
    name = await openFirstProduct(page);
    await addCurrentProductToCart(page);
  }
  await page.goto("/cart");
  await expect(visible(page.getByText(name))).toBeVisible({ timeout: 20_000 });
}

test.describe("welcome discount and promo codes are mutually exclusive", () => {
  // A brand-new account is required: welcome eligibility is granted at signup
  // (Mutation.ts) and consumed by the first checkout (orders.ts), so the seeded
  // shopper — who has already ordered — can never exercise the eligible branch.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("first order applies the welcome discount and blocks promo codes; the second order allows one", async ({
    page,
  }) => {
    const stamp = String(Date.now());
    const phoneLocal = `79${stamp.slice(-7)}`;

    // ---- register as a guest (this is what mints welcome eligibility) --------
    await addQty(page, 1);
    await visible(page.getByRole("button", { name: /CONTINUE AS A GUEST/i })).click();
    await page.waitForURL("**/checkout", { timeout: 20_000 });
    await visible(page.getByLabel("Email address")).fill(`e2e-welcome-${stamp}@test.local`);
    await visible(page.getByLabel("Phone number")).fill(phoneLocal);
    await visible(page.getByLabel("Password")).fill("Passw0rd!");

    await visible(page.getByRole("button", { name: /Add Shipping Address/i })).click();
    const drawer = page.getByRole("dialog", { name: /Add new address/i });
    await expect(drawer).toBeVisible({ timeout: 15_000 });
    await drawer.getByLabel("Address title").fill("Home");
    await drawer.getByLabel("Recipient full name").fill("Welcome Tester");
    await drawer.getByLabel("Phone number").fill(phoneLocal);
    await drawer.getByLabel("Country").fill("Jordan");
    await drawer.getByLabel("City").selectOption({ label: "Amman" });
    await drawer.getByLabel("Neighborhood").fill("Abdoun");
    await drawer.getByLabel("Street").fill("Rainbow Street 12");
    await drawer.getByLabel("Building").fill("4");
    await drawer.getByRole("button", { name: /^ADD ADDRESS$/i }).click();
    await expect(drawer).toBeHidden({ timeout: 15_000 });

    await visible(page.getByRole("button", { name: /Continue to Next Step/i })).click();
    await page.waitForURL("**/checkout/payment", { timeout: 30_000 });

    // ---- (a) welcome discount is automatic, promo entry is replaced ----------
    await page.goto("/cart");
    await expect(visible(page.getByText(/Welcome discount \(10%\)/i))).toBeVisible({ timeout: 20_000 });
    // The code box is GONE, replaced by the explanation — not merely disabled.
    await expect(
      visible(page.getByText(/welcome discount is applied automatically/i))
    ).toBeVisible();
    await expect(page.getByPlaceholder("Enter discount code")).toHaveCount(0);

    // ---- complete the first order (COD) --------------------------------------
    await visible(page.getByRole("button", { name: /Continue to Next Step/i })).click();
    await page.waitForURL("**/checkout", { timeout: 20_000 });
    await visible(page.getByRole("button", { name: /Continue to Next Step/i })).click();
    await page.waitForURL("**/checkout/payment", { timeout: 20_000 });
    await visible(page.getByText(/Cash on Delivery/i)).click();
    await visible(page.getByText(/I agree to the/i)).click();
    await visible(page.getByRole("button", { name: /^Confirm Order$/i })).click();
    await page.waitForURL("**/checkout/success", { timeout: 30_000 });

    // ---- (b) eligibility is spent; the promo box is back ---------------------
    await addQty(page, 1);
    await expect(visible(page.getByText(/Welcome discount \(10%\)/i))).toHaveCount(0);
    const codeBox = visible(page.getByPlaceholder("Enter discount code"));
    await expect(codeBox).toBeVisible({ timeout: 20_000 });

    await codeBox.fill("SAVE30");
    await visible(page.getByRole("button", { name: /^Apply$/i })).click();
    await expect(visible(page.getByText(/Discount \(SAVE30\)/i))).toBeVisible({ timeout: 20_000 });
  });
});

const round2 = (n) => Math.round(n * 100) / 100;

test.describe("a promo that crosses the free-delivery threshold recomputes shipping and tax", () => {
  test("shipping reappears and tax is charged on the post-promo subtotal", async ({ page, request }) => {
    // Derive the quantity from the REAL unit price instead of hardcoding one.
    // These figures were pinned to a 89.00 product; when the seed changed and the
    // grid led with a 74.00 one, the test failed with "Expected 16.82, Received
    // 13.99" — arithmetic that was perfectly correct for the cart it was looking
    // at. Pin the RULE, compute the numbers.
    const price = Number((await productDetail(request, await firstProductId(request))).base_price);
    expect(Number.isFinite(price) && price > 0).toBe(true);

    // We need a cart that starts ABOVE the free-delivery threshold and lands
    // BELOW it once 30% comes off — that crossing is the whole point.
    let qty = 0;
    for (let n = 1; n <= 12; n++) {
      const sub = round2(price * n);
      if (sub >= THRESHOLD && round2(sub - round2(sub * 0.3)) < THRESHOLD) {
        qty = n;
        break;
      }
    }
    expect(qty, `no quantity of a ${price} item crosses the ${THRESHOLD} threshold with 30% off`).toBeGreaterThan(0);

    await addQty(page, qty);
    await expect(visible(page.getByText(/Free/i)).first()).toBeVisible({ timeout: 20_000 });

    await visible(page.getByPlaceholder("Enter discount code")).fill("SAVE30");
    await visible(page.getByRole("button", { name: /^Apply$/i })).click();
    await expect(visible(page.getByText(/Discount \(SAVE30\)/i))).toBeVisible({ timeout: 20_000 });

    // Mirrors cartTotals.js / myAppCheckout: discount and post-promo base are each
    // rounded, tax is charged on the POST-promo base, shipping is never taxed.
    const subtotal = round2(price * qty);
    const afterPromo = round2(subtotal - round2(subtotal * 0.3));
    const expectedTax = round2((afterPromo * TAX_RATE) / 100);
    const expectedTotal = round2(afterPromo + STANDARD_SHIPPING + expectedTax);

    // The waiver is lost — this is the assertion the whole spec exists for.
    expect(money(await totalsRow(page, "Shipping"))).toBeCloseTo(STANDARD_SHIPPING, 2);
    // Tax on the discounted base, NOT on the pre-promo subtotal.
    expect(money(await totalsRow(page, "Tax"))).toBeCloseTo(expectedTax, 2);
    expect(expectedTax).not.toBeCloseTo(round2((subtotal * TAX_RATE) / 100), 2);

    // The grand-total row is labelled just "Total" — "Order Total" is the <h2>
    // heading of the whole summary block, not a row.
    expect(money(await totalsRow(page, "Total"))).toBeCloseTo(expectedTotal, 2);
  });
});

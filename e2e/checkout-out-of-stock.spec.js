// SPEC 2 — the checkout failure path that actually ships.
//
// The plan's original Spec 2 was "payment decline". That path does not exist in
// a COD-only store: there is no processor to decline, and DemoPaymentGateway is a
// sandbox modal that will be replaced before cards ever go live. The plan says so
// itself ("If launching COD-only, skip this spec entirely"). Writing it would
// have tested a screen that is scheduled for deletion.
//
// So this covers the failure a COD customer CAN actually hit: an item selling out
// between adding it to the cart and confirming the order. myAppCheckout locks
// variants FOR UPDATE and rejects with "One or more items are no longer in
// stock"; the payment page matches that message and routes to /cart?stock=oos
// rather than showing an inline error, because the fix is in the cart (drop or
// reduce the offending line), not on the payment step.
//
// The window is forced with an admin call rather than by racing two shoppers —
// the assertion is about the app's response, and a real race would make it
// intermittent for no extra coverage.
import { test, expect } from "./fixtures";
import {
  openFirstProduct,
  addCurrentProductToCart,
  visible,
  firstProductId,
  productVariants,
  setVariantQuantity,
} from "./helpers";

test.describe("checkout — item sells out before confirmation", () => {
  let productId;
  let restore = [];

  test.afterEach(async ({ request }) => {
    // Always put the stock back: the suite shares one database and the funnel
    // specs shop from this same product, so leaking a zeroed variant would fail
    // whatever runs next with an unrelated-looking error.
    for (const { id, quantity } of restore) {
      await setVariantQuantity(request, id, quantity).catch(() => {});
    }
    restore = [];
  });

  test("checkout is refused and the customer is sent back to a cart that explains why", async ({
    page,
    request,
  }) => {
    productId = await firstProductId(request);

    const productName = await openFirstProduct(page);
    await addCurrentProductToCart(page);
    await page.goto("/cart");
    await expect(visible(page.getByText(productName))).toBeVisible({ timeout: 20_000 });

    await visible(page.getByRole("button", { name: /Continue to Next Step/i })).click();
    await page.waitForURL("**/checkout", { timeout: 20_000 });
    await visible(page.getByRole("button", { name: /Continue to Next Step/i })).click();
    await page.waitForURL("**/checkout/payment", { timeout: 20_000 });

    // The item sells out while the customer is on the payment step.
    const variants = await productVariants(request, productId);
    expect(variants.length).toBeGreaterThan(0);
    restore = variants.map((v) => ({ id: Number(v.id), quantity: Number(v.quantity) }));
    for (const v of variants) await setVariantQuantity(request, Number(v.id), 0);

    await visible(page.getByText(/Cash on Delivery/i)).click();
    await visible(page.getByText(/I agree to the/i)).click();
    await visible(page.getByRole("button", { name: /^Confirm Order$/i })).click();

    // Back to the cart, flagged — not an inline error on a step where the
    // customer cannot act on it.
    await page.waitForURL(/\/cart\?stock=oos/, { timeout: 30_000 });

    // The cart says which line is the problem and refuses to move on.
    await expect(
      visible(page.getByText(/out of stock|no longer available|unavailable/i))
    ).toBeVisible({ timeout: 20_000 });

    // And crucially: NO order was created, so nothing was promised to a customer
    // the store cannot supply.
    await page.goto("/account/orders");
    await expect(page).toHaveURL(/\/account\/orders/);
  });
});

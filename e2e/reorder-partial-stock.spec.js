// SPEC 5 — "Buy Again" when part of the original order has since sold out.
//
// The interesting behaviour is the PARTIAL case, not the happy one: myAppReorder
// re-adds every line at its original quantity capped to current stock, so an
// order containing one available and one sold-out item must do BOTH things at
// once — quietly put the available line in the cart, and tell the customer about
// the one it could not. Getting only half of that right is silent either way: a
// cart that filled up without saying what was missing, or a warning that
// discarded the items it could have added.
//
// The order is placed through the real UI (two different sizes → two variants),
// then one variant is emptied through the admin resolvers so the "sold out
// since" state is exact rather than dependent on what other specs consumed.
import { test, expect } from "./fixtures";
import {
  openFirstProduct,
  addCurrentProductToCart,
  visible,
  emptyCart,
  firstProductId,
  productDetail,
  setVariantQuantity,
} from "./helpers";

const KNOWN_STOCK = 20;

test.describe("Buy Again with one line sold out since the order", () => {
  let restore = [];

  test.afterEach(async ({ request }) => {
    for (const { id, quantity } of restore) {
      await setVariantQuantity(request, id, quantity).catch(() => {});
    }
    restore = [];
  });

  test("re-adds what is available and offers a restock alert for what is not", async ({
    page,
    request,
  }) => {
    const productId = await firstProductId(request);
    const detail = await productDetail(request, productId);
    const colorId = Number(detail.colors[0].id);

    // Two variants in the SAME colour so one product page can add both — the
    // page keeps the selected colour and only the size changes.
    const sized = detail.variants
      .filter((v) => Number(v.color_id) === colorId)
      .map((v) => ({
        ...v,
        sizeName: detail.sizes.find((s) => Number(s.id) === Number(v.size_id))?.name,
      }))
      .filter((v) => v.sizeName);
    expect(sized.length, "need two variants in one colour to build a 2-line order").toBeGreaterThan(1);

    const keep = sized[0]; // stays in stock
    const sellOut = sized[1]; // sells out after the order

    for (const v of [keep, sellOut]) {
      await setVariantQuantity(request, Number(v.id), KNOWN_STOCK);
      restore.push({ id: Number(v.id), quantity: KNOWN_STOCK });
    }

    // ---- place a two-line order -------------------------------------------
    await emptyCart(page);
    const productName = await openFirstProduct(page);
    await addCurrentProductToCart(page, [keep.sizeName]);
    await openFirstProduct(page);
    await addCurrentProductToCart(page, [sellOut.sizeName]);

    await page.goto("/cart");
    await visible(page.getByRole("button", { name: /Continue to Next Step/i })).click();
    await page.waitForURL("**/checkout", { timeout: 20_000 });
    await visible(page.getByRole("button", { name: /Continue to Next Step/i })).click();
    await page.waitForURL("**/checkout/payment", { timeout: 20_000 });
    await visible(page.getByText(/Cash on Delivery/i)).click();
    await visible(page.getByText(/I agree to the/i)).click();

    // Take the order id from the checkout response rather than following the
    // success page's "Track Order" link — that link resolved to the orders LIST
    // here, and this spec is about reorder behaviour, not about which page a CTA
    // happens to target. (Worth a look separately: the success page is documented
    // as linking to /account/orders/<id>.)
    const checkoutRes = page.waitForResponse(
      (r) =>
        r.url().includes("/repair/graphql") &&
        (r.request().postData() || "").includes("myAppCheckout"),
      { timeout: 30_000 }
    );
    await visible(page.getByRole("button", { name: /^Confirm Order$/i })).click();
    await page.waitForURL("**/checkout/success", { timeout: 30_000 });

    const body = await (await checkoutRes).json();
    const orderId = Number(
      JSON.parse(body?.data?.myAppCheckout?.serverResponse ?? "{}")?.order_id
    );
    expect(Number.isFinite(orderId) && orderId > 0).toBe(true);
    await page.goto(`/account/orders/${orderId}`);

    // ---- one line sells out ------------------------------------------------
    await setVariantQuantity(request, Number(sellOut.id), 0);

    // ---- Buy Again ---------------------------------------------------------
    await visible(page.getByRole("button", { name: /Buy Again/i })).click();

    const drawer = page.getByRole("dialog", { name: /Some items are out of stock/i });
    await expect(drawer).toBeVisible({ timeout: 30_000 });

    // Assert on the drawer's actual copy. A bare getByText(sizeName) is useless
    // here — a single letter like "M" substring-matches "SOME ITEMS", "NOTIFY ME"
    // and half the drawer. The variant line renders as "<colour> / <size>".
    const text = await drawer.innerText();

    // It says how many lines it DID add — the quiet half of the behaviour.
    expect(text).toMatch(/1 item added to your cart/i);

    // The sold-out variant is named…
    expect(text).toContain(`/ ${sellOut.sizeName}`);
    // …and the still-available one is NOT reported as a problem. Without this the
    // test would pass just as happily if the drawer listed every line as sold out.
    expect(text).not.toContain(`/ ${keep.sizeName}`);

    // "Go to Cart" only renders when something was actually added.
    await expect(drawer.getByRole("button", { name: /Go to Cart/i })).toBeVisible();

    // ---- the restock alert offered here actually works ---------------------
    await drawer.getByRole("button", { name: /^Notify Me$/i }).first().click();
    await expect(drawer.getByText(/On the list/i).first()).toBeVisible({ timeout: 20_000 });

    // ---- and the cart really does hold the available line -------------------
    await drawer.getByRole("button", { name: /Go to Cart/i }).click();
    await page.waitForURL("**/cart", { timeout: 20_000 });
    await expect(visible(page.getByText(productName))).toBeVisible({ timeout: 20_000 });
  });
});

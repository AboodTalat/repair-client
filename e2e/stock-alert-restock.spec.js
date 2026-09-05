// SPEC 4 — "notify me when it's back" survives the round trip: a customer
// subscribes to an out-of-stock variant, an admin restocks it, and the alert
// flips to `notified` on its own.
//
// The restock notification is NOT a manual admin action — myAppAdminUpdateProductVariant
// fires it automatically on a 0 -> positive transition (adminCatalog.ts:1318,
// `if (prevQty <= 0 && newQty > 0)`), claiming every pending alert for that
// variant and queueing an email each. That automatic edge is the thing worth a
// test: it is invisible in the admin UI, so a regression would show up only as
// customers never hearing back about something they asked to be told about.
//
// The variant is emptied and refilled through the admin resolvers rather than by
// buying stock out, so the numbers are exact and the test does not depend on how
// much inventory earlier specs consumed.
import { test, expect } from "./fixtures";
import {
  visible,
  firstProductId,
  productDetail,
  setVariantQuantity,
  listStockAlerts,
} from "./helpers";

test.describe("stock alert → restock → notification", () => {
  let restore = null;

  test.afterEach(async ({ request }) => {
    // Put the stock back even if the test failed — every other spec shops from
    // this same product, and a variant left at 0 would fail them with an
    // unrelated-looking "no in-stock size found".
    if (restore) {
      await setVariantQuantity(request, restore.id, restore.quantity).catch(() => {});
      restore = null;
    }
  });

  test("a restock automatically notifies the customer who asked", async ({ page, request }) => {
    const productId = await firstProductId(request);
    const detail = await productDetail(request, productId);

    // Target the first colour's variant — the product page selects the first
    // colour by default, so the size button alone drives the selection.
    const firstColorId = Number(detail.colors[0].id);
    const target = detail.variants.find((v) => Number(v.color_id) === firstColorId);
    expect(target, "seeded product should have a variant in its first colour").toBeTruthy();
    const sizeName = detail.sizes.find((s) => Number(s.id) === Number(target.size_id))?.name;
    expect(sizeName).toBeTruthy();

    // Set a KNOWN starting stock rather than trusting whatever earlier specs left
    // behind. Without this the test inherits the running total: an earlier run
    // that left the variant at 0 makes `restore` put back 0, which then fails
    // every other spec with an unrelated-looking "no in-stock size found" — and
    // that is exactly how this spec failed the first time it was run.
    const KNOWN_STOCK = 25;
    await setVariantQuantity(request, Number(target.id), KNOWN_STOCK);
    restore = { id: Number(target.id), quantity: KNOWN_STOCK };

    // ---- the variant sells out --------------------------------------------
    await setVariantQuantity(request, Number(target.id), 0);

    // ---- the customer asks to be told when it returns ----------------------
    await page.goto(`/products/${productId}`);
    await visible(page.getByRole("button", { name: sizeName, exact: true })).click();

    const notifyBtn = visible(page.getByRole("button", { name: /Notify When Available/i }));
    await expect(notifyBtn).toBeVisible({ timeout: 20_000 });
    await notifyBtn.click();

    // The CTA itself is the confirmation — it becomes "You're on the list".
    await expect(visible(page.getByRole("button", { name: /You're on the list/i }))).toBeVisible({
      timeout: 20_000,
    });

    // The queue shows it as pending, against the right variant.
    const pending = await listStockAlerts(request, { status: "pending" });
    expect(pending.some((a) => Number(a.product_variant_id) === Number(target.id))).toBe(true);

    // ---- the admin restocks it (0 -> 5 is the automatic trigger) -----------
    await setVariantQuantity(request, Number(target.id), 5);

    // ---- the alert flips to notified, unprompted ---------------------------
    await expect
      .poll(
        async () => {
          const notified = await listStockAlerts(request, { status: "notified" });
          return notified.some((a) => Number(a.product_variant_id) === Number(target.id));
        },
        { timeout: 20_000, message: "restock should flip the pending alert to notified" }
      )
      .toBe(true);

    // …and it is no longer waiting in the pending queue.
    const stillPending = await listStockAlerts(request, { status: "pending" });
    expect(stillPending.some((a) => Number(a.product_variant_id) === Number(target.id))).toBe(false);
  });
});

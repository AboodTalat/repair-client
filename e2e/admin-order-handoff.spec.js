// SPEC 7 (browser half) — the admin console can actually walk an order through
// its pipeline and hand it to a driver.
//
// The RESOLVER side of this — the transitions, the assignment scoping, and the
// privacy boundary where a failed delivery emails the customer a clean reason and
// never the courier's internal note — is covered behaviourally in
// Server/test/int/deliveryHandoff.int.test.ts, because the email body it has to
// read is not visible from a browser. What only a browser can tell you is
// whether the console an operator uses every day actually performs the handoff:
// the pipeline button, and the channel modal behind it.
//
// CHROMIUM ONLY, for the same reason as the auth spec: this signs in as the
// admin, and myAppLogin is capped at 5/min per IP.
import { test, expect } from "./fixtures";
import {
  visible,
  firstProductId,
  productDetail,
  setVariantQuantity,
  adminOrderDetail,
  ADMIN_STORAGE_STATE,
} from "./helpers";

test.describe.configure({ mode: "serial" });

test.describe("admin console — order pipeline and delivery handoff", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "admin login is rate-limited per IP");
  // Places a real order AND drives the console in a second browser context — well
  // past the suite's default per-test budget.
  test.setTimeout(240_000);

  test("Processing → Prepared → With Delivery, assigned to a driver", async ({
    page,
    browser,
    request,
    baseURL,
  }) => {
    // ---- a real order, placed as the signed-in customer --------------------
    const productId = await firstProductId(request);
    const detail = await productDetail(request, productId);
    const variant = detail.variants.find((v) => Number(v.color_id) === Number(detail.colors[0].id));
    await setVariantQuantity(request, Number(variant.id), 25);

    const sizeName = detail.sizes.find((s) => Number(s.id) === Number(variant.size_id))?.name;
    await page.goto(`/products/${productId}`);
    await visible(page.getByRole("button", { name: sizeName, exact: true })).click();
    await visible(page.getByRole("button", { name: "Add to Cart" })).click();
    await page.waitForTimeout(600);

    await page.goto("/cart");
    await visible(page.getByRole("button", { name: /Continue to Next Step/i })).click();
    await page.waitForURL("**/checkout", { timeout: 20_000 });
    await visible(page.getByRole("button", { name: /Continue to Next Step/i })).click();
    await page.waitForURL("**/checkout/payment", { timeout: 20_000 });
    await visible(page.getByText(/Cash on Delivery/i)).click();
    await visible(page.getByText(/I agree to the/i)).click();

    const checkout = page.waitForResponse(
      (r) =>
        r.url().includes("/repair/graphql") &&
        (r.request().postData() || "").includes("myAppCheckout"),
      { timeout: 30_000 }
    );
    await visible(page.getByRole("button", { name: /^Confirm Order$/i })).click();
    await page.waitForURL("**/checkout/success", { timeout: 30_000 });
    const placed = JSON.parse((await (await checkout).json()).data.myAppCheckout.serverResponse);
    const orderNumber = String(placed.order_number);
    expect(orderNumber).toBeTruthy();

    // ---- a SEPARATE browser context for the admin --------------------------
    // The suite's shared session is the customer; signing the admin in here
    // instead of swapping storage keeps the customer session intact for the
    // specs that follow.
    // The ADMIN session, minted once by admin.setup.js. Note newContext()
    // inherits the project's `use` options — including the signed-in CUSTOMER
    // session — so the state must always be passed explicitly here; a "fresh"
    // context silently arrives as the wrong user.
    const adminCtx = await browser.newContext({
      baseURL,
      storageState: ADMIN_STORAGE_STATE,
    });
    const admin = await adminCtx.newPage();
    // No try/finally around this block: a finally that closes the context masks
    // the real failure behind "browserContext.close: Test ended", which cost two
    // debugging rounds. Playwright tears the context down with the browser.
    {
      // ---- find THIS order ------------------------------------------------
      await admin.goto("/r3pr-console/orders");
      await visible(admin.getByPlaceholder(/search/i)).fill(orderNumber);
      const row = admin.getByText(orderNumber, { exact: false }).first();
      await expect(row).toBeVisible({ timeout: 20_000 });
      await row.click();

      // ---- Processing → Prepared ------------------------------------------
      const prepared = visible(admin.getByRole("button", { name: /Mark as Prepared/i }));
      await expect(prepared).toBeVisible({ timeout: 20_000 });
      await prepared.click();

      // ---- Prepared → With Delivery opens the CHANNEL modal ---------------
      const withDelivery = visible(admin.getByRole("button", { name: /Mark as With Delivery/i }));
      await expect(withDelivery).toBeVisible({ timeout: 20_000 });
      await withDelivery.click();

      // Assign the internal driver rather than accepting the default
      // "Don't assign" — assignment is what puts the order on a driver's
      // dashboard at all, so the unassigned path proves less.
      const driverChoice = admin.getByText(/e2e-driver@test\.local/i).first();
      await expect(driverChoice).toBeVisible({ timeout: 20_000 });
      await driverChoice.click();

      // The confirm button LABELS the choice — "Assign & hand over" only when a
      // driver is actually selected, "Hand over anyway" when none is. Asserting
      // the label first means a click that failed to register can't slip through
      // as an unassigned hand-over that still looks like a pass.
      const confirm = visible(admin.getByRole("button", { name: /Assign & hand over/i }));
      await expect(confirm).toBeVisible({ timeout: 20_000 });
      await confirm.click();

      // Give the mutation a moment to land before reading the backend.
      await admin.waitForTimeout(1500);
    }
    await adminCtx.close();

    // ---- the ORDER really moved, with the driver attached ------------------
    // Asserted against the BACKEND, not the console's own optimistic rendering —
    // a console that renders "With Delivery" while the order never moved is
    // exactly the failure worth catching, and a UI-only assertion cannot see it.
    const order = await adminOrderDetail(request, placed.order_id);
    expect(String(order.status)).toBe("out_for_delivery");
    expect(Number(order.delivery_user_id)).toBeGreaterThan(0);
  });
});

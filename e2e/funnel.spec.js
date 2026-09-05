// Checkout funnel — COD (Cash on Delivery) is the shipping payment path.
//
// LAUNCH CONFIG (decided Aug 2026): the store launches COD-only; a real card
// gateway comes later. `DemoPaymentGateway.jsx` is a labelled sandbox modal that
// authorises nothing and moves no money, so the wallet/gateway tests at the
// bottom are guarded — they SKIP when the store is configured COD-only rather
// than failing, because a test that breaks when the product is configured the
// way it ships is testing the wrong thing. See deploy checklist items 30-31.
//
// Two happy paths, deliberately separate:
//   1. logged-in COD  — the seeded customer + their default address. Deterministic;
//                       this is the one that must never flake, because it is the
//                       assertion that checkout actually works.
//   2. guest COD      — registration + the 8-field address drawer. Higher value
//                       (it is the real first-time-buyer flow) but far more
//                       surface, so it is isolated: a flake here cannot mask (1).

import { test, expect } from "./fixtures";
import {
  openFirstProduct,
  addCurrentProductToCart,
  visible,
  enabledPaymentKeys,
} from "./helpers";

// The product name is READ from the page, never hardcoded — the helper opens
// "whatever is first in the grid", and which product that is depends on the seed.
let PRODUCT = "";

// JOD 1,234.56 → 1234.56
const money = (s) => Number(String(s).replace(/[^0-9.]/g, ""));

async function addOneItemToCart(page) {
  PRODUCT = await openFirstProduct(page);
  await addCurrentProductToCart(page);
  await page.goto("/cart");
  await expect(visible(page.getByText(PRODUCT))).toBeVisible({ timeout: 20_000 });
}

// Payment step → pick COD → agree → confirm. Returns the myAppGetOrderDetail
// payload the success page fetched, so the test can compare it against what the
// page actually rendered.
async function payWithCod(page) {
  await visible(page.getByText(/Cash on Delivery/i)).click();

  // COD charges nothing now, so the CTA drops the word "Pay" — asserting the
  // label is asserting that the app knows which method is selected.
  const cta = visible(page.getByRole("button", { name: /^Confirm Order$/i }));
  await expect(cta).toBeVisible({ timeout: 10_000 });

  await visible(page.getByText(/I agree to the/i)).click();

  const detail = page
    .waitForResponse(
      (r) =>
        r.url().includes("/repair/graphql") &&
        (r.request().postData() || "").includes("myAppGetOrderDetail"),
      { timeout: 30_000 }
    )
    .catch(() => null);

  await cta.click();
  await page.waitForURL("**/checkout/success", { timeout: 30_000 });

  // COD must never open the sandbox gateway.
  await expect(page.getByRole("dialog", { name: /Demo payment gateway/i })).toHaveCount(0);

  const res = await detail;
  if (!res) return null;
  const body = await res.json().catch(() => null);
  const raw = body?.data?.myAppGetOrderDetail?.serverResponse;
  try {
    // The resolver answers ok({ order, items, history }) — the order row is nested.
    return JSON.parse(raw)?.order ?? null;
  } catch {
    return null;
  }
}

async function assertSuccessPageMatchesOrder(page, order) {
  await expect(visible(page.getByText(/Order Successful/i))).toBeVisible({ timeout: 20_000 });

  // Order number is rendered, and it is the one the backend recorded.
  const orderNo = String(order?.order_number ?? "");
  expect(orderNo).not.toEqual("");
  await expect(visible(page.getByText(orderNo, { exact: false }))).toBeVisible();

  // The displayed total equals the persisted total — the number the customer
  // was shown is the number the store actually recorded against the order.
  const totalText = await visible(
    page.locator("text=/JOD\\s*[0-9,]+(\\.[0-9]{2})?/").last()
  ).innerText();
  expect(money(totalText)).toBeGreaterThan(0);
  expect(Number(order.total)).toBeCloseTo(money(totalText), 2);
}

async function assertCartIsEmpty(page) {
  await page.goto("/cart");
  await expect(visible(page.getByText(/Your (shopping )?cart is empty|YOUR CART IS EMPTY/i))).toBeVisible({
    timeout: 20_000,
  });
}

test.describe("checkout funnel — COD (the shipping path)", () => {
  test("logged-in customer completes a COD order end to end", async ({ page }) => {
    // Already signed in via the `setup` project's saved storage state.
    await addOneItemToCart(page);

    await visible(page.getByRole("button", { name: /Continue to Next Step/i })).click();
    await page.waitForURL("**/checkout", { timeout: 20_000 });

    // Seeded customer ships with a default address, so the details step needs no
    // entry — the shipping method defaults to Standard.
    await visible(page.getByRole("button", { name: /Continue to Next Step/i })).click();
    await page.waitForURL("**/checkout/payment", { timeout: 20_000 });

    const order = await payWithCod(page);
    expect(order).not.toBeNull();
    await assertSuccessPageMatchesOrder(page, order);

    // COD is unpaid at placement — the money has not moved yet, and the order
    // must say so rather than reading as settled.
    expect(String(order.payment_status ?? "pending")).toBe("pending");

    // "Track Order" reaches THIS order, not the orders list. Pinned because
    // nothing was checking it and it is the primary post-purchase CTA: the
    // handler falls back to /account/orders when the id is missing
    // (OrderSuccessClient.jsx:747), so a regression degrades silently.
    //
    // Note it is a <button>, not a link — and the shop FOOTER carries a separate
    // link also labelled "Track Order" that legitimately points at the list
    // (storeNav.js:243). Matching by role is what keeps the two apart; a
    // role-agnostic text locator picks the footer and quietly asserts nothing.
    await visible(page.getByRole("button", { name: /^Track Order$/i })).click();
    await expect(page).toHaveURL(new RegExp(`/account/orders/${order.id}\\b`), { timeout: 20_000 });
    await page.goBack();

    await assertCartIsEmpty(page);
  });
});

test.describe("checkout funnel — guest COD (first-time buyer)", () => {
  // Explicitly anonymous: every other test inherits the signed-in session from
  // the `setup` project, and a logged-in "guest" would silently exercise the
  // wrong branch — /cart would show "Continue to Next Step", not "Continue as a
  // guest", and the registration form would never render.
  test.use({ storageState: { cookies: [], origins: [] } });

  // The real first-time-buyer flow: no account, register at the details step,
  // enter an address from scratch, pay COD. Deliberately a separate describe from
  // the logged-in test above — it drives far more surface (registration + an
  // 8-field address drawer with a country-code picker), so isolating it means a
  // flake here cannot mask the core "checkout works" assertion.
  //
  // Both email and phone are UNIQUE columns, so each run mints its own.
  test("guest registers, adds an address, and completes a COD order", async ({ page }) => {
    const stamp = String(Date.now());
    const email = `e2e-guest-${stamp}@test.local`;
    const phoneLocal = `79${stamp.slice(-7)}`; // 9 digits, Jordan mobile shape

    await addOneItemToCart(page);

    await visible(page.getByRole("button", { name: /CONTINUE AS A GUEST/i })).click();
    await page.waitForURL("**/checkout", { timeout: 20_000 });

    // Registration (the guest contact section IS a signup form).
    await visible(page.getByLabel("Email address")).fill(email);
    await visible(page.getByLabel("Phone number")).fill(phoneLocal);
    await visible(page.getByLabel("Password")).fill("Passw0rd!");

    // Address — scoped to the drawer, because "Phone number" also labels the
    // registration field above and would otherwise be ambiguous.
    await visible(page.getByRole("button", { name: /Add Shipping Address/i })).click();
    const drawer = page.getByRole("dialog", { name: /Add new address/i });
    await expect(drawer).toBeVisible({ timeout: 15_000 });

    await drawer.getByLabel("Address title").fill("Home");
    await drawer.getByLabel("Recipient full name").fill("E2E Guest");
    await drawer.getByLabel("Phone number").fill(phoneLocal);
    await drawer.getByLabel("Country").fill("Jordan");
    // City is a <select> of Jordan's 12 governorates (lib/jordanCities.js), not a
    // free-text field — the stored English value is what the backend maps to
    // Thunder's Arabic area name at dispatch.
    await drawer.getByLabel("City").selectOption({ label: "Amman" });
    await drawer.getByLabel("Neighborhood").fill("Abdoun");
    await drawer.getByLabel("Street").fill("Rainbow Street 12");
    await drawer.getByLabel("Building").fill("4");
    await drawer.getByRole("button", { name: /^ADD ADDRESS$/i }).click();
    await expect(drawer).toBeHidden({ timeout: 15_000 });

    // Continue registers the account, merges the guest cart, saves the address.
    await visible(page.getByRole("button", { name: /Continue to Next Step/i })).click();
    await page.waitForURL("**/checkout/payment", { timeout: 30_000 });

    const order = await payWithCod(page);
    expect(order).not.toBeNull();
    await assertSuccessPageMatchesOrder(page, order);
    await assertCartIsEmpty(page);
  });
});

test.describe("checkout funnel — wallet + sandbox gateway (NOT the shipping path)", () => {
  // Guarded, not deleted. While the store is COD-only these skip; when a real
  // gateway replaces DemoPaymentGateway they become the regression net for it.
  test("approve routes to /checkout/success", async ({ page, request }) => {
    // Skip on the STORE'S CONFIG, not on whether a button happens to have
    // rendered yet — see enabledPaymentKeys() for why the DOM probe is a trap.
    const keys = await enabledPaymentKeys(request);
    const wallet = keys.find((k) => k === "applepay" || k === "googlepay");
    test.skip(!wallet, `store offers only [${keys.join(", ")}] — no wallet method to test`);

    await addOneItemToCart(page);
    await visible(page.getByRole("button", { name: /Continue to Next Step/i })).click();
    await page.waitForURL("**/checkout", { timeout: 20_000 });
    await visible(page.getByRole("button", { name: /Continue to Next Step/i })).click();
    await page.waitForURL("**/checkout/payment", { timeout: 20_000 });

    const label = wallet === "applepay" ? /Apple Pay/i : /Google Pay/i;
    await visible(page.getByRole("button", { name: label })).click();
    await visible(page.getByText(/I agree to the/i)).click();
    await visible(page.getByRole("button", { name: /Confirm & Pay|PAY & CONFIRM ORDER/i })).click();

    const gateway = page.getByRole("dialog", { name: /Demo payment gateway/i });
    await expect(gateway).toBeVisible({ timeout: 20_000 });
    await gateway.getByRole("button", { name: /^Pay /i }).click();
    await page.waitForURL("**/checkout/success", { timeout: 30_000 });
    await expect(visible(page.getByText(/Order Successful/i))).toBeVisible();
  });
});

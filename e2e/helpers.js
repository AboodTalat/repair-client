// Shared helpers for the repair storefront e2e suite.
//
// The catalog + the login user are provisioned by
// Server/test/seedE2eCatalog.ts (run once against repair_test before the
// suite). Selectors favour roles / visible text over brittle CSS.

import { expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

// Where auth.setup.js parks the signed-in session for every test to reuse.
// Gitignored — it holds a real (short-lived) token.
export const STORAGE_STATE = path.join(process.cwd(), "e2e/.auth/shopper.json");

// The admin's browser session, cached the same way and for the same reason: two
// specs drive the console, and logging in per spec spends two of the five
// myAppLogin calls the IP is allowed each minute.
export const ADMIN_STORAGE_STATE = path.join(process.cwd(), "e2e/.auth/admin.json");

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

  // Return the name of the product ACTUALLY opened, so callers can assert on it
  // instead of hardcoding one.
  //
  // Specs used to assert the literal "Everyday Hoodie" while this helper opens
  // "whatever is first in the grid". Those coincided until the catalog was
  // re-seeded with an extra user, after which the grid led with a different
  // product and 22 of 34 tests failed with "element(s) not found" — a coupling
  // no assertion stated and nothing enforced.
  const heading = page.getByRole("heading", { level: 1 }).filter({ visible: true }).first();
  await expect(heading).toBeVisible({ timeout: 20_000 });
  return (await heading.innerText()).trim();
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

// The GraphQL endpoint the storefront under test talks to. Mirrors
// playwright.config.js's TEST_GRAPHQL; override if the backend moves.
export const TEST_GRAPHQL =
  process.env.NEXT_PUBLIC_REPAIR_GRAPHQL_URL || "http://localhost:5001/repair/graphql";

// Which payment methods the STORE currently offers, read from the backend
// rather than inferred from the DOM.
//
// This exists because the obvious DOM check is wrong in a way that fails silently:
// the payment step loads its methods asynchronously, so an `isVisible()` probe
// taken right after navigation returns false whether the method is genuinely
// disabled OR simply hasn't rendered yet. Used as a `test.skip` condition that
// means "the store is COD-only", which turns every slow load into a phantom
// pass. Asking the server is unambiguous and race-free.
export async function enabledShippingKeys(request) {
  const res = await gql(request, "myAppGetCommerceSettings", {}, { isQuery: true });
  if (!res.ok) throw new Error(`commerce settings failed: ${res.raw}`);
  return (res.data?.shippingMethods || []).filter((m) => m.enabled).map((m) => m.key);
}

export async function enabledPaymentKeys(request) {
  const res = await request.post(TEST_GRAPHQL, {
    data: {
      query:
        "query($appInput:MyAppInput){ myAppGetCommerceSettings(appInput:$appInput){ blnRequestSuccessful serverResponse } }",
      variables: { appInput: { strObjectInput: "{}" } },
    },
  });
  const body = await res.json();
  const raw = body?.data?.myAppGetCommerceSettings?.serverResponse;
  const parsed = JSON.parse(raw);
  return (parsed?.paymentMethods || []).filter((m) => m.enabled).map((m) => m.key);
}

// ── Admin-side helpers ───────────────────────────────────────────────────────
// Some shipped behaviour can only be reached by changing catalog state mid-flow
// (e.g. a variant selling out between "add to cart" and "confirm"). The
// storefront cannot do that, so these drive the admin resolvers over HTTP.
//
// The token is cached for the process: myAppLogin is rate-limited to 5/min per
// IP (SENSITIVE_OPS), and a helper that logged in per call would reintroduce
// exactly the throttle-flake that auth.setup.js exists to avoid.
export const ADMIN = { email: "e2e-admin@test.local", password: "Passw0rd!" };

// Both privileged logins are cached ON DISK, not just in memory, because the
// limiter counts across processes: every `playwright test` invocation is a fresh
// process, so an in-memory cache saves nothing when iterating.
const ADMIN_TOKEN_FILE = path.join(process.cwd(), "e2e/.auth/admin-token.json");
const MAX_SESSION_AGE_MS = 20 * 60 * 1000; // access tokens live 30 min

function freshFile(file) {
  try {
    return Date.now() - fs.statSync(file).mtimeMs < MAX_SESSION_AGE_MS;
  } catch {
    return false;
  }
}

export function isStorageStateFresh() {
  return freshFile(STORAGE_STATE);
}

export function isAdminStorageFresh() {
  return freshFile(ADMIN_STORAGE_STATE);
}

// Sign in through the UI as the seeded admin. Lands on the console.
export async function loginAdmin(page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email Address").fill(ADMIN.email);
  await page.getByLabel("Password", { exact: true }).fill(ADMIN.password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await page.waitForURL("**/r3pr-console**", { timeout: 30_000 });
}

let cachedAdminToken = null;

async function gql(request, op, payload, { token, isQuery } = {}) {
  const keyword = isQuery ? "query" : "mutation";
  const res = await request.post(TEST_GRAPHQL, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    data: {
      query: `${keyword} ${op}($appInput:MyAppInput){ ${op}(appInput:$appInput){ blnRequestSuccessful serverResponse } }`,
      variables: { appInput: { strObjectInput: JSON.stringify(payload ?? {}) } },
    },
  });
  const body = await res.json();
  const node = body?.data?.[op];
  let data = node?.serverResponse ?? null;
  try {
    data = JSON.parse(data);
  } catch {
    /* plain-string failure message */
  }
  return { ok: !!node?.blnRequestSuccessful, data, raw: node?.serverResponse ?? null };
}

export async function adminToken(request) {
  if (cachedAdminToken) return cachedAdminToken;
  if (freshFile(ADMIN_TOKEN_FILE)) {
    cachedAdminToken = JSON.parse(fs.readFileSync(ADMIN_TOKEN_FILE, "utf8")).token;
    if (cachedAdminToken) return cachedAdminToken;
  }
  const res = await gql(request, "myAppLogin", ADMIN, { isQuery: true });
  if (!res.ok) throw new Error(`admin login failed: ${res.raw}`);
  cachedAdminToken = res.data.token;
  fs.mkdirSync(path.dirname(ADMIN_TOKEN_FILE), { recursive: true });
  fs.writeFileSync(ADMIN_TOKEN_FILE, JSON.stringify({ token: cachedAdminToken }));
  return cachedAdminToken;
}

// Public read — the whole product blob (colors, sizes, variants).
export async function productDetail(request, productId) {
  const res = await gql(request, "myAppGetProductDetail", { productId }, { isQuery: true });
  if (!res.ok) throw new Error(`product detail failed: ${res.raw}`);
  return res.data;
}

// Public read — the variant ids for a product, so a test can target stock.
export async function productVariants(request, productId) {
  return (await productDetail(request, productId)).variants || [];
}

// Admin read — the stock-alert queue.
export async function listStockAlerts(request, filters = {}) {
  const token = await adminToken(request);
  const res = await gql(request, "myAppAdminListStockAlerts", filters, { token, isQuery: true });
  if (!res.ok) throw new Error(`list stock alerts failed: ${res.raw}`);
  return res.data.items || [];
}

export async function setVariantQuantity(request, variantId, quantity) {
  const token = await adminToken(request);
  const res = await gql(request, "myAppAdminUpdateProductVariant", { id: variantId, quantity }, { token });
  if (!res.ok) throw new Error(`set variant ${variantId} -> ${quantity} failed: ${res.raw}`);
}

// The seeded product every checkout spec shops from.
export async function firstProductId(request) {
  const res = await gql(request, "myAppListProducts", { limit: 1 }, { isQuery: true });
  if (!res.ok) throw new Error(`list products failed: ${res.raw}`);
  return Number(res.data.items[0].id);
}

// Empty the cart through the UI so a spec starts from a known subtotal.
//
// Needed because the cart PERSISTS across tests: they share one signed-in session
// (auth.setup.js), and specs that deliberately fail to check out — the
// out-of-stock one — leave their lines behind by design. Any assertion on an
// absolute money figure has to control for that or it is really asserting
// "whatever the previous test happened to leave".
//
// Done through the UI rather than myAppClearCart because the session token lives
// in AES-encrypted localStorage, which the test process cannot read.
export async function emptyCart(page) {
  await page.goto("/cart");
  // WAIT FOR THE CART TO RENDER FIRST. useCart fetches asynchronously, so
  // immediately after goto() there are no rows yet — an early count() returns 0,
  // the loop below breaks on the first pass, and the closing assertion then
  // passes trivially against a cart that is still full. That is exactly what
  // happened: a spec expecting 3 items ran against 12 and read a "Free" shipping
  // row it should have failed on. Race the two possible settled states.
  await page
    .getByRole("button", { name: /^Remove$/i })
    .first()
    .or(page.getByText(/cart is empty/i).first())
    .waitFor({ timeout: 20_000 });

  for (let i = 0; i < 30; i++) {
    const remove = page.getByRole("button", { name: /^Remove$/i }).filter({ visible: true });
    if ((await remove.count()) === 0) break;
    await remove.first().click();
    // Each removal is a round-trip; wait for the row to actually go rather than
    // racing the next click against a stale list.
    await page.waitForTimeout(400);
  }
  await expect(page.getByRole("button", { name: /^Remove$/i }).filter({ visible: true })).toHaveCount(0);
}

// Admin read of a single order — used to assert what the CONSOLE actually did,
// against the backend rather than against the console's own optimistic
// rendering. A UI that shows "With Delivery" while the order never moved is the
// exact failure worth catching.
export async function adminOrderDetail(request, orderId) {
  const token = await adminToken(request);
  const res = await gql(request, "myAppGetOrderDetail", { orderId }, { token, isQuery: true });
  if (!res.ok) throw new Error(`order detail failed: ${res.raw}`);
  return res.data.order ?? res.data;
}

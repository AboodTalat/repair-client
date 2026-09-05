// SPEC 8 (browser half) — the settings console refuses to break the store
// BEFORE it sends anything.
//
// The server enforces these invariants too, and that enforcement is tested
// behaviourally in Server/test/int/settingsGuardrails.int.test.ts (including
// under concurrency). What only a browser can show is that the CONSOLE refuses
// first — which matters here for a specific reason: this card saves ONE ROW PER
// REQUEST. Without a client-side check, "turn everything off" would apply to the
// first method, then the second, and only be refused on the last — leaving the
// store half-configured and the admin looking at an error for a row they had
// already switched off.
//
// Chromium only: signing in as the admin spends a myAppLogin, capped 5/min/IP.
import { test, expect } from "./fixtures";
import { visible, enabledShippingKeys, ADMIN_STORAGE_STATE } from "./helpers";

test.describe("admin settings — guardrails", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "admin login is rate-limited per IP");
  test.setTimeout(180_000);

  test("the console blocks disabling the last shipping method, and sends nothing", async ({
    browser,
    baseURL,
    request,
  }) => {
    const before = await enabledShippingKeys(request);
    expect(before.length).toBeGreaterThan(0);

    // Reuse the admin session minted once by admin.setup.js — see that file for
    // why this is not merely a speed optimisation.
    const ctx = await browser.newContext({ baseURL, storageState: ADMIN_STORAGE_STATE });
    const admin = await ctx.newPage();

    // Count the mutation the card would send. Without this the test cannot tell a
    // CLIENT-side refusal from a SERVER-side one — the server rejects the same
    // case with the same wording, so the visible outcome is identical. The point
    // of the client guard is that this card saves one row per request, so a
    // server-only refusal would already have applied the earlier rows.
    let updateCalls = 0;
    admin.on("request", (r) => {
      if (
        r.url().includes("/repair/graphql") &&
        (r.postData() || "").includes("myAppAdminUpdateShippingMethod")
      ) {
        updateCalls++;
      }
    });

    await admin.goto("/r3pr-console/settings");

    // The Shipping Methods card. Each method's toggle is labelled by its STATE
    // ("Shown" / "Hidden"), so the enabled ones are exactly the "Shown" toggles.
    // SettingsCard renders a <section> whose TITLE IS A <p>, not a heading — so
    // getByRole("heading") matches nothing here.
    //
    // Text alone is not enough either: TWO sections contain "Shipping Methods",
    // because the Express Shipping card's description points at it ("Show or hide
    // Express itself from the Shipping Methods card below"). `.first()` picked
    // that one, which has no toggles at all. Require the card that actually holds
    // the checkboxes.
    const card = admin
      .locator("section")
      .filter({ hasText: /Shipping Methods/i })
      .filter({ has: admin.locator('input[type="checkbox"]') })
      .first();
    await expect(card).toBeVisible({ timeout: 20_000 });

    // Target the checkbox INPUTS rather than their labels. Toggle renders a
    // <label> wrapping an opacity-0 checkbox plus a state word ("Shown"/"Hidden"),
    // and getByLabel does not resolve that arrangement here — the inputs are
    // unambiguous and carry the state directly.
    //
    // Settings load asynchronously, so wait for the rows to exist before counting:
    // count() does not wait, and an early 0 would look like a failure against a
    // card that simply had not rendered yet.
    const boxes = card.locator('input[type="checkbox"]');
    await expect.poll(async () => boxes.count(), { timeout: 20_000 }).toBeGreaterThan(0);

    const total = await boxes.count();
    let enabled = 0;
    for (let i = 0; i < total; i++) if (await boxes.nth(i).isChecked()) enabled++;
    expect(enabled).toBeGreaterThan(0);

    // Switch every enabled method off — the state the guard exists to refuse.
    for (let i = 0; i < total; i++) {
      if (await boxes.nth(i).isChecked()) await boxes.nth(i).click({ force: true });
    }
    for (let i = 0; i < total; i++) expect(await boxes.nth(i).isChecked()).toBe(false);

    await visible(card.getByRole("button", { name: /^Save$/i })).click();

    // It says why, in the operator's language.
    await expect(
      card.getByText(/at least one shipping method must stay enabled/i)
    ).toBeVisible({ timeout: 20_000 });

    // NOTHING was sent. This is the assertion that makes it a test of the CONSOLE
    // rather than of the server behind it.
    expect(updateCalls).toBe(0);

    await ctx.close();

    // And the stored configuration is untouched.
    expect((await enabledShippingKeys(request)).sort()).toEqual(before.sort());
  });
});

// SPEC 6 — the auth lifecycle a real customer walks: sign up, sign out, sign back
// in, ask for a password reset, and meet a broken reset link.
//
// SINGLE BROWSER, DELIBERATELY. Every step here is a SENSITIVE_OP, capped at
// 5/min per IP per operation (Server/index.ts). This spec spends ~3 logins and a
// signup; running it in triplicate across chromium/firefox/webkit would spend ~9
// logins in the same minute and throttle itself — the later browsers would fail
// with "login never navigated", which reads like a browser bug and is not one.
// Auth here is server-driven and has no browser-specific surface worth the
// tripled cost against a shared budget.
//
// WHAT IS NOT HERE, ON PURPOSE:
//
//   * The 10-attempt ACCOUNT LOCKOUT. It is unreachable through a browser: the
//     per-IP limiter answers 429 from the SIXTH attempt, so a single client can
//     never reach the tenth. Measured against this backend — attempts 1-5 return
//     "Invalid email or password", 6+ return HTTP 429. That is defence in depth
//     working as designed (the lockout exists for DISTRIBUTED attacks, where the
//     per-IP cap does not bite), and it is already covered thoroughly at the
//     resolver level in Server/test/int/securityLockout.int.test.ts — including
//     concurrent bursts and lost-update safety. Duplicating it here would be
//     impossible and, if forced, would only re-test the throttle.
//
//   * Completing a password reset. The token is stored HASHED
//     (auth.ts:1203) and only ever exists in the emailed link, which this
//     environment does not send. That round trip belongs where the queued email
//     row is readable — see Server/test/int/passwordResetFlow.int.test.ts.
import { test, expect } from "./fixtures";
import { visible } from "./helpers";

// Anonymous: this spec creates and drives its own account.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe.configure({ mode: "serial" });

test.describe("auth lifecycle", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "auth ops are rate-limited per IP — see the header of this file"
  );

  test("sign up → sign out → sign back in, and bad credentials stay uniform", async ({ page }) => {
    const stamp = String(Date.now());
    const email = `e2e-auth-${stamp}@test.local`;
    const password = "Passw0rd!";

    // ---- sign up -----------------------------------------------------------
    await page.goto("/sign-up");
    await page.getByLabel("Email Address").fill(email);
    await visible(page.getByLabel("Phone number")).fill(`79${stamp.slice(-7)}`);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm Password").fill(password);
    await page.getByRole("button", { name: /^Sign Up$/i }).click();

    // Signup signs you straight in and routes to the customer home.
    await page.waitForURL("**/shop**", { timeout: 30_000 });

    // ---- sign out ----------------------------------------------------------
    // NOTE the accessible name is "Log out" (two words, from aria-label) while the
    // VISIBLE text is "LOGOUT". aria-label wins for role-based matching, so
    // /^Logout$/ matches nothing — the control is there, the locator was wrong.
    await visible(page.getByRole("button", { name: /^Log ?out$/i })).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/account"), { timeout: 20_000 });

    // Signed out for real: a guarded page bounces to sign-in with a ?next= back.
    await page.goto("/account");
    await page.waitForURL(/\/sign-in\?next=/, { timeout: 20_000 });

    // ---- wrong password ----------------------------------------------------
    await page.getByLabel("Email Address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("NotThePassword1!");
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    // Scope to the FORM. Next's App Router injects a route announcer that is also
    // exposed as an alert and contains the page title, so a bare
    // getByRole("alert") returns "Sign In — Repair" and asserts nothing about the
    // form's error.
    const formAlert = page.locator("form").getByRole("alert");
    const wrongPw = await visible(formAlert).innerText();
    expect(wrongPw).toMatch(/invalid email or password/i);

    // ---- unknown account gets the IDENTICAL message ------------------------
    // Anti-enumeration, asserted where the customer actually sees it: a different
    // message for "no such account" would let anyone test which emails exist.
    await page.getByLabel("Email Address").fill(`nobody-${stamp}@test.local`);
    await page.getByLabel("Password", { exact: true }).fill("NotThePassword1!");
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    const unknown = await visible(formAlert).innerText();
    expect(unknown.trim()).toBe(wrongPw.trim());

    // ---- correct password gets in, and honours ?next= -----------------------
    await page.getByLabel("Email Address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await page.waitForURL("**/account**", { timeout: 30_000 });
  });

  test("forgot password reaches the inbox state, and a broken link fails clearly", async ({ page }) => {
    await page.goto("/email-sent");
    await page.getByLabel("Email Address").fill("e2e-shopper@test.local");
    await page.getByRole("button", { name: /Send|Reset|Continue/i }).first().click();
    await expect(visible(page.getByText(/Check Your Inbox/i))).toBeVisible({ timeout: 20_000 });

    // A tampered or expired link must say so rather than rendering a form that
    // cannot work — this is the state a customer reaches by clicking an old email.
    // Field labels here are "New Password" / "Confirm New Password" — NOT the
    // sign-up form's "Password" / "Confirm Password".
    await page.goto("/reset-password?token=definitely-not-a-real-token");
    await page.getByLabel("New Password", { exact: true }).fill("BrandNewPass1!");
    await page.getByLabel("Confirm New Password").fill("BrandNewPass1!");
    await visible(page.getByRole("button", { name: /Reset|Update|Save|Continue/i })).click();

    const alert = visible(page.locator("form").getByRole("alert"));
    await expect(alert).toBeVisible({ timeout: 20_000 });
    // It must say the LINK is the problem — not imply the password was wrong,
    // and not silently do nothing.
    await expect(alert).toContainText(/link|token|expired|invalid/i);
  });
});

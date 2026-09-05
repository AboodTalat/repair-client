// One-time authentication for the e2e suite.
//
// WHY THIS EXISTS: `myAppLogin` and `myAppSignUp` are in the backend's
// SENSITIVE_OPS set, rate-limited to 5 requests/min per IP|operation
// (Server/index.ts) — a deliberate anti-credential-stuffing control. A suite
// that logs in inside every test blows straight through it: three browser
// projects × several tests is 6+ logins a minute from one IP, and the throttled
// ones fail as a login that simply never navigates. That reads like a broken
// app, not a throttle, and it is intermittent — the worst kind of flake.
//
// So: log in ONCE, save the storage state, and let every test reuse it. This is
// the standard Playwright pattern and it happens to be exactly what the limiter
// wants. Do NOT "fix" future auth flakiness by weakening the limiter — it is a
// real security control and the tests should live within it, as real users do.
//
// Auth lives in AES-encrypted localStorage (Zustand persist), which storageState
// captures and restores like any other origin data.
import { test as setup, expect } from "@playwright/test";
import { login, STORAGE_STATE, isStorageStateFresh } from "./helpers";

setup("authenticate as the seeded shopper", async ({ page }) => {
  // Reuse a still-fresh session rather than logging in on every run. Access
  // tokens live 30 minutes; anything saved in the last 20 is good. This matters
  // because the suite now performs TWO privileged logins per run (this shopper
  // plus the admin the out-of-stock spec needs), and the limiter allows five a
  // minute — so three quick iterations while developing would throttle the
  // fourth and surface as a login that mysteriously never navigates.
  // Plain return, NOT setup.skip(): Playwright treats a skipped setup test as an
  // unmet dependency and skips every project that depends on it, so the whole
  // suite silently reported "1 skipped" and ran nothing. Returning passes the
  // setup and lets the dependents run against the state already on disk.
  if (isStorageStateFresh()) return;
  await login(page);
  await expect(page).toHaveURL(/\/shop/);
  await page.context().storageState({ path: STORAGE_STATE });
});

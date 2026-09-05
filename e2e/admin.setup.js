// One-time admin authentication, mirroring auth.setup.js.
//
// Two specs drive the admin console. Signing in inside each spends two of the
// five myAppLogin calls this IP gets per minute — and combined with the shopper
// setup and the auth-lifecycle spec, a full run was tipping over the limit and
// failing with "login never navigated". Log in once, reuse the session.
import { test as setup } from "@playwright/test";
import { loginAdmin, ADMIN_STORAGE_STATE, isAdminStorageFresh } from "./helpers";

setup("authenticate as the seeded admin", async ({ page }) => {
  // Plain return, not setup.skip() — a skipped setup marks the dependency unmet
  // and Playwright then skips every project that depends on it.
  if (isAdminStorageFresh()) return;
  await loginAdmin(page);
  await page.context().storageState({ path: ADMIN_STORAGE_STATE });
});

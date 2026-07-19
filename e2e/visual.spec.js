// Visual-regression baselines for the key storefront surfaces at desktop +
// mobile viewports.
//
// FIRST RUN: `npx playwright test visual --update-snapshots` creates the
// baselines under e2e/__screenshots__/ (toHaveScreenshot reports the first
// run as a "failure" while it writes them — that's expected). Commit the
// baselines, then subsequent runs compare against them.
//
// These use anonymous (logged-out) surfaces so the snapshots are deterministic
// within a seed. Don't re-seed the catalog between creating and comparing
// baselines — the factory appends random suffixes to category names.

import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
];

const PAGES = [
  { name: "home", path: "/" },
  { name: "shop", path: "/shop" },
  { name: "product", path: "/products/1" },
  { name: "cart", path: "/cart" },
];

for (const vp of VIEWPORTS) {
  test.describe(`visual @ ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const p of PAGES) {
      test(`${p.name}`, async ({ page }) => {
        await page.goto(p.path);
        // Give web fonts / images a beat. Not "networkidle" — the Next dev HMR
        // websocket keeps the network active so it would never settle. The
        // landing splash overlay locks for ~3s then fades ~700ms, so wait past
        // it (4.5s) for a stable capture; other pages just get extra settle.
        await page.waitForLoadState("domcontentloaded").catch(() => {});
        await page.waitForTimeout(p.path === "/" ? 4500 : 1500);
        await expect(page).toHaveScreenshot(`${p.name}-${vp.name}.png`, {
          fullPage: true,
          animations: "disabled",
        });
      });
    }
  });
}

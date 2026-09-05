// Shared Playwright fixtures for the storefront e2e suite.
//
// Import `test` and `expect` from HERE, not from "@playwright/test", so every
// spec gets the hydration guard below for free.
//
// WHY A HYDRATION GUARD: a "Hydration failed because the server rendered HTML
// didn't match the client" error was observed once during a full run and then
// could not be reproduced — zero occurrences across a later full cross-browser
// sweep and a route-by-route scan. That is the worst state for a defect to sit
// in: real enough to have happened, rare enough to be dismissed, and invisible
// because React RECOVERS from it (the tree is regenerated on the client), so
// nothing fails and no assertion notices.
//
// A hydration mismatch is never benign — it means the server and the client
// disagreed about what to render, which shows up for users as content flashing
// or changing after load, lost input, or state that silently resets. Rather than
// leave it as a note nobody will act on, every test now fails if one occurs, so
// the next occurrence arrives with a route, a browser and a stack attached
// instead of a memory.
//
// If this ever fires: the usual causes on this app are rendering something
// time-dependent (`new Date()`, a countdown) or storage-dependent
// (localStorage / the Zustand store) during the FIRST render rather than after
// mount. CategoryDiscountBanner documents the correct pattern.
import { test as base, expect } from "@playwright/test";

const HYDRATION_RE = /hydrat|server rendered HTML didn't match|did not match/i;

export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    const hydrationErrors = [];

    const record = (text) => {
      if (HYDRATION_RE.test(text)) hydrationErrors.push(text);
    };
    page.on("console", (m) => {
      if (m.type() === "error") record(m.text());
    });
    page.on("pageerror", (e) => record(String(e?.message ?? e)));

    await use(page);

    // Don't pile a hydration complaint on top of a test that already failed for
    // its own reason — the original failure is the more useful signal.
    if (hydrationErrors.length && testInfo.status === testInfo.expectedStatus) {
      const detail = hydrationErrors
        .map((e) => e.split("\n")[0].slice(0, 300))
        .join("\n  - ");
      throw new Error(
        `Hydration mismatch detected on this page (${hydrationErrors.length}):\n  - ${detail}\n\n` +
          `SSR and the client disagreed about the markup. React recovers, so nothing else fails — ` +
          `which is exactly why this is asserted. See e2e/fixtures.js.`
      );
    }
  },
});

export { expect };

import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const STORAGE_STATE = path.join(process.cwd(), "e2e/.auth/shopper.json");

// Playwright config for the repair storefront e2e / a11y / visual suite.
//
// The dev server is auto-started on PORT 3100 with BOTH GraphQL endpoint envs
// pointed at the running TEST backend (repair_test schema) on :5001 — the
// server components read REPAIR_API_URL, client components read
// NEXT_PUBLIC_REPAIR_GRAPHQL_URL, so both must be set or /shop renders empty.
//
// Specs live under e2e/ ONLY (Vitest owns src/**), so the two runners never
// collide.

// PORT: 3101, deliberately NOT 3000/3001.
//
// The previous note here said :3001 was required because "the TEST backend's
// CORS allowlist only permits http://localhost:3000 and :3001". That is stale —
// Server/index.ts `isDevOrigin` accepts ANY localhost / 127.0.0.1 / private-LAN
// origin on ANY port whenever NODE_ENV is not production, precisely so Next's
// auto-incrementing dev port doesn't break local work. Verified in source
// (index.ts:112-131). So the port is free to choose.
//
// It is chosen AWAY from 3000/3001 because `reuseExistingServer: true` cannot
// tell one app from another — it only checks that the URL responds. Both of
// those ports were found occupied by unrelated projects on this machine, so a
// run would have driven a completely different site while reporting normally.
// A distinctive port makes that collision unlikely; if you ever see e2e failures
// that look like the wrong app, check what is actually on this port first.
const PORT = 3101;
const BASE_URL = `http://localhost:${PORT}`;
const TEST_GRAPHQL = "http://localhost:5001/repair/graphql";

export default defineConfig({
  testDir: "./e2e",
  // Visual snapshots + a shared dev server → run serially for stability.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  // Generous per-test timeout: the funnel is heavy (login + browse + add + 3
  // checkout steps + gateway) and dev-mode Firefox/WebKit on a slow filesystem
  // runs well past 60s end-to-end.
  timeout: 150_000,
  expect: {
    timeout: 10_000,
    // Storefront has web fonts + images; allow a small pixel diff so visual
    // baselines aren't brittle across minor anti-aliasing differences.
    toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: "disabled" },
  },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    // Logs in ONCE and saves the session. Every browser project depends on it and
    // starts already authenticated — see e2e/auth.setup.js for why this is not
    // just a speed optimisation: myAppLogin is rate-limited to 5/min per IP, and
    // logging in per test throttles the suite into intermittent failure.
    { name: "setup", testMatch: /.*\.setup\.js/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: STORAGE_STATE },
      dependencies: ["setup"],
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"], storageState: STORAGE_STATE },
      dependencies: ["setup"],
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"], storageState: STORAGE_STATE },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    // Own dist dir (see next.config.mjs): Next keeps its dev-server lock inside
    // it and refuses a second dev server for the same project dir, so without
    // this the suite cannot start while an ordinary `npm run dev` is running.
    command: "NEXT_DIST_DIR=.next-e2e npm run dev",
    url: BASE_URL,
    reuseExistingServer: true,
    // Next dev first-compile is slow on this filesystem — give it a wide window.
    // (Pre-starting the dev server on 3100 makes Playwright reuse it instantly.)
    timeout: 300_000,
    env: {
      NEXT_DIST_DIR: ".next-e2e",
      // ALWAYS-LIVE storefront reads. The storefront caches product/catalog
      // reads for 60s by default (shopCatalog.js STOREFRONT_REVALIDATE) and busts
      // that cache from the admin UI's server action. A test that changes catalog
      // state through the resolvers — e.g. emptying a variant to reach the
      // "Notify When Available" path — never triggers that bust, so the page it
      // then loads can still show the OLD stock.
      //
      // The failure is intermittent and depends on cache WARMTH, which makes it
      // maximally confusing: the spec passed against a freshly started dev server
      // (cold cache) and failed minutes later against a warm one, with no code
      // change in between. 0 = no caching, so a spec always sees what it just did.
      NEXT_PUBLIC_STOREFRONT_REVALIDATE: "0",
      PORT: String(PORT),
      NEXT_PUBLIC_REPAIR_GRAPHQL_URL: TEST_GRAPHQL,
      REPAIR_API_URL: TEST_GRAPHQL,
    },
  },
});

import { defineConfig, devices } from "@playwright/test";

// Playwright config for the repair storefront e2e / a11y / visual suite.
//
// The dev server is auto-started on PORT 3100 with BOTH GraphQL endpoint envs
// pointed at the running TEST backend (repair_test schema) on :5001 — the
// server components read REPAIR_API_URL, client components read
// NEXT_PUBLIC_REPAIR_GRAPHQL_URL, so both must be set or /shop renders empty.
//
// Specs live under e2e/ ONLY (Vitest owns src/**), so the two runners never
// collide.

// NOTE: 3001, not 3100. The running TEST backend's CORS allowlist only permits
// http://localhost:3000 and :3001 as browser origins — client-side GraphQL
// calls (login, cart, checkout) from :3100 are rejected (500, no ACAO header),
// which breaks the funnel. :3001 is an allowlisted origin and avoids colliding
// with the Server dev default (:3000).
const PORT = 3001;
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
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: true,
    // Next dev first-compile is slow on this filesystem — give it a wide window.
    // (Pre-starting the dev server on 3100 makes Playwright reuse it instantly.)
    timeout: 300_000,
    env: {
      PORT: String(PORT),
      NEXT_PUBLIC_REPAIR_GRAPHQL_URL: TEST_GRAPHQL,
      REPAIR_API_URL: TEST_GRAPHQL,
    },
  },
});

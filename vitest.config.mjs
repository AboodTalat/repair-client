import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Test runner for the repair frontend.
//
// ENVIRONMENT: jsdom for every file. This used to be `node` with
// useRepairStore.test.js opting into jsdom via a `// @vitest-environment jsdom`
// docblock — but Vitest 4 REMOVED per-file environment docblocks (the directive
// string appears nowhere in vitest's dist), so that file silently ran in `node`
// and its 18 tests failed on a missing `localStorage`. jsdom is now the default
// rather than a per-file opt-in so a new test file cannot land in the wrong
// environment by omission. The cost is a few hundred ms on the pure money-math
// suites, which is not worth managing globs over. If per-file environments are
// ever needed again, Vitest 4's replacement is `test.projects`, not a docblock.
//
// setupFiles installs a working localStorage/sessionStorage — see
// vitest.setup.mjs for why jsdom alone doesn't provide one on Node 26.
//
// The `@` alias mirrors jsconfig.json so tests can import `@/lib/*`.
// e2e/ is deliberately outside `include` — Playwright owns that directory.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.mjs"],
    include: ["src/**/*.test.js"],
  },
});

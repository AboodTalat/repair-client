import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Test runner for the repair frontend. cartTotals.test.js is pure money-math
// (node environment); useRepairStore.test.js opts into jsdom per-file via a
// `// @vitest-environment jsdom` docblock (it needs localStorage + window).
// The `@` alias mirrors jsconfig.json so store tests can import `@/lib/*`.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.js"],
  },
});

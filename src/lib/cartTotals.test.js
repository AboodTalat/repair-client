import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { computeCartTotals } from "./cartTotals.js";

// ---------------------------------------------------------------------------
// Shared golden oracle. This JSON lives in the SERVER tree and is the single
// source of truth shared with the backend parity test — do NOT copy it into
// repair/. Read it directly off disk (an import would try to resolve outside
// the Vite project root).
// ---------------------------------------------------------------------------
const __dirname = dirname(fileURLToPath(import.meta.url));
const GOLDEN_PATH = resolve(
  __dirname,
  "../../../Server/test/fixtures/cartTotals.golden.json"
);
const golden = JSON.parse(readFileSync(GOLDEN_PATH, "utf8"));

const TOL = 0.001; // golden parity tolerance (values are all 2dp)

// Call the function the way the golden vectors describe: subtotalOverride is
// left undefined so the function derives the subtotal from items itself.
function runVector(input) {
  return computeCartTotals(
    input.items,
    input.settings,
    undefined,
    input.promoDiscount,
    input.shippingMethodKey,
    input.welcomeDiscountEligible
  );
}

describe("computeCartTotals — golden parity (shared oracle)", () => {
  const fields = golden._expectedFields;

  it("fixture is well-formed", () => {
    expect(Array.isArray(golden.vectors)).toBe(true);
    expect(golden.vectors.length).toBeGreaterThan(0);
    expect(Array.isArray(fields)).toBe(true);
    expect(fields.length).toBe(7);
  });

  for (const vector of golden.vectors) {
    it(`vector: ${vector.name}`, () => {
      const actual = runVector(vector.input);
      for (const field of fields) {
        expect(
          Math.abs(actual[field] - vector.expected[field]),
          `field "${field}": expected ${vector.expected[field]}, got ${actual[field]}`
        ).toBeLessThanOrEqual(TOL);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Property tests — invariants that MUST hold for every possible input.
// ---------------------------------------------------------------------------
const PROP_RUNS = 500;
const PROP_TOL = 0.011; // absolute tolerance for the two derived-total checks

// 2-decimal-place money in [min, max]. fc.integer over the cent range then /100
// so we never feed the function a float with >2dp (matching how prices arrive).
const money2dp = (min, max) =>
  fc.integer({ min: Math.round(min * 100), max: Math.round(max * 100) }).map((c) => c / 100);

const arbItem = fc.record({
  price: money2dp(0.5, 500),
  qty: fc.integer({ min: 1, max: 10 }),
});

const arbSettings = fc.record({
  shipping: fc.record({
    standard_delivery_fee: money2dp(0, 50),
    express_shipping_fee: money2dp(0, 50),
    free_delivery_enabled: fc.boolean(),
    free_delivery_threshold: money2dp(0, 500),
  }),
  tax: fc.record({
    rate: money2dp(0, 25),
    inclusive: fc.boolean(),
  }),
});

const arbInput = fc.record({
  items: fc.array(arbItem, { minLength: 1, maxLength: 8 }),
  settings: arbSettings,
  promoDiscount: money2dp(0, 600),
  shippingMethodKey: fc.constantFrom("standard", "express", "pickup"),
  welcomeDiscountEligible: fc.boolean(),
});

describe("computeCartTotals — property invariants", () => {
  it("all money outputs are non-negative", () => {
    fc.assert(
      fc.property(arbInput, (input) => {
        const t = runVector(input);
        expect(t.subtotal).toBeGreaterThanOrEqual(0);
        expect(t.discount).toBeGreaterThanOrEqual(0);
        expect(t.welcomeDiscount).toBeGreaterThanOrEqual(0);
        expect(t.tax).toBeGreaterThanOrEqual(0);
        expect(t.total).toBeGreaterThanOrEqual(0);
        expect(t.afterPromo).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: PROP_RUNS }
    );
  });

  it("discounts never exceed the subtotal", () => {
    fc.assert(
      fc.property(arbInput, (input) => {
        const t = runVector(input);
        expect(t.discount).toBeLessThanOrEqual(t.subtotal + PROP_TOL);
        expect(t.welcomeDiscount).toBeLessThanOrEqual(t.subtotal + PROP_TOL);
      }),
      { numRuns: PROP_RUNS }
    );
  });

  it("welcome discount and promo are mutually exclusive", () => {
    fc.assert(
      fc.property(arbInput, (input) => {
        const t = runVector(input);
        if (input.welcomeDiscountEligible) {
          expect(t.discount).toBe(0);
        }
      }),
      { numRuns: PROP_RUNS }
    );
  });

  it("afterPromo == max(0, subtotal - discount - welcomeDiscount)", () => {
    fc.assert(
      fc.property(arbInput, (input) => {
        const t = runVector(input);
        const expected = Math.max(0, t.subtotal - t.discount - t.welcomeDiscount);
        expect(Math.abs(t.afterPromo - expected)).toBeLessThanOrEqual(PROP_TOL);
      }),
      { numRuns: PROP_RUNS }
    );
  });

  it("total == afterPromo + shipping + tax", () => {
    fc.assert(
      fc.property(arbInput, (input) => {
        const t = runVector(input);
        const expected = t.afterPromo + t.shipping + t.tax;
        expect(Math.abs(t.total - expected)).toBeLessThanOrEqual(PROP_TOL);
      }),
      { numRuns: PROP_RUNS }
    );
  });
});

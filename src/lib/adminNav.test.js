// Unit tests for the admin destination matcher behind the TopBar global search.
//
// This is the only executable proof the search works: the dropdown itself sits
// behind the admin login, so the ranking rules below can't be verified by
// clicking. Each case is a real thing an admin would type.
import { describe, it, expect } from "vitest";
import { ADMIN_DESTINATIONS, searchDestinations } from "./adminNav.js";

const labels = (term) => searchDestinations(term).map((d) => d.label);
const first = (term) => searchDestinations(term)[0];

describe("ADMIN_DESTINATIONS", () => {
  it("includes every sidebar page plus the settings cards", () => {
    // 16 console pages + 8 settings cards.
    expect(ADMIN_DESTINATIONS.length).toBe(24);
    for (const d of ADMIN_DESTINATIONS) {
      expect(d.href.startsWith("/r3pr-console/")).toBe(true);
      expect(d.label.length).toBeGreaterThan(0);
      expect(d.section.length).toBeGreaterThan(0);
    }
  });

  it("indexes only the admin console — not the accountant or delivery shells", () => {
    for (const d of ADMIN_DESTINATIONS) {
      expect(d.href).not.toContain("/r3pr-ledger");
      expect(d.href).not.toContain("/r3pr-dispatch");
    }
  });
});

describe("searchDestinations — settings cards", () => {
  it("'tax' resolves to the Tax Rate card, not a page that merely mentions tax", () => {
    expect(first("tax").label).toBe("Tax Rate");
    expect(first("tax").href).toBe("/r3pr-console/settings");
  });

  it("finds tax by synonym", () => {
    expect(labels("vat")).toContain("Tax Rate");
    expect(labels("gst")).toContain("Tax Rate");
  });

  it("'pickup' reaches Pickup Locations", () => {
    expect(labels("pickup")).toContain("Pickup Locations");
  });

  it("'cod' and 'cash on delivery' reach Payment Methods", () => {
    expect(labels("cod")).toContain("Payment Methods");
    expect(labels("cash on delivery")).toContain("Payment Methods");
  });

  it("'express' reaches Express Shipping", () => {
    expect(labels("express")).toContain("Express Shipping");
  });

  it("'low stock' reaches the Low-Stock Banner card", () => {
    expect(labels("low stock")).toContain("Low-Stock Banner");
  });
});

describe("searchDestinations — pages", () => {
  it("'customers' reaches Users & Roles even though the label says Users", () => {
    expect(labels("customers")).toContain("Users & Roles");
  });

  it("'fabric' reaches Materials", () => {
    expect(labels("fabric")).toContain("Materials");
  });

  it("'cms' and 'landing' reach Storefront Content", () => {
    expect(labels("cms")).toContain("Storefront Content");
    expect(labels("landing")).toContain("Storefront Content");
  });

  it("'coupon' reaches Promo Codes", () => {
    expect(labels("coupon")).toContain("Promo Codes");
  });

  it("matches a section name", () => {
    expect(labels("catalog").length).toBeGreaterThan(0);
  });
});

describe("searchDestinations — ranking and bounds", () => {
  it("ranks an exact label match first", () => {
    expect(first("orders").label).toBe("Orders");
    expect(first("products").label).toBe("Products");
  });

  it("ranks a label prefix above a keyword-only hit", () => {
    // "Discounts" starts with "disc"; Promo Codes only matches via keywords.
    expect(first("disc").label).toBe("Discounts");
  });

  it("returns nothing for a blank or unmatched term", () => {
    expect(searchDestinations("")).toEqual([]);
    expect(searchDestinations("   ")).toEqual([]);
    expect(searchDestinations("zzzzzzzz")).toEqual([]);
  });

  it("is case-insensitive and ignores surrounding whitespace", () => {
    expect(first("  TAX  ").label).toBe("Tax Rate");
  });

  it("caps the result list so the dropdown can't be flooded", () => {
    // "s" appears in most labels/keywords.
    expect(searchDestinations("s").length).toBeLessThanOrEqual(6);
  });
});

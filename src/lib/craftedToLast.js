// "Crafted to Last" product-page stats — shared, dependency-free.
//
// The product page section is admin-editable (percentages + labels). This
// module holds the canonical default (the three rows the page shipped with)
// plus a normalizer. It deliberately imports nothing server-only so BOTH the
// server-read shaper (`shopCatalog.js`) and the admin drawer client component
// (`ProductManager.jsx`) can import it without pulling server code into the
// client bundle.
//
// Keep DEFAULT_CRAFTED_TO_LAST identical to the server copy in
// Server/servers/repair/src/graphql/resolvers/catalog.ts.

export const DEFAULT_CRAFTED_TO_LAST = [
  { pct: 78, label: "Recycled Polyester" },
  { pct: 22, label: "Premium Elastane" },
  { pct: 100, label: "Performance Guaranteed" },
];

// Coerce arbitrary input into clean [{ pct: 0-100 int, label: string }] rows,
// dropping incomplete ones. Returns [] when nothing usable — callers decide
// whether to fall back to DEFAULT_CRAFTED_TO_LAST.
export function normalizeCraftedToLast(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((r) => ({
      pct: Math.max(0, Math.min(100, Math.round(Number(r?.pct)))),
      label: typeof r?.label === "string" ? r.label.trim() : "",
    }))
    .filter((r) => Number.isFinite(r.pct) && r.label.length > 0);
}

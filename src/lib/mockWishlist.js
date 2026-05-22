// Mock data for the customer-facing /account/wishlist page (no backend wiring yet).
// Replace with `repairQuery("myAppListMyWishlist", ...)` once the customer-scoped
// wishlist list resolver lands on `cart.ts` (toggle/clear are already there).
//
// The Figma frames (mobile 41:1613 + desktop 119:4743) show 4 items so we ship 4.
// Each item carries: product display info + the swatch palette to render on the
// card. When wiring to the backend, swap to whatever the resolver returns — the
// shape below is intentionally close to mockOrders / mockShop product shapes so
// the card components don't need to change.

export const WISHLIST = [
  {
    id: "wl-1",
    productSlug: "essential-hoodie",
    productName: "Essential Hoodie",
    subtitle: "Fleece Lined",
    price: 55,
    currency: "JOD",
    image: "/shop/model-1.png",
    colors: ["#9ca3af", "#11191f", "#78350f"],
    type: "Hoodies",
  },
  {
    id: "wl-2",
    productSlug: "sweat-pants",
    productName: "Sweat Pants",
    subtitle: "Cotton",
    price: 30,
    currency: "JOD",
    image: "/shop/model-2.png",
    colors: ["#ede9dd", "#232323", "#12013f", "#3e0000"],
    type: "Joggers",
  },
  {
    id: "wl-3",
    productSlug: "training-shorts",
    productName: "Training Shorts",
    subtitle: "Performance Mesh",
    price: 25,
    currency: "JOD",
    image: "/shop/model-3.png",
    colors: ["#11191f", "#1e3a8a", "#9ca3af"],
    type: "Joggers",
  },
  {
    id: "wl-4",
    productSlug: "core-tee",
    productName: "Core Tee",
    subtitle: "Organic Cotton",
    price: 28,
    currency: "JOD",
    image: "/shop/model-4.png",
    colors: ["#ffffff", "#11191f", "#9aac9b"],
    type: "T-Shirts",
  },
];

// TYPE filter — multi-select chips. Mirrors `FILTER_OPTIONS.types` from
// mockShop.js so the wishlist filter stays in sync with the shop. Each entry
// has the label (display) + the value that matches `item.type` for filtering.
export const WISHLIST_TYPE_OPTIONS = [
  { slug: "Leggins",   label: "Leggings" },
  { slug: "T-Shirts",  label: "T-Shirts" },
  { slug: "Joggers",   label: "Joggers" },
  { slug: "Hoodies",   label: "Hoodies" },
  { slug: "Sport Bras", label: "Sport Bras" },
];

// PRICE filter — single-select preset ranges. `max = null` means "no upper bound";
// `min = null` means "no lower bound". `slug = "all"` is the default — equivalent
// to no price filter at all.
export const WISHLIST_PRICE_RANGES = [
  { slug: "all",     label: "All prices",        min: null, max: null },
  { slug: "under30", label: "Under JOD 30",      min: null, max: 30 },
  { slug: "30to50",  label: "JOD 30 – 50",  min: 30,   max: 50 },
  { slug: "over50",  label: "Over JOD 50",       min: 50,   max: null },
];

function inPriceRange(price, range) {
  if (!range || range.slug === "all") return true;
  if (range.min != null && price < range.min) return false;
  if (range.max != null && price > range.max) return false;
  return true;
}

// Apply filter axes to the in-process WISHLIST array.
//   filters.types    : array of type SLUGS (see WISHLIST_TYPE_OPTIONS)
//   filters.priceRange: range slug (see WISHLIST_PRICE_RANGES); "all"/missing => no filter
export function filterWishlist(items, filters) {
  const types = Array.isArray(filters?.types) ? filters.types : [];
  const range = WISHLIST_PRICE_RANGES.find((r) => r.slug === filters?.priceRange);
  const typeSet = types.length > 0 ? new Set(types) : null;

  return items.filter((it) => {
    if (typeSet && !typeSet.has(it.type)) return false;
    if (!inPriceRange(it.price, range)) return false;
    return true;
  });
}

// Active filter count — each selected type chip + 1 if a non-"all" price range
// is selected. Powers the "Filter (N)" badge on the page header.
export function ACTIVE_WISHLIST_FILTER_COUNT(filters) {
  let n = 0;
  if (Array.isArray(filters?.types)) n += filters.types.length;
  if (filters?.priceRange && filters.priceRange !== "all") n += 1;
  return n;
}

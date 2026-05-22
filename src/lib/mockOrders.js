// Mock data for the customer-facing /account/orders page (no backend wiring yet).
// Replace with `repairQuery("myAppListMyOrders", ...)` once the customer-order
// list resolver lands on the server (orders.ts already has admin/detail reads —
// the user-scoped list is the missing piece).
//
// Status values match the order-status state machine on the server
// (catalog.ts / orders.ts -> ORDER_STATUSES): pending | processing | dispatched
// | delivered | cancelled | returned. The UI collapses pending+processing+
// dispatched into "On the way" for the badge AND the filter (one chip filters
// all three in-transit states), but keeps the raw status so a detail page can
// still show the full step pipeline.

export const ORDERS = [
  {
    id: "ord-1001",
    purchaseDate: "21st March 2026",
    purchasedAt: "2026-03-21",
    productSlug: "sweat-pants",
    productName: "Sweat Pants",
    subtitle: "Cotton",
    variant: "Midnight Black / Medium",
    price: 30,
    currency: "JOD",
    image: "/shop/model-1.png",
    status: "delivered",
  },
  {
    id: "ord-1002",
    purchaseDate: "15th Feb 2026",
    purchasedAt: "2026-02-15",
    productSlug: "training-shorts",
    productName: "Training Shorts",
    subtitle: "Performance Mesh",
    variant: "Navy Blue / Large",
    price: 25,
    currency: "JOD",
    image: "/shop/model-2.png",
    status: "delivered",
  },
  {
    id: "ord-1003",
    purchaseDate: "2nd Jan 2026",
    purchasedAt: "2026-01-02",
    productSlug: "essential-hoodie",
    productName: "Essential Hoodie",
    subtitle: "Fleece Lined",
    variant: "Heather Grey / Medium",
    price: 55,
    currency: "JOD",
    image: "/shop/model-3.png",
    status: "delivered",
  },
  {
    id: "ord-1004",
    purchaseDate: "Today",
    purchasedAt: "2026-05-20",
    productSlug: "performance-tank",
    productName: "Performance Tank",
    subtitle: "Dry Fit",
    variant: "White / Small",
    price: 25,
    currency: "JOD",
    image: "/shop/model-4.png",
    status: "dispatched",
  },
  {
    id: "ord-1005",
    purchaseDate: "10th Dec 2025",
    purchasedAt: "2025-12-10",
    productSlug: "graphic-tee",
    productName: "Graphic Tee",
    subtitle: "Organic Cotton",
    variant: "Black / Large",
    price: 28,
    currency: "JOD",
    image: "/shop/model-5.png",
    status: "delivered",
  },
  {
    id: "ord-1006",
    purchaseDate: "25th Nov 2025",
    purchasedAt: "2025-11-25",
    productSlug: "core-tee",
    productName: "Core Tee",
    subtitle: "Everyday Essential",
    variant: "Charcoal / Medium",
    price: 30,
    currency: "JOD",
    image: "/shop/model-1.png",
    status: "delivered",
  },
];

// Maps the raw server status to the badge tone the UI shows. The three
// in-transit states collapse to "On the way" so the card stays scannable;
// a detail screen can show the full pipeline.
export function badgeFor(status) {
  switch (status) {
    case "delivered":
      return { kind: "delivered", label: "Delivered" };
    case "pending":
    case "processing":
    case "dispatched":
      return { kind: "on-the-way", label: "On the way" };
    case "cancelled":
      return { kind: "cancelled", label: "Cancelled" };
    case "returned":
      return { kind: "returned", label: "Returned" };
    default:
      return { kind: "on-the-way", label: "On the way" };
  }
}

// Filter axes — keep these stable; URL params reference these slugs.
//
// Status filter slugs collapse the in-transit bucket (one "on-the-way" chip
// covers pending+processing+dispatched). `rawStatuses` is the list of raw
// status values the chip matches.
export const ORDER_STATUS_OPTIONS = [
  { slug: "delivered", label: "Delivered", rawStatuses: ["delivered"] },
  {
    slug: "on-the-way",
    label: "On the way",
    rawStatuses: ["pending", "processing", "dispatched"],
  },
  { slug: "cancelled", label: "Cancelled", rawStatuses: ["cancelled"] },
  { slug: "returned", label: "Returned", rawStatuses: ["returned"] },
];

// Date range filter (single-select). `days = null` means "no upper bound".
// `slug = "all"` is the default — equivalent to no date filter at all.
export const ORDER_DATE_RANGES = [
  { slug: "all", label: "All time", days: null },
  { slug: "30d", label: "Last 30 days", days: 30 },
  { slug: "6m", label: "Last 6 months", days: 183 },
  { slug: "year", label: "This year", days: null, sameCalendarYear: true },
];

// Resolve the "as-of" reference date. Pinned to today's date so the mock
// rows ("Today" = 2026-05-20) sort sensibly without timezone surprises.
// When wiring to the backend, pass `new Date()` or drop the second arg.
function referenceDate(now = new Date()) {
  return now;
}

function inRange(purchasedAt, range, now) {
  if (!range || range.slug === "all") return true;
  const t = new Date(purchasedAt);
  if (Number.isNaN(t.getTime())) return true;
  if (range.sameCalendarYear) {
    return t.getFullYear() === now.getFullYear();
  }
  if (range.days != null) {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - range.days);
    return t >= cutoff;
  }
  return true;
}

// Apply filter axes to the in-process ORDERS array.
//   filters.statuses : array of status SLUGS (see ORDER_STATUS_OPTIONS)
//   filters.dateRange: range slug (see ORDER_DATE_RANGES); "all" or missing => no date filter
export function filterOrders(orders, filters) {
  const now = referenceDate();
  const statuses = Array.isArray(filters?.statuses) ? filters.statuses : [];
  const range = ORDER_DATE_RANGES.find((r) => r.slug === filters?.dateRange);

  // Pre-compute the set of raw statuses any selected chip matches.
  let rawStatusSet = null;
  if (statuses.length > 0) {
    rawStatusSet = new Set();
    for (const slug of statuses) {
      const opt = ORDER_STATUS_OPTIONS.find((o) => o.slug === slug);
      if (!opt) continue;
      for (const raw of opt.rawStatuses) rawStatusSet.add(raw);
    }
  }

  return orders.filter((o) => {
    if (rawStatusSet && !rawStatusSet.has(o.status)) return false;
    if (!inRange(o.purchasedAt, range, now)) return false;
    return true;
  });
}

// Active filter count — counts each selected status chip + 1 if a non-"all"
// date range is selected. Used for the "Filter (N)" badge on the page header.
export function ACTIVE_ORDER_FILTER_COUNT(filters) {
  let n = 0;
  if (Array.isArray(filters?.statuses)) n += filters.statuses.length;
  if (filters?.dateRange && filters.dateRange !== "all") n += 1;
  return n;
}

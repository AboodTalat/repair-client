// Mock data for the customer-facing /account/orders page (no backend wiring yet).
// Replace with `repairQuery("myAppListMyOrders", ...)` once the customer-order
// list resolver lands on the server (orders.ts already has admin/detail reads —
// the user-scoped list is the missing piece).
//
// Status values mirror the admin order-status state machine:
//   processing → prepared → handed_to_delivery → delivered
//   (plus terminal: cancelled, returned)
// The card-level badge collapses processing/prepared/handed_to_delivery into
// "On the way" so the order grid stays scannable. The detail page (#13) shows
// the full 4-step pipeline + history timeline.

// Helper: build a history array for a given current status. Times are
// fictitious but ordered so the timeline reads cleanly.
function makeHistory(currentStatus, baseDate) {
  const order = ["processing", "prepared", "handed_to_delivery", "delivered"];
  const idx = order.indexOf(currentStatus);
  if (idx < 0) {
    // cancelled / returned — show entry + terminal transition
    return [
      { at: `${baseDate} 09:00`, to: "processing", note: "Order placed" },
      { at: `${baseDate} 11:30`, to: currentStatus, note: currentStatus === "cancelled" ? "Cancelled by customer" : "Returned" },
    ];
  }
  const notes = {
    processing:         "Order placed — being prepared",
    prepared:           "Packed and waiting for courier",
    handed_to_delivery: "Out for delivery",
    delivered:          "Delivered",
  };
  const times = ["09:00", "12:14", "15:42", "17:30"];
  return order.slice(0, idx + 1).map((s, i) => ({
    at: `${baseDate} ${times[i]}`,
    to: s,
    note: notes[s],
  }));
}

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
    history: makeHistory("delivered", "2026-03-21"),
    estimatedDelivery: "23rd March 2026",
    shippingAddress: "Rainbow St 42, Amman, Jordan",
    courier: "Aramex",
    trackingNumber: "AMX-918-2241-77",
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
    history: makeHistory("delivered", "2026-02-15"),
    estimatedDelivery: "17th Feb 2026",
    shippingAddress: "Khalda 17, Amman, Jordan",
    courier: "Aramex",
    trackingNumber: "AMX-118-0027-42",
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
    history: makeHistory("delivered", "2026-01-02"),
    estimatedDelivery: "5th Jan 2026",
    shippingAddress: "Abdoun 8, Amman, Jordan",
    courier: "Aramex",
    trackingNumber: "AMX-080-9923-15",
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
    status: "handed_to_delivery",
    history: makeHistory("handed_to_delivery", "2026-05-20"),
    estimatedDelivery: "22nd May 2026",
    shippingAddress: "Sweifieh 21, Amman, Jordan",
    courier: "Aramex",
    trackingNumber: "AMX-552-7711-09",
  },
  {
    id: "ord-1005",
    purchaseDate: "18th May 2026",
    purchasedAt: "2026-05-18",
    productSlug: "graphic-tee",
    productName: "Graphic Tee",
    subtitle: "Organic Cotton",
    variant: "Black / Large",
    price: 28,
    currency: "JOD",
    image: "/shop/model-5.png",
    status: "prepared",
    history: makeHistory("prepared", "2026-05-18"),
    estimatedDelivery: "22nd May 2026",
    shippingAddress: "Jabal Amman 14, Amman, Jordan",
    courier: "Aramex",
    trackingNumber: "AMX-660-1184-91",
  },
  {
    id: "ord-1006",
    purchaseDate: "19th May 2026",
    purchasedAt: "2026-05-19",
    productSlug: "core-tee",
    productName: "Core Tee",
    subtitle: "Everyday Essential",
    variant: "Charcoal / Medium",
    price: 30,
    currency: "JOD",
    image: "/shop/model-1.png",
    status: "processing",
    history: makeHistory("processing", "2026-05-19"),
    estimatedDelivery: "23rd May 2026",
    shippingAddress: "Tla’ Al-Ali 33, Amman, Jordan",
    courier: "—",
    trackingNumber: "—",
  },
];

// Maps the raw server status to the badge tone the UI shows. The three
// in-transit states collapse to "On the way" so the card stays scannable;
// the detail screen shows the full pipeline.
export function badgeFor(status) {
  switch (status) {
    case "delivered":
      return { kind: "delivered", label: "Delivered" };
    case "processing":
    case "prepared":
    case "handed_to_delivery":
    case "pending":           // legacy fallback
    case "dispatched":        // legacy fallback
      return { kind: "on-the-way", label: "On the way" };
    case "cancelled":
      return { kind: "cancelled", label: "Cancelled" };
    case "returned":
      return { kind: "returned", label: "Returned" };
    default:
      return { kind: "on-the-way", label: "On the way" };
  }
}

// (#13) Pipeline definition used by the customer Track Order detail page.
// The order of the keys is the order of the steps. Keys match the raw
// `status` field on each order, so progress can be derived by index.
export const TRACKING_PIPELINE = [
  { key: "processing",         label: "Processing",   description: "We received your order and are preparing it." },
  { key: "prepared",           label: "Prepared",     description: "Packed and waiting for the courier to collect." },
  { key: "handed_to_delivery", label: "With Delivery", description: "Out for delivery — heading your way." },
  { key: "delivered",          label: "Delivered",    description: "Your order has arrived." },
];

export function trackingProgress(status) {
  const idx = TRACKING_PIPELINE.findIndex((s) => s.key === status);
  if (idx >= 0) return { stepIndex: idx, terminal: null };
  if (status === "cancelled" || status === "returned") {
    return { stepIndex: -1, terminal: status };
  }
  // Legacy fallbacks.
  if (status === "pending") return { stepIndex: 0, terminal: null };
  if (status === "dispatched") return { stepIndex: 2, terminal: null };
  return { stepIndex: 0, terminal: null };
}

export function findOrder(id) {
  return ORDERS.find((o) => o.id === id) || null;
}

// Filter axes — keep these stable; URL params reference these slugs.
//
// Status filter slugs collapse the in-transit bucket (one "on-the-way" chip
// covers processing+prepared+handed_to_delivery). `rawStatuses` is the list
// of raw status values the chip matches.
export const ORDER_STATUS_OPTIONS = [
  { slug: "delivered", label: "Delivered", rawStatuses: ["delivered"] },
  {
    slug: "on-the-way",
    label: "On the way",
    rawStatuses: ["processing", "prepared", "handed_to_delivery", "pending", "dispatched"],
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

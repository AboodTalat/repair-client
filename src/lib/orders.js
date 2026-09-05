// Customer-facing order display helpers (status vocabulary, filter axes,
// tracking pipeline, server→card mapping).
//
// IMPORTANT: the backend `orders.status` enum (servers/repair/.../models/orders.ts)
// still has 8 raw values — pending, processing, dispatched, out_for_delivery,
// delivered, failed_delivery, cancelled, returned — but the CUSTOMER surface
// collapses them onto a 3-state happy path: Confirmed → Packed → Delivered.
// The mapping (used by badgeFor / trackingProgress / ORDER_STATUS_OPTIONS):
//   pending / processing / dispatched → "Confirmed"
//   out_for_delivery                  → "Packed"     (admin "With Delivery")
//   delivered                         → "Delivered"
// So the customer only sees "Packed" once the admin hands the order to
// delivery; the admin UI keeps its 4-step Processing → Prepared → With Delivery
// → Delivered pipeline (src/lib/adminOrders.js) at its own wire boundary.
// NOTE: the SLUGS ("processing"/"dispatched") + badge `kind`s are internal ids
// (filter URL state, badge-tone lookup) and stay unchanged — only the
// customer-facing LABELS were renamed (Processing→Confirmed, Dispatched→Packed).
// Terminal states (failed_delivery / cancelled / returned) keep their own
// badge/callout. Every enum value maps with no silent fall-through.

import { formatJOD } from "@/lib/mockCart";

const PLACEHOLDER_IMAGE = "/shop/model-1.png";

// ── Status badge buckets ──────────────────────────────────────────────────
// The customer-facing tracker has exactly 3 happy-path states —
// Confirmed → Packed → Delivered — so the badges collapse the 8 raw enum
// values onto that vocabulary:
//   • pending / processing / dispatched  → "Confirmed"   (admin "Prepared" is
//     still internal prep — the customer doesn't see a separate step for it)
//   • out_for_delivery                   → "Packed"      (admin "With Delivery"
//     — the order is now on its way with the courier)
//   • delivered                          → "Delivered"
// Terminal exceptions (failed_delivery / cancelled / returned) keep their own
// badge. The `default` is a NEUTRAL "Unknown" badge, never "On the way": a
// silent fall-through to "on the way" is exactly what made every order look
// in-transit, so an unexpected status now reads as unknown instead.
export function badgeFor(status, { isPickup = false } = {}) {
  // Store-pickup orders have no courier leg: "Prepared" (raw `dispatched`) is the
  // customer's "Ready for pickup" milestone, and "delivered" reads as "Picked up".
  if (isPickup) {
    switch (status) {
      case "pending":
      case "processing":
        return { kind: "processing", label: "Confirmed" };
      case "dispatched":
      case "out_for_delivery": // defensive — pickup orders never reach this raw state
        return { kind: "dispatched", label: "Ready for pickup" };
      case "delivered":
        return { kind: "delivered", label: "Picked up" };
      case "failed_delivery":
        return { kind: "failed", label: "Delivery failed" };
      case "cancelled":
        return { kind: "cancelled", label: "Cancelled" };
      case "returned":
        return { kind: "returned", label: "Returned" };
      default:
        return { kind: "unknown", label: "Unknown" };
    }
  }
  switch (status) {
    case "pending":
    case "processing":
    case "dispatched":
      return { kind: "processing", label: "Confirmed" };
    case "out_for_delivery":
      return { kind: "dispatched", label: "Packed" };
    case "delivered":
      return { kind: "delivered", label: "Delivered" };
    case "failed_delivery":
      return { kind: "failed", label: "Delivery failed" };
    case "cancelled":
      return { kind: "cancelled", label: "Cancelled" };
    case "returned":
      return { kind: "returned", label: "Returned" };
    default:
      return { kind: "unknown", label: "Unknown" };
  }
}

// Track Order CTA shows while the order is still in flight; hidden once the
// order has terminated (delivered / cancelled / returned / failed_delivery).
export function isInFlight(status) {
  return (
    status === "pending" ||
    status === "processing" ||
    status === "dispatched" ||
    status === "out_for_delivery"
  );
}

// ── Tracking pipeline (detail page) ─────────────────────────────────────────
// The customer tracker shows EXACTLY 3 steps. These are NOT 1:1 with the raw
// enum — the backend's `dispatched` ("Prepared" internally) folds into the
// "Processing" step, and the customer only advances to "Dispatched" once the
// admin hands the order to delivery (`out_for_delivery`). The step `key`s are
// display keys, so progress is resolved by `trackingProgress` (a switch), NOT
// by matching a raw status against the key.
export const TRACKING_PIPELINE = [
  { key: "processing", label: "Confirmed", description: "We received your order and are preparing it." },
  { key: "dispatched", label: "Packed", description: "Packed and handed to our delivery partner." },
  { key: "delivered", label: "Delivered", description: "Your order has arrived." },
];

// Store-pickup orders have no courier leg, so the middle step is "Ready for
// Pickup" (the customer collects in store) instead of "Dispatched".
export const PICKUP_TRACKING_PIPELINE = [
  { key: "processing", label: "Confirmed", description: "We received your order and are preparing it." },
  { key: "ready_pickup", label: "Ready for Pickup", description: "Your order is prepared — come collect it in store." },
  { key: "picked_up", label: "Picked Up", description: "You've collected your order. Enjoy!" },
];

// The 3-step pipeline for an order, by fulfilment type.
export function trackingPipeline(isPickup = false) {
  return isPickup ? PICKUP_TRACKING_PIPELINE : TRACKING_PIPELINE;
}

// Map a raw `orders.status` onto the 3-step tracker. The SAME raw `dispatched`
// maps to a DIFFERENT step by fulfilment type:
//   delivery: pending/processing/dispatched → 0 (Processing); out_for_delivery → 1; delivered → 2
//   pickup:   pending/processing → 0 (Processing); dispatched → 1 (Ready for Pickup); delivered → 2
// Terminal states return stepIndex -1 + the status key for the callout cards.
export function trackingProgress(status, { isPickup = false } = {}) {
  if (status === "cancelled" || status === "returned" || status === "failed_delivery") {
    return { stepIndex: -1, terminal: status };
  }
  if (isPickup) {
    switch (status) {
      case "delivered":
        return { stepIndex: 2, terminal: null };
      case "dispatched":
      case "out_for_delivery": // defensive — pickup orders never reach this raw state
        return { stepIndex: 1, terminal: null };
      case "pending":
      case "processing":
      default:
        return { stepIndex: 0, terminal: null };
    }
  }
  switch (status) {
    case "out_for_delivery":
      return { stepIndex: 1, terminal: null };
    case "delivered":
      return { stepIndex: 2, terminal: null };
    case "pending":
    case "processing":
    case "dispatched":
    default:
      return { stepIndex: 0, terminal: null };
  }
}

// ── Filter axes ─────────────────────────────────────────────────────────────
// Status filter slugs mirror the customer's 3-state tracker vocabulary so the
// list chips match the badges (`badgeFor`) and the tracking pipeline.
// `rawStatuses` is the set of raw enum values a chip matches.
export const ORDER_STATUS_OPTIONS = [
  {
    slug: "processing",
    label: "Confirmed",
    rawStatuses: ["pending", "processing", "dispatched"],
  },
  { slug: "dispatched", label: "Packed", rawStatuses: ["out_for_delivery"] },
  { slug: "delivered", label: "Delivered", rawStatuses: ["delivered"] },
  { slug: "failed", label: "Delivery failed", rawStatuses: ["failed_delivery"] },
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

function inRange(purchasedAt, range, now) {
  if (!range || range.slug === "all") return true;
  const t = new Date(purchasedAt);
  if (Number.isNaN(t.getTime())) return true;
  if (range.sameCalendarYear) return t.getFullYear() === now.getFullYear();
  if (range.days != null) {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - range.days);
    return t >= cutoff;
  }
  return true;
}

// Apply filter axes to a list of display orders (each must carry raw `status`
// and ISO `purchasedAt`).
//   filters.statuses : array of status SLUGS (see ORDER_STATUS_OPTIONS)
//   filters.dateRange: range slug (see ORDER_DATE_RANGES); "all"/missing => no date filter
export function filterOrders(orders, filters) {
  const now = new Date();
  const statuses = Array.isArray(filters?.statuses) ? filters.statuses : [];
  const range = ORDER_DATE_RANGES.find((r) => r.slug === filters?.dateRange);

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
// date range is selected. Drives the "Filter (N)" badge on the page header.
export function ACTIVE_ORDER_FILTER_COUNT(filters) {
  let n = 0;
  if (Array.isArray(filters?.statuses)) n += filters.statuses.length;
  if (filters?.dateRange && filters.dateRange !== "all") n += 1;
  return n;
}

// ── Formatting + server→display mapping ─────────────────────────────────────

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// "21st March 2026" — matches the original mock's date styling.
export function formatOrderDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${ordinal(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// Map one row from myAppGetMyOrders (raw order + `item_count` + `preview_item`)
// into the shape the order cards consume.
export function mapServerOrderToCard(o) {
  const preview = o?.preview_item ?? null;
  const itemCount = Number(o?.item_count) || 0;
  const variant = preview
    ? [preview.color_name, preview.size_name].filter(Boolean).join(" / ")
    : "";
  // Tolerate either serialization of the Sequelize-managed timestamp (the model
  // declares `createdAt: "created_at"`, but accept camel too — this one field
  // drives both the displayed date and the date filter).
  const createdAt = o.created_at ?? o.createdAt;
  return {
    id: o.id,
    orderNumber: o.order_number,
    status: o.status, // raw enum value
    shippingMethodKey: o.shipping_method_key ?? null, // "pickup" → pickup-aware badge/tracking
    purchasedAt: createdAt, // ISO — drives the date filter
    purchaseDate: formatOrderDate(createdAt),
    total: Number(o.total) || 0,
    currency: "JOD",
    itemCount,
    productName: preview?.product_name ?? "Your order",
    productId: preview?.product_id ?? null,
    image: preview?.product_image_url || PLACEHOLDER_IMAGE,
    variant,
  };
}

export { formatJOD };

// Admin orders wire-boundary helpers.
//
// The admin UI speaks in a 4-step DISPLAY vocabulary
// (processing → prepared → with-delivery → delivered) but the backend
// `orders.status` enum is the full 8 values
// (pending, processing, dispatched, out_for_delivery, delivered,
//  failed_delivery, cancelled, returned). This module is the single place
// that translates between the two, per the convention documented in
// Server CLAUDE.md ("Prepared" ↔ `dispatched`, "With Delivery" ↔ `out_for_delivery`).
//
// Keep all raw↔display mapping here so the OrderManager component never hard-codes
// either vocabulary inline.

import { buildAddressLine } from "@/lib/mockCart";

// The linear pipeline the admin drives (display keys).
export const DISPLAY_PIPELINE = ["processing", "prepared", "handed_to_delivery", "delivered"];

// Store-pickup orders are collected in store, so they SKIP the "With Delivery"
// (handed_to_delivery) courier leg: Processing → Prepared → Picked Up. There's
// no Thunder/internal handoff for these — the admin marks them picked up directly.
export const PICKUP_PIPELINE = ["processing", "prepared", "delivered"];

// Pick the pipeline for an order by its shipping method.
export function pipelineFor(shippingMethodKey) {
  return String(shippingMethodKey || "").toLowerCase() === "pickup" ? PICKUP_PIPELINE : DISPLAY_PIPELINE;
}

export const PIPELINE_LABEL = {
  processing: "Processing",
  prepared: "Prepared",
  handed_to_delivery: "With Delivery",
  delivered: "Delivered",
};

// Step/button label — on a pickup order the final "delivered" step reads as
// "Picked Up" rather than "Delivered".
export function pipelineLabel(displayKey, isPickup = false) {
  if (isPickup && displayKey === "delivered") return "Picked Up";
  return PIPELINE_LABEL[displayKey] ?? displayKey;
}

// raw enum value → display key. `pending` collapses into "processing" (the
// admin pipeline intentionally omits a pending step; new checkouts start at
// processing anyway). Every raw value maps — no fall-through.
const RAW_TO_DISPLAY = {
  pending: "processing",
  processing: "processing",
  dispatched: "prepared",
  out_for_delivery: "handed_to_delivery",
  delivered: "delivered",
  failed_delivery: "failed_delivery",
  cancelled: "cancelled",
  returned: "returned",
};

// display key → raw enum value used for writes + status-filter queries.
const DISPLAY_TO_RAW = {
  processing: "processing",
  prepared: "dispatched",
  handed_to_delivery: "out_for_delivery",
  delivered: "delivered",
  failed_delivery: "failed_delivery",
  cancelled: "cancelled",
  returned: "returned",
};

// Human labels for display status keys (badges + buttons).
export const STATUS_LABEL = {
  processing: "Processing",
  prepared: "Prepared",
  handed_to_delivery: "With Delivery",
  delivered: "Delivered",
  failed_delivery: "Failed Delivery",
  cancelled: "Cancelled",
  returned: "Returned",
};

export function statusLabel(displayKey) {
  return STATUS_LABEL[displayKey] ?? displayKey;
}

export function rawToDisplayStatus(raw) {
  return RAW_TO_DISPLAY[raw] ?? "processing";
}

export function displayToRawStatus(display) {
  return DISPLAY_TO_RAW[display] ?? display;
}

// The filter chips shown above the table (display keys + labels). Includes the
// real terminal states so failed/cancelled/returned orders are filterable.
export const ORDER_FILTER_CHIPS = [
  { key: "processing", label: "Processing" },
  { key: "prepared", label: "Prepared" },
  { key: "handed_to_delivery", label: "With Delivery" },
  { key: "delivered", label: "Delivered" },
  { key: "failed_delivery", label: "Failed Delivery" },
  { key: "cancelled", label: "Cancelled" },
  { key: "returned", label: "Returned" },
];

// Per-chip count from the server's raw statusCounts map. The "processing" chip
// folds in any stray `pending` rows so the count matches what the list shows.
export function chipCount(statusCounts, displayKey) {
  if (!statusCounts) return 0;
  if (displayKey === "processing") {
    return (statusCounts.processing || 0) + (statusCounts.pending || 0);
  }
  return statusCounts[displayToRawStatus(displayKey)] || 0;
}

export function totalOrderCount(statusCounts) {
  if (!statusCounts) return 0;
  return Object.values(statusCounts).reduce((s, n) => s + (Number(n) || 0), 0);
}

// "2026-05-19 09:14" from an ISO timestamp.
export function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Map an enriched row from myAppAdminListOrders into the admin table shape.
// (Tolerates either serialization of the managed `created_at` timestamp.)
export function mapAdminOrderRow(o) {
  const snap = o.shipping_address_snapshot || {};
  return {
    id: o.id, // numeric PK — used for resolver calls
    orderNumber: o.order_number,
    customer: o.customer || { name: "—", email: null, phone: null },
    address: buildAddressLine(snap) || "—",
    payment: o.payment_status,
    paymentMethod: o.payment_method ?? null,
    status: rawToDisplayStatus(o.status),
    rawStatus: o.status,
    // Delivery + money breakdown (carried straight off the order row).
    shippingMethodKey: o.shipping_method_key ?? null,
    shippingAmount: Number(o.shipping_amount) || 0,
    taxAmount: Number(o.tax_amount) || 0,
    subtotal: Number(o.subtotal) || 0,
    productDiscount: Number(o.product_discount_amount) || 0,
    promoDiscount: Number(o.promo_discount_amount) || 0,
    deliveryUserId: o.delivery_user_id ?? null,
    notes: o.notes ?? null,
    // Thunder (external courier) link — present when the order was dispatched
    // through Thunder (migration 0021). `deliveryChannel` is "thunder" |
    // "internal" | null.
    deliveryChannel: o.delivery_channel ?? null,
    thunderOrderId: o.thunder_order_id ?? null,
    thunderStatus: o.thunder_status ?? null,
    thunderDeliveryFee: o.thunder_delivery_fee != null ? Number(o.thunder_delivery_fee) : null,
    thunderLastError: o.thunder_last_error ?? null,
    total: Number(o.total) || 0,
    itemCount: Number(o.item_count) || 0,
    totalQty: Number(o.total_qty) || 0,
    placed: formatDateTime(o.created_at ?? o.createdAt),
  };
}

// Resolve the shipping method KEY (standard / express / pickup) into a
// customer-facing { name, eta } from the live commerce settings. Falls back to
// a title-cased key so an unknown / legacy method still reads sensibly.
function titleCase(s) {
  return String(s || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function resolveShippingMethod(settings, key) {
  if (!key) return { name: "—", eta: "" };
  const rows = Array.isArray(settings?.shippingMethods) ? settings.shippingMethods : [];
  const row = rows.find((m) => String(m.key).toLowerCase() === String(key).toLowerCase());
  return { name: row?.name || titleCase(key), eta: row?.eta || "" };
}

export function resolvePaymentLabel(settings, key) {
  if (!key) return "—";
  const rows = Array.isArray(settings?.paymentMethods) ? settings.paymentMethods : [];
  const row = rows.find((m) => String(m.key).toLowerCase() === String(key).toLowerCase());
  return row?.name || titleCase(key);
}

// Map detail line items (myAppGetOrderDetail) into the drawer's item shape.
export function mapDetailItems(items) {
  const rows = Array.isArray(items) ? items : [];
  return rows.map((it, i) => ({
    id: it.id ?? i,
    product: it.product_name ?? "Item",
    color: it.color_name ?? "",
    size: it.size_name ?? "",
    qty: Number(it.quantity) || 0,
    price: Number(it.unit_price) || 0,
    lineTotal: Number(it.total) || 0,
  }));
}

// Map status-history rows (myAppGetOrderDetail) for the activity log.
export function mapDetailHistory(history) {
  const rows = Array.isArray(history) ? history : [];
  return rows.map((h, i) => ({
    id: h.id ?? i,
    at: formatDateTime(h.changed_at),
    to: rawToDisplayStatus(h.status),
    note: h.note || "",
  }));
}

"use client";

/**
 * delivery — data layer + presentation constants for the delivery role surface
 * (/r3pr-dispatch/*). WIRED TO BACKEND (myAppListDeliveryOrders /
 * myAppGetDeliveryOrder / myAppDeliveryUpdateOrderStatus in orders.ts).
 *
 * Status model (REAL server enum — there is NO `handed_to_delivery`):
 *   - dispatched        → admin "Prepared"; assigned to a driver but not yet
 *                         picked up. Driver action: START DELIVERY (→ out_for_delivery).
 *   - out_for_delivery  → admin "With Delivery"; the active leg. Driver action:
 *                         MARK DELIVERED / FAILED DELIVERY.
 *   - delivered / failed_delivery → terminal.
 *
 * An order reaches a driver when an admin assigns it (delivery_user_id) at the
 * Prepared→With-Delivery handoff; the list resolver scopes by delivery_user_id.
 */

import { repairCall } from "@/lib/repairAuthedApi";

// ── Presentation constants ──────────────────────────────────────────────────

export const DELIVERY_STATUSES = [
  { key: "dispatched", label: "Assigned" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered", label: "Delivered" },
  { key: "failed_delivery", label: "Failed Delivery" },
];

// Dashboard filter chips. "active" collapses the two in-flight states a driver
// can still act on (assigned-but-not-started + out for delivery).
export const DELIVERY_FILTERS = [
  { key: "active", label: "To deliver", match: ["dispatched", "out_for_delivery"] },
  { key: "delivered", label: "Delivered", match: ["delivered"] },
  { key: "failed_delivery", label: "Failed", match: ["failed_delivery"] },
];

export const FAILED_DELIVERY_REASONS = [
  { key: "customer_unavailable", label: "Customer unavailable" },
  { key: "wrong_address", label: "Wrong / incomplete address" },
  { key: "refused", label: "Customer refused delivery" },
  { key: "unreachable", label: "Couldn't reach customer" },
  { key: "damaged_package", label: "Package damaged in transit" },
  { key: "other", label: "Other" },
];

export const DELIVERY_TONE = {
  dispatched: { bg: "#fef3c7", fg: "#92400e", dot: "#f59e0b" },
  out_for_delivery: { bg: "#e0e7ff", fg: "#3730a3", dot: "#4f46e5" },
  delivered: { bg: "#dcfce7", fg: "#166534", dot: "#16a34a" },
  failed_delivery: { bg: "#fef2f2", fg: "#b91c1c", dot: "#ef4444" },
};

export function deliveryStatusLabel(key) {
  return DELIVERY_STATUSES.find((s) => s.key === key)?.label ?? key;
}

export function deliveryTone(key) {
  return DELIVERY_TONE[key] ?? DELIVERY_TONE.out_for_delivery;
}

export function reasonLabel(key) {
  return FAILED_DELIVERY_REASONS.find((r) => r.key === key)?.label ?? key ?? "—";
}

// ── Payment state for the driver ("is this paid?") ──────────────────────────
//
// The demo checkout leaves `payment_status` = "pending" on EVERY order (there is
// no real processor to settle a card), so payment_status alone can't tell a
// driver whether money is owed. We derive the operational truth instead:
//   - payment_status "paid"     → Paid (a real gateway later, or admin reconciled)
//   - payment_status "refunded" → Refunded
//   - payment_status "failed"   → Payment failed
//   - pending + COD             → NOT paid → the driver collects cash on delivery
//   - pending + prepaid         → Paid online — a prepaid order only exists because
//                                 the checkout gateway APPROVED it (a decline never
//                                 creates an order); COD is the only unpaid path.
// `collect` marks the "hand me cash" case so the UI can highlight the amount.
export const PAYMENT_TONE = {
  paid: { bg: "#dcfce7", fg: "#166534", dot: "#16a34a" },
  unpaid: { bg: "#fef3c7", fg: "#92400e", dot: "#f59e0b" },
  refunded: { bg: "#f1f5f9", fg: "#475569", dot: "#94a3b8" },
  failed: { bg: "#fef2f2", fg: "#b91c1c", dot: "#ef4444" },
};

export function paymentInfo(order) {
  const status = order?.payment_status;
  const isCod = order?.is_cod ?? order?.payment_method === "cod";
  if (status === "paid") return { paid: true, collect: false, label: "Paid", tone: PAYMENT_TONE.paid };
  if (status === "refunded") return { paid: false, collect: false, label: "Refunded", tone: PAYMENT_TONE.refunded };
  if (status === "failed") return { paid: false, collect: false, label: "Payment failed", tone: PAYMENT_TONE.failed };
  // payment_status === "pending" (or missing) — derive from the payment method.
  if (isCod) return { paid: false, collect: true, label: "Not paid · COD", tone: PAYMENT_TONE.unpaid };
  return { paid: true, collect: false, label: "Paid online", tone: PAYMENT_TONE.paid };
}

export function formatJOD(n) {
  return `JOD ${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Client-side filter / count / summary helpers ────────────────────────────

export function filterDeliveries(rows, filterKey) {
  if (!filterKey || filterKey === "all") return rows;
  const def = DELIVERY_FILTERS.find((f) => f.key === filterKey);
  if (!def) return rows;
  return rows.filter((r) => def.match.includes(r.status));
}

export function deliveryCounts(rows) {
  const c = { active: 0, delivered: 0, failed_delivery: 0 };
  for (const r of rows || []) {
    if (r.status === "dispatched" || r.status === "out_for_delivery") c.active += 1;
    else if (r.status === "delivered") c.delivered += 1;
    else if (r.status === "failed_delivery") c.failed_delivery += 1;
  }
  return c;
}

// Summary string for a LIST row (the list resolver returns item_count /
// total_qty / lead_product_name, not the full items array).
export function deliveryItemsSummary(row) {
  if (!row || !row.item_count) return "—";
  if (row.item_count === 1) return `${row.lead_product_name} × ${row.total_qty}`;
  return `${row.lead_product_name} + ${row.item_count - 1} more · ${row.total_qty} items`;
}

// Summary for the DETAIL items array.
export function detailItemsSummary(items) {
  if (!items || items.length === 0) return "—";
  const totalQty = items.reduce((s, it) => s + (Number(it.qty) || 0), 0);
  if (items.length === 1) return `${items[0].product} × ${items[0].qty}`;
  return `${items[0].product} + ${items.length - 1} more · ${totalQty} items`;
}

// ── Fetchers (repairCall) ───────────────────────────────────────────────────

export async function fetchDeliveryOrders() {
  const data = await repairCall("myAppListDeliveryOrders", {}, { isQuery: true });
  return { items: Array.isArray(data?.items) ? data.items : [], total: Number(data?.total) || 0 };
}

export async function fetchDeliveryOrder(orderId) {
  return repairCall("myAppGetDeliveryOrder", { orderId: Number(orderId) }, { isQuery: true });
}

// status: "out_for_delivery" (start) | "delivered" | "failed_delivery".
// reason = customer-facing label (failed only); note = internal ops note.
export function updateDeliveryStatus(orderId, status, { reason, note } = {}) {
  return repairCall(
    "myAppDeliveryUpdateOrderStatus",
    {
      orderId: Number(orderId),
      status,
      ...(reason ? { reason } : {}),
      ...(note ? { note } : {}),
    },
    { isQuery: false }
  );
}

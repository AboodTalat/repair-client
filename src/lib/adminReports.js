"use client";

/**
 * adminReports — data layer for the admin Reports page (/r3pr-console/reports).
 *
 * Wraps the 8 read-only report resolvers in reports.ts and shapes their output
 * for the charts / stat cards / tables in ReportsView. Three things every
 * caller gets for free here so the UI never has to think about them:
 *
 *   1. NUMBER COERCION. MySQL SUM()/COUNT() come back as STRINGS ("400.00",
 *      "8"). Every numeric field is run through `num()` before it reaches a
 *      chart or a .toFixed() — otherwise totals concatenate instead of adding.
 *   2. INCLUSIVE DATE RANGES. The resolvers compare `created_at <= :endDate`.
 *      A bare "2026-06-30" is read by MySQL as 2026-06-30 00:00:00, so the
 *      whole last day would be dropped. `rangeInput` sends end-of-day.
 *   3. PRIOR-PERIOD DELTAS. Sales + Customers show a delta vs the equal-length
 *      window immediately before the selected range — computed by re-running
 *      the same resolver against `priorRange`, never fabricated.
 *
 * Only metrics a resolver actually returns are surfaced. Metrics the backend
 * cannot supply (gross margin, customer LTV, on-time-delivery %, dispatch
 * time, return-reason breakdown, daily sign-up series) are intentionally
 * absent — they would need data the schema doesn't model.
 */

import { repairCall } from "@/lib/repairAuthedApi";

// SQL aggregates arrive as strings — coerce defensively.
export function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// Chart palette (admin accent + semantic tones), cycled for category/share charts.
const PALETTE = [
  "#1d4ed8", "#0ea5e9", "#a855f7", "#10b981", "#f59e0b", "#ef4444",
  "#14b8a6", "#8b5cf6", "#ec4899", "#64748b", "#22c55e", "#eab308",
];
export function paletteAt(i) {
  return PALETTE[i % PALETTE.length];
}

// Build resolver input from a UI date range (inclusive of the full end day).
function rangeInput(from, to, extra = {}) {
  const input = { ...extra };
  if (from) input.startDate = `${from} 00:00:00`;
  if (to) input.endDate = `${to} 23:59:59`;
  return input;
}

function ymdUTC(ms) {
  const d = new Date(ms);
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${m}-${day}`;
}

// The equal-length window immediately before [from, to]. Used for delta %.
export function priorRange(from, to) {
  if (!from || !to) return null;
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return null;
  const DAY = 86400000;
  const span = Math.round((b - a) / DAY) + 1; // inclusive day count
  return { from: ymdUTC(a - span * DAY), to: ymdUTC(a - DAY) };
}

// Percent change vs prior period. Null when there's no comparable base
// (no prior data) — the UI renders that as a neutral "—", never a fake 0%.
export function pctDelta(cur, prev) {
  if (prev == null || prev === 0) return null;
  return Number((((cur - prev) / prev) * 100).toFixed(1));
}

// Pick a bucket granularity that keeps the sales chart readable across spans.
function groupByForRange(from, to) {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return "day";
  const days = Math.round((b - a) / 86400000) + 1;
  if (days <= 31) return "day";
  if (days <= 182) return "week";
  return "month";
}

function sumSales(rows) {
  let sales = 0, orders = 0, fulfilled = 0;
  for (const r of rows || []) {
    sales += num(r.placed_revenue);
    orders += num(r.orders);
    fulfilled += num(r.fulfilled_revenue);
  }
  return { sales, orders, fulfilled };
}

// ── Sales ────────────────────────────────────────────────────────────────
export async function fetchSalesReport({ from, to }) {
  const groupBy = groupByForRange(from, to);
  const prior = priorRange(from, to);

  const [cur, prev, dash] = await Promise.all([
    repairCall("myAppReportSalesByPeriod", rangeInput(from, to, { groupBy }), { isQuery: true }),
    prior
      ? repairCall("myAppReportSalesByPeriod", rangeInput(prior.from, prior.to, { groupBy }), { isQuery: true })
      : Promise.resolve(null),
    repairCall("myAppDashboardSummary", {}, { isQuery: true }),
  ]);

  const series = (cur?.rows || []).map((r) => ({
    label: r.bucket,
    value: num(r.placed_revenue),
    orders: num(r.orders),
  }));
  const t = sumSales(cur?.rows);
  const pt = prev ? sumSales(prev.rows) : null;
  const aov = t.orders > 0 ? t.sales / t.orders : 0;
  const paov = pt && pt.orders > 0 ? pt.sales / pt.orders : null;

  return {
    groupBy,
    series,
    totals: { sales: t.sales, orders: t.orders, fulfilled: t.fulfilled, aov },
    deltas: {
      sales: pt ? pctDelta(t.sales, pt.sales) : null,
      orders: pt ? pctDelta(t.orders, pt.orders) : null,
      aov: paov != null ? pctDelta(aov, paov) : null,
    },
    topProducts: (dash?.top_products || []).map((p) => ({
      name: p.product_name,
      units: num(p.units_sold),
      revenue: num(p.revenue),
    })),
  };
}

// ── Revenue by category ───────────────────────────────────────────────────
export async function fetchRevenueReport({ from, to }) {
  const r = await repairCall("myAppReportRevenueByCategory", rangeInput(from, to), { isQuery: true });
  const rows = (r?.rows || []).map((row) => {
    const major = row.major_category_name || "Uncategorised";
    const label = row.sub_category_name ? `${major} › ${row.sub_category_name}` : `${major} (entire)`;
    return {
      key: `${row.major_category_id}-${row.sub_category_id ?? "x"}`,
      label,
      major,
      revenue: num(row.revenue),
      units: num(row.units_sold),
    };
  });

  const gross = rows.reduce((s, x) => s + x.revenue, 0);
  const units = rows.reduce((s, x) => s + x.units, 0);

  // Donut: share by MAJOR category (aggregate the sub rows up).
  const byMajor = new Map();
  for (const row of rows) byMajor.set(row.major, (byMajor.get(row.major) || 0) + row.revenue);
  const donut = [...byMajor.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, color: paletteAt(i) }));

  // Bars: top 12 placements by revenue.
  const bars = rows
    .slice()
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 12)
    .map((row, i) => ({ label: row.label, value: row.revenue, color: paletteAt(i) }));

  return {
    rows: rows.sort((a, b) => b.revenue - a.revenue),
    bars,
    donut,
    totals: { gross, units, categories: byMajor.size },
  };
}

// ── Promo code usage ────────────────────────────────────────────────────────
export async function fetchPromoReport({ from, to }) {
  const r = await repairCall("myAppReportPromoCodeUsage", rangeInput(from, to), { isQuery: true });
  const rows = (r?.rows || []).map((row) => ({
    id: row.id,
    code: row.code,
    discount_type: row.discount_type,
    discount_value: num(row.discount_value),
    used_count: num(row.used_count),
    is_active: !!row.is_active,
    expires_at: row.expires_at || null,
    orders_using: num(row.orders_using),
    total_discount_given: num(row.total_discount_given),
  }));

  const redemptions = rows.reduce((s, x) => s + x.orders_using, 0);
  const discountGiven = rows.reduce((s, x) => s + x.total_discount_given, 0);
  return {
    rows,
    totals: {
      totalCodes: rows.length,
      activeCodes: rows.filter((x) => x.is_active).length,
      codesUsed: rows.filter((x) => x.orders_using > 0).length,
      redemptions,
      discountGiven,
      avgDiscount: redemptions > 0 ? discountGiven / redemptions : 0,
    },
  };
}

// ── Inventory (paginated low-stock list) ──────────────────────────────────
export async function fetchInventoryReport({ limit = 50, offset = 0 } = {}) {
  const r = await repairCall("myAppReportInventoryStatus", { limit, offset }, { isQuery: true });
  const rows = (r?.low_stock || []).map((v) => ({
    id: v.variant_id,
    product_name: v.product_name,
    color_name: v.color_name || "—",
    size_name: v.size_name || "—",
    quantity: num(v.quantity),
    low_stock_threshold: num(v.low_stock_threshold),
  }));
  const totals = r?.totals || {};
  return {
    rows,
    total: num(r?.low_stock_total),
    limit: num(r?.limit) || limit,
    offset: num(r?.offset) || offset,
    totals: {
      variants: num(totals.variants),
      lowStock: num(totals.low_stock_count),
      outOfStock: num(totals.out_of_stock_count),
      inStock: num(totals.in_stock_count),
    },
  };
}

// ── Delivery performance ──────────────────────────────────────────────────
export async function fetchDeliveryReport({ from, to }) {
  const r = await repairCall("myAppReportDeliveryPerformance", rangeInput(from, to), { isQuery: true });
  const rows = (r?.rows || []).map((row) => ({
    id: row.delivery_user_id,
    email: row.email,
    assigned: num(row.orders_total),
    delivered: num(row.delivered),
    failed: num(row.failed),
    success_rate: row.success_rate == null ? null : num(row.success_rate),
  }));
  const assigned = rows.reduce((s, x) => s + x.assigned, 0);
  const delivered = rows.reduce((s, x) => s + x.delivered, 0);
  const failed = rows.reduce((s, x) => s + x.failed, 0);
  const inProgress = Math.max(0, assigned - delivered - failed);
  const donut = assigned > 0
    ? [
        { label: "Delivered", value: delivered, color: "#16a34a" },
        { label: "Failed", value: failed, color: "#dc2626" },
        { label: "In progress", value: inProgress, color: "#f59e0b" },
      ].filter((d) => d.value > 0)
    : [];
  return {
    rows,
    donut,
    totals: {
      assigned,
      delivered,
      failed,
      successRate: assigned > 0 ? Number(((delivered / assigned) * 100).toFixed(1)) : null,
    },
  };
}

// ── Customer activity ─────────────────────────────────────────────────────
export async function fetchCustomerReport({ from, to }) {
  const prior = priorRange(from, to);
  const [cur, prev] = await Promise.all([
    repairCall("myAppReportCustomerActivity", rangeInput(from, to), { isQuery: true }),
    prior
      ? repairCall("myAppReportCustomerActivity", rangeInput(prior.from, prior.to), { isQuery: true })
      : Promise.resolve(null),
  ]);

  const topCustomers = (cur?.top_customers || []).map((c) => ({
    id: c.id,
    email: c.email,
    orders: num(c.orders),
    spent: num(c.spent),
  }));
  const newCustomers = num(cur?.new_customers);
  return {
    topCustomers,
    totals: {
      newCustomers,
      returningCustomers: num(cur?.returning_customers),
      topSpenderAmount: topCustomers[0]?.spent ?? 0,
      topSpenderOrders: topCustomers[0]?.orders ?? 0,
    },
    deltas: {
      newCustomers: prev ? pctDelta(newCustomers, num(prev.new_customers)) : null,
    },
  };
}

// ── Returns / refunds ─────────────────────────────────────────────────────
export async function fetchReturnsReport({ from, to }) {
  const r = await repairCall("myAppReportReturnRefundRates", rangeInput(from, to), { isQuery: true });
  const total = num(r?.total_orders);
  const delivered = num(r?.delivered);
  const returned = num(r?.returned);
  const cancelled = num(r?.cancelled);
  // "Other" = everything not in a terminal delivered/returned/cancelled state
  // (still pending/processing/dispatched/out_for_delivery, plus failed_delivery).
  // Only `delivered` is painted green — an in-flight or failed order is never
  // labelled "Completed".
  const other = Math.max(0, total - delivered - returned - cancelled);
  const donut = total > 0
    ? [
        { label: "Delivered", value: delivered, color: "#16a34a" },
        { label: "Returned", value: returned, color: "#a855f7" },
        { label: "Cancelled", value: cancelled, color: "#dc2626" },
        { label: "Other", value: other, color: "#9ca3af" },
      ].filter((d) => d.value > 0)
    : [];
  return {
    donut,
    totals: {
      totalOrders: total,
      delivered,
      returned,
      cancelled,
      refunded: num(r?.refunded),
      returnRate: num(r?.return_rate),
      cancelRate: num(r?.cancel_rate),
    },
  };
}

// ── CSV export (client-side Blob — no dependency) ──────────────────────────
// headers: [{ key, label }]; rows: array of plain objects keyed by header.key.
export function downloadCsv(filename, headers, rows) {
  // Excel, LibreOffice and Sheets evaluate a cell that opens with = + - or @ as
  // a FORMULA — including inside quotes, so CSV quoting is not a defence. Every
  // export here carries operator-supplied text: Top Customers exports customer
  // emails, Delivery exports account emails, Subscribers exports whatever the
  // public newsletter box accepted.
  //
  // And the address regex both ends of the app share
  // (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/) admits exactly the local parts that
  // matter: "=1+1@x.com" and "-2+3@x.com" both pass it (verified). So anyone
  // who can sign up can plant a formula that runs on an admin's machine the
  // moment they open the export — a DDE/HYPERLINK payload in that position is
  // the classic path to data exfiltration or command execution.
  //
  // Prefixing a single quote is the standard neutraliser: spreadsheets treat
  // the cell as literal text and hide the quote, and a plain CSV reader sees one
  // extra leading character rather than a formula. Applied at the escape layer
  // so every current and future caller of downloadCsv inherits it.
  const esc = (v) => {
    let s = v == null ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map((h) => esc(h.label)).join(",")];
  for (const row of rows || []) lines.push(headers.map((h) => esc(row[h.key])).join(","));
  // BOM so Excel reads UTF-8; CRLF line endings for Windows tooling.
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

"use client";

/**
 * finance — data layer + presentation helpers for the accountant ledger
 * (`/r3pr-ledger/*`). WIRED TO BACKEND (`resolvers/finance.ts`, plus
 * `myAppReportRevenueByCategory` from `reports.ts` for the category tab). All
 * finance reads gate on BOTH `admin` and `accounting`. Replaces the deleted
 * `mockFinance.js`.
 *
 * Conventions carried over from adminReports:
 *   - `num()` coerces the STRING aggregates MySQL returns.
 *   - date ranges are sent inclusive of the full end day.
 *   - prior-period deltas are REAL — the resolver returns index-paired prev*
 *     columns per day; we just sum them.
 */

import { repairCall } from "@/lib/repairAuthedApi";
import { num, paletteAt, downloadCsv } from "@/lib/adminReports";
import { formatCurrency, formatNumber } from "@/lib/mockAdmin";

export { num, formatCurrency, formatNumber, downloadCsv };

// ── Input helpers ───────────────────────────────────────────────────────────
// Feeds BOTH resolver styles in one shape: finance.ts reads `from`/`to`,
// reports.ts (revenue-by-category) reads `startDate`/`endDate`. End-of-day so
// `created_at <= :to` doesn't drop the last day.
function rangeInput(from, to, extra = {}) {
  const f = from ? `${from} 00:00:00` : undefined;
  const t = to ? `${to} 23:59:59` : undefined;
  const input = { ...extra };
  if (f) { input.from = f; input.startDate = f; }
  if (t) { input.to = t; input.endDate = t; }
  return input;
}

function nameFromEmail(email) {
  if (!email) return "—";
  const local = String(email).split("@")[0];
  const parts = local.split(/[._-]/).filter(Boolean);
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ") || local;
}

function fmtDateShort(d) {
  if (!d) return null;
  const date = new Date(`${d}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}
function formatRange(from, to) {
  const a = fmtDateShort(from);
  const b = fmtDateShort(to);
  if (a && b) return `${a} – ${b}`;
  return a || b || "All time";
}

// ── Overview (KPIs + chart + breakdowns + discount table) ───────────────────
export async function fetchFinanceOverview({ from, to }) {
  const [ds, dc, rp, rc] = await Promise.all([
    repairCall("myAppFinanceDailySeries", rangeInput(from, to), { isQuery: true }),
    repairCall("myAppFinanceDiscountByCode", rangeInput(from, to), { isQuery: true }),
    repairCall("myAppFinanceRevenueByProduct", rangeInput(from, to, { limit: 50 }), { isQuery: true }),
    repairCall("myAppReportRevenueByCategory", rangeInput(from, to), { isQuery: true }),
  ]);

  const series = (ds?.series || []).map((r) => ({
    day: r.day,
    revenue: num(r.revenue),
    prevRevenue: num(r.prevRevenue),
    orders: num(r.orders),
    prevOrders: num(r.prevOrders),
    discount: num(r.discount),
    prevDiscount: num(r.prevDiscount),
    net: num(r.net),
    prevNet: num(r.prevNet),
  }));

  const discountByCode = (dc?.rows || []).map((r) => ({
    code: r.code,
    type:
      r.type === "percentage"
        ? `${num(r.discount_value)}% off`
        : `${formatCurrency(num(r.discount_value))} off`,
    redemptions: num(r.redemptions),
    impact: num(r.impact),
    active: !!r.is_active,
  }));

  const revenueByProduct = (rp?.rows || []).map((r) => ({
    name: r.name,
    units: num(r.units),
    revenue: num(r.revenue),
  }));

  // Category tab: aggregate the reports rows up to MAJOR category for the
  // bar + donut + share list.
  const byMajor = new Map();
  for (const row of rc?.rows || []) {
    const label = row.major_category_name?.trim() || "Uncategorised";
    byMajor.set(label, (byMajor.get(label) || 0) + num(row.revenue));
  }
  const revenueByCategory = [...byMajor.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, color: paletteAt(i) }));

  return { series, discountByCode, revenueByProduct, revenueByCategory };
}

// ── Aggregation / rollup helpers (operate on the daily `series`) ─────────────
export function aggregate(rows) {
  const acc = { revenue: 0, prevRevenue: 0, orders: 0, prevOrders: 0, discount: 0, prevDiscount: 0, net: 0, prevNet: 0 };
  for (const r of rows || []) {
    acc.revenue += r.revenue;
    acc.prevRevenue += r.prevRevenue;
    acc.orders += r.orders;
    acc.prevOrders += r.prevOrders;
    acc.discount += r.discount;
    acc.prevDiscount += r.prevDiscount;
    acc.net += r.net;
    acc.prevNet += r.prevNet;
  }
  return acc;
}

export function pctDelta(curr, prev) {
  if (!prev) return null;
  return Number((((curr - prev) / prev) * 100).toFixed(1));
}

function emptyBucket(label) {
  return { label, revenue: 0, prevRevenue: 0, orders: 0, prevOrders: 0, discount: 0, prevDiscount: 0, net: 0, prevNet: 0 };
}
function pushInto(b, r) {
  b.revenue += r.revenue; b.prevRevenue += r.prevRevenue;
  b.orders += r.orders; b.prevOrders += r.prevOrders;
  b.discount += r.discount; b.prevDiscount += r.prevDiscount;
  b.net += r.net; b.prevNet += r.prevNet;
}
function isoWeekLabel(dayStr) {
  const d = new Date(`${dayStr}T00:00:00Z`);
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum);
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `Wk of ${m}-${dd}`;
}
function monthLabel(dayStr) {
  const d = new Date(`${dayStr}T00:00:00Z`);
  return d.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

// `day` is an ISO "YYYY-MM-DD" string from the resolver.
export function rollupBy(rows, granularity) {
  if (granularity === "day") return (rows || []).map((r) => ({ label: r.day, ...r }));
  const buckets = new Map();
  for (const r of rows || []) {
    const key = granularity === "week" ? isoWeekLabel(r.day) : monthLabel(r.day);
    if (!buckets.has(key)) buckets.set(key, emptyBucket(key));
    pushInto(buckets.get(key), r);
  }
  return [...buckets.values()];
}

// ── Export history ──────────────────────────────────────────────────────────
export const EXPORT_STATUS_TONE = {
  ready: { bg: "#dcfce7", fg: "#166534", label: "Ready" },
  expired: { bg: "#f3f4f6", fg: "#6b7280", label: "Expired" },
  generating: { bg: "#dbeafe", fg: "#1e40af", label: "Generating…" },
};

export function formatBytes(kb) {
  if (!kb) return "—";
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function mapExportRow(r) {
  return {
    id: r.id,
    fileName: r.file_name,
    format: r.format,
    report: r.report,
    range: formatRange(r.range_from, r.range_to),
    generatedBy: { name: r.generated_by ? nameFromEmail(r.generated_by.email) : "—", email: r.generated_by?.email || "" },
    generatedAt: r.generated_at,
    status: r.status,
    sizeKb: num(r.size_kb),
  };
}

export async function fetchExports({ format, status } = {}) {
  const input = {};
  if (format && format !== "all") input.format = format;
  if (status && status !== "all") input.status = status;
  const data = await repairCall("myAppFinanceListExports", input, { isQuery: true });
  const countByStatus = { ready: 0, generating: 0, expired: 0 };
  for (const t of data?.totals || []) {
    if (t.status in countByStatus) countByStatus[t.status] = num(t.cnt);
  }
  return {
    items: (data?.items || []).map(mapExportRow),
    total: num(data?.total),
    countByStatus,
  };
}

// Best-effort download — returns { file_name, file_path, size_kb } for a READY
// export, or throws with the resolver's message (e.g. "Export is generating").
export async function downloadExport(id) {
  return repairCall("myAppFinanceDownloadExport", { id: Number(id) }, { isQuery: false });
}

// ── Audit log ───────────────────────────────────────────────────────────────
export const AUDIT_ACTION_KINDS = {
  view: { label: "Viewed report", bg: "#eff6ff", fg: "#1d4ed8" },
  export: { label: "Generated export", bg: "#ecfccb", fg: "#3f6212" },
  filter: { label: "Changed filter", bg: "#fef3c7", fg: "#92400e" },
  signin: { label: "Signed in", bg: "#f3f4f6", fg: "#6b7280" },
  signout: { label: "Signed out", bg: "#f3f4f6", fg: "#6b7280" },
};

// Reverse of the resolver's kind→prefix map. Keep in lockstep with the
// LEDGER action allow-list in myAppFinanceAuditLog.
function actionToKind(action) {
  const a = String(action || "");
  if (a.startsWith("finance.view")) return "view";
  if (a.startsWith("finance.export") || a.startsWith("finance.download_export")) return "export";
  if (a.startsWith("finance.filter")) return "filter";
  if (a.startsWith("auth.signin")) return "signin";
  if (a.startsWith("auth.signout")) return "signout";
  return "view";
}

const ACTION_LABELS = {
  "finance.view.daily_series": "Viewed daily revenue series",
  "finance.view.discount_by_code": "Viewed discount by code",
  "finance.view.revenue_by_product": "Viewed revenue by product",
  "finance.view.list_exports": "Viewed export history",
  "finance.download_export": "Downloaded an export",
  "auth.signin": "Signed in",
  "auth.signout": "Signed out",
};

function humanizeAction(action, payload) {
  if (action === "finance.export") {
    const report = payload?.report;
    const format = payload?.format;
    if (report && format) return `Exported ${report} as ${format}`;
    return "Generated an export";
  }
  return ACTION_LABELS[action] || action;
}

function targetOf(action, payload, targetTable) {
  if (action === "finance.export" && payload?.report) return payload.report;
  if (action?.startsWith("finance.view")) return "Financial overview";
  return targetTable || "—";
}

function mapAuditRow(r) {
  return {
    id: r.id,
    kind: actionToKind(r.action),
    actor: { name: r.actor ? nameFromEmail(r.actor.email) : r.actor_role || "system", email: r.actor?.email || "" },
    detail: humanizeAction(r.action, r.detail),
    target: targetOf(r.action, r.detail, r.target_table),
    occurredAt: r.occurred_at,
    ip: r.ip,
  };
}

export async function fetchAuditLog({ from, to, kind } = {}) {
  const input = { limit: 200 };
  if (from) input.from = `${from} 00:00:00`;
  if (to) input.to = `${to} 23:59:59`;
  if (kind && kind !== "all") input.kind = kind;
  const data = await repairCall("myAppFinanceAuditLog", input, { isQuery: true });
  return { items: (data?.items || []).map(mapAuditRow), total: num(data?.total) };
}

export function formatAuditTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "" };
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  return { date, time };
}

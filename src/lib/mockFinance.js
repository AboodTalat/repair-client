// Mock finance data for the (accountant) area. Derived from mockAdmin where
// possible so a single edit there propagates here. Swap to repairQuery(
// "myAppFinance...") calls when the finance resolvers land — the existing
// reports.ts on the server already returns aggregated JSON close to this
// shape, so wiring is mostly renaming fields.

import {
  SALES_SERIES_30,
  REVENUE_BY_CATEGORY,
  TOP_PRODUCTS,
  PROMO_CODES,
  formatCurrency,
  formatNumber,
} from "./mockAdmin.js";

// ── Per-day finance series ──────────────────────────────────────────────────
// Synthesised from SALES_SERIES_30 so revenue / orders / discount / net all
// move together on the same daily index. AOV ≈ JOD 70-80, discount ≈ 14% of
// gross — values picked to match the KPI cards on screen.

const ORDERS_PER_DAY_AVG = 75;
const DISCOUNT_PCT       = 0.14;

function jitterOrders(revenue, i, baseAov) {
  return Math.max(1, Math.round(revenue / baseAov + Math.sin(i * 1.3) * 4));
}
function jitterDiscount(revenue, i) {
  return Math.max(0, Math.round(revenue * DISCOUNT_PCT + Math.cos(i * 0.9) * 90));
}

export const FINANCE_DAILY = SALES_SERIES_30.map((d, i) => {
  const revenue        = d.current;
  const prevRevenue    = d.prev;
  const orders         = jitterOrders(revenue, i, ORDERS_PER_DAY_AVG);
  const prevOrders     = jitterOrders(prevRevenue, i, ORDERS_PER_DAY_AVG);
  const discount       = jitterDiscount(revenue, i);
  const prevDiscount   = jitterDiscount(prevRevenue, i);
  return {
    day: d.day,
    revenue,
    prevRevenue,
    orders,
    prevOrders,
    discount,
    prevDiscount,
    net: revenue - discount,
    prevNet: prevRevenue - prevDiscount,
  };
});

// ── Discount impact by promo code ───────────────────────────────────────────
// Lines up with PROMO_CODES from mockAdmin for the codes that exist there,
// plus a couple of synthetic codes so the discount table doesn't read empty.

export const DISCOUNT_BY_CODE = [
  ...PROMO_CODES.map((p, i) => ({
    code:        p.code,
    type:        p.type === "percentage" ? `${p.amount}% off` : `${formatCurrency(p.amount)} off`,
    redemptions: p.used,
    impact:      Math.round((p.used || 0) * (p.type === "percentage" ? 28 : Number(p.amount || 0))),
    active:      p.active,
    rank:        i,
  })),
  { code: "VIP20",    type: "20% off", redemptions:  28, impact: 1_120, active: true,  rank: 99 },
  { code: "WELCOME10", type: "10% off", redemptions: 215, impact: 1_500, active: true, rank: 100 },
].sort((a, b) => b.impact - a.impact);

// ── Revenue by product ──────────────────────────────────────────────────────
// Extends TOP_PRODUCTS so the Product breakdown table has enough rows to scan
// without scrolling on desktop. Once the storefront catalog resolver lands,
// swap to a `myAppFinanceRevenueByProduct({ from, to, limit })` call.

export const REVENUE_BY_PRODUCT = [
  ...TOP_PRODUCTS,
  { id: "p-6",  name: "Slate Joggers",         units: 178, revenue: 8_900 },
  { id: "p-7",  name: "Black Performance Tee", units: 156, revenue: 6_240 },
  { id: "p-8",  name: "Khaki Cap",             units: 124, revenue: 2_480 },
  { id: "p-9",  name: "Recycled Tote",         units:  98, revenue: 1_960 },
  { id: "p-10", name: "Sky Blue Hoodie",       units:  82, revenue: 4_920 },
].sort((a, b) => b.revenue - a.revenue);

// ── Time-period rollups ─────────────────────────────────────────────────────
// Reducers that bucket a daily slice into wider periods. Called from the
// FinanceOverview component once the date filter has trimmed FINANCE_DAILY.

const MONTH_LOOKUP = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function parseMockDay(dayLabel) {
  // SALES_SERIES_30 days look like "Apr 21" / "May 3" — year is implicit 2026.
  const [mon, dd] = dayLabel.split(" ");
  const month = MONTH_LOOKUP[mon] ?? 0;
  return new Date(2026, month, Number(dd));
}

function isoWeek(date) {
  // ISO-week-style label keyed by Monday — good enough for grouping mock days.
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum);
  const m = d.getUTCMonth() + 1;
  const dd = d.getUTCDate();
  return `Wk of ${String(m).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

function emptyBucket(label) {
  return {
    label,
    revenue: 0, prevRevenue: 0,
    orders:  0, prevOrders:  0,
    discount: 0, prevDiscount: 0,
    net: 0, prevNet: 0,
  };
}

function pushInto(bucket, row) {
  bucket.revenue      += row.revenue;
  bucket.prevRevenue  += row.prevRevenue;
  bucket.orders       += row.orders;
  bucket.prevOrders   += row.prevOrders;
  bucket.discount     += row.discount;
  bucket.prevDiscount += row.prevDiscount;
  bucket.net          += row.net;
  bucket.prevNet      += row.prevNet;
}

export function rollupBy(rows, granularity) {
  if (granularity === "day") return rows.map((r) => ({ label: r.day, ...r }));

  const buckets = new Map();
  for (const r of rows) {
    const date = parseMockDay(r.day);
    let key;
    if (granularity === "week") {
      key = isoWeek(date);
    } else {
      // month
      key = date.toLocaleString("en-US", { month: "short", year: "numeric" });
    }
    if (!buckets.has(key)) buckets.set(key, emptyBucket(key));
    pushInto(buckets.get(key), r);
  }
  return [...buckets.values()];
}

// ── Aggregate helpers ───────────────────────────────────────────────────────

export function aggregate(rows) {
  const acc = {
    revenue: 0, prevRevenue: 0,
    orders:  0, prevOrders:  0,
    discount: 0, prevDiscount: 0,
    net: 0, prevNet: 0,
  };
  for (const r of rows) {
    acc.revenue      += r.revenue;
    acc.prevRevenue  += r.prevRevenue;
    acc.orders       += r.orders;
    acc.prevOrders   += r.prevOrders;
    acc.discount     += r.discount;
    acc.prevDiscount += r.prevDiscount;
    acc.net          += r.net;
    acc.prevNet      += r.prevNet;
  }
  return acc;
}

export function pctDelta(curr, prev) {
  if (!prev) return null;
  return +(((curr - prev) / prev) * 100).toFixed(1);
}

// ── Category data passthrough ───────────────────────────────────────────────
// Re-export so the page only imports from mockFinance — keeps the swap-to-API
// surface tidy when these become resolver calls.

export { REVENUE_BY_CATEGORY, formatCurrency, formatNumber };

// ── Export history ──────────────────────────────────────────────────────────
// Past exports the accountant has generated from the Overview page. Real data
// will come from a future `myAppFinanceListExports` resolver — each row is the
// audit record of an export operation (filename, format, report, range,
// generated_by user, generated_at, status, size).

export const EXPORT_HISTORY = [
  {
    id: "exp-001",
    fileName: "revenue-overview-2026-05-20.pdf",
    format: "PDF",
    report: "Revenue overview",
    range: "Apr 21 – May 20, 2026",
    generatedBy: { name: "Sara Ahmad",   email: "sara.ahmad@repair.example" },
    generatedAt: "2026-05-20T14:32:00Z",
    status: "ready",
    sizeKb: 412,
  },
  {
    id: "exp-002",
    fileName: "discount-impact-2026-05-19.csv",
    format: "CSV",
    report: "Discount impact by code",
    range: "Apr 21 – May 20, 2026",
    generatedBy: { name: "Sara Ahmad",   email: "sara.ahmad@repair.example" },
    generatedAt: "2026-05-19T09:14:00Z",
    status: "ready",
    sizeKb: 18,
  },
  {
    id: "exp-003",
    fileName: "revenue-by-product-2026-05-15.csv",
    format: "CSV",
    report: "Revenue by product",
    range: "Apr 16 – May 15, 2026",
    generatedBy: { name: "Sara Ahmad",   email: "sara.ahmad@repair.example" },
    generatedAt: "2026-05-15T17:48:00Z",
    status: "ready",
    sizeKb: 26,
  },
  {
    id: "exp-004",
    fileName: "revenue-overview-2026-05-12.pdf",
    format: "PDF",
    report: "Revenue overview",
    range: "Apr 13 – May 12, 2026",
    generatedBy: { name: "Omar Khalil",  email: "omar.khalil@repair.example" },
    generatedAt: "2026-05-12T11:02:00Z",
    status: "ready",
    sizeKb: 388,
  },
  {
    id: "exp-005",
    fileName: "category-breakdown-2026-05-08.csv",
    format: "CSV",
    report: "Revenue by category",
    range: "Apr 9 – May 8, 2026",
    generatedBy: { name: "Sara Ahmad",   email: "sara.ahmad@repair.example" },
    generatedAt: "2026-05-08T08:21:00Z",
    status: "ready",
    sizeKb: 12,
  },
  {
    id: "exp-006",
    fileName: "revenue-overview-2026-04-30.pdf",
    format: "PDF",
    report: "Revenue overview",
    range: "Apr 1 – Apr 30, 2026",
    generatedBy: { name: "Omar Khalil",  email: "omar.khalil@repair.example" },
    generatedAt: "2026-04-30T22:05:00Z",
    status: "expired",
    sizeKb: 401,
  },
  {
    id: "exp-007",
    fileName: "discount-impact-2026-04-28.pdf",
    format: "PDF",
    report: "Discount impact by code",
    range: "Mar 29 – Apr 28, 2026",
    generatedBy: { name: "Sara Ahmad",   email: "sara.ahmad@repair.example" },
    generatedAt: "2026-04-28T15:11:00Z",
    status: "expired",
    sizeKb: 264,
  },
  {
    id: "exp-008",
    fileName: "revenue-by-product-2026-04-22.csv",
    format: "CSV",
    report: "Revenue by product",
    range: "Mar 23 – Apr 22, 2026",
    generatedBy: { name: "Sara Ahmad",   email: "sara.ahmad@repair.example" },
    generatedAt: "2026-04-22T10:33:00Z",
    status: "expired",
    sizeKb: 24,
  },
  {
    id: "exp-009",
    fileName: "revenue-overview-2026-05-21.pdf",
    format: "PDF",
    report: "Revenue overview",
    range: "Apr 22 – May 21, 2026",
    generatedBy: { name: "Sara Ahmad",   email: "sara.ahmad@repair.example" },
    generatedAt: "2026-05-21T07:55:00Z",
    status: "generating",
    sizeKb: 0,
  },
];

export const EXPORT_STATUS_TONE = {
  ready:      { bg: "#dcfce7", fg: "#166534", label: "Ready" },
  expired:    { bg: "#f3f4f6", fg: "#6b7280", label: "Expired" },
  generating: { bg: "#dbeafe", fg: "#1e40af", label: "Generating…" },
};

export function formatBytes(kb) {
  if (!kb) return "—";
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

// ── Audit log ───────────────────────────────────────────────────────────────
// Read-only audit trail of accountant actions (sign-in, sign-out, viewing a
// report, changing a date range, running an export). Backed by a future
// `myAppFinanceAuditLog({ from, to })` resolver that returns the same shape.

export const AUDIT_ACTION_KINDS = {
  view:    { label: "Viewed report",   bg: "#eff6ff", fg: "#1d4ed8" },
  export:  { label: "Generated export", bg: "#ecfccb", fg: "#3f6212" },
  filter:  { label: "Changed filter",   bg: "#fef3c7", fg: "#92400e" },
  signin:  { label: "Signed in",        bg: "#f3f4f6", fg: "#6b7280" },
  signout: { label: "Signed out",       bg: "#f3f4f6", fg: "#6b7280" },
};

export const AUDIT_LOG = [
  { id: "a-001", kind: "export",  actor: { name: "Sara Ahmad",  email: "sara.ahmad@repair.example" },
    detail: "Exported Revenue overview as PDF",
    target: "Revenue overview", occurredAt: "2026-05-20T14:32:00Z", ip: "196.219.211.42" },
  { id: "a-002", kind: "view",    actor: { name: "Sara Ahmad",  email: "sara.ahmad@repair.example" },
    detail: "Opened Financial Overview page",
    target: "/r3pr-ledger/overview", occurredAt: "2026-05-20T14:30:00Z", ip: "196.219.211.42" },
  { id: "a-003", kind: "filter",  actor: { name: "Sara Ahmad",  email: "sara.ahmad@repair.example" },
    detail: "Changed date range to Apr 21 – May 20",
    target: "Revenue overview", occurredAt: "2026-05-20T14:29:14Z", ip: "196.219.211.42" },
  { id: "a-004", kind: "signin",  actor: { name: "Sara Ahmad",  email: "sara.ahmad@repair.example" },
    detail: "Signed in via email + password",
    target: "/sign-in", occurredAt: "2026-05-20T14:28:51Z", ip: "196.219.211.42" },
  { id: "a-005", kind: "export",  actor: { name: "Sara Ahmad",  email: "sara.ahmad@repair.example" },
    detail: "Exported Discount impact by code as CSV",
    target: "Discount impact by code", occurredAt: "2026-05-19T09:14:00Z", ip: "196.219.211.42" },
  { id: "a-006", kind: "view",    actor: { name: "Omar Khalil", email: "omar.khalil@repair.example" },
    detail: "Opened Financial Overview page",
    target: "/r3pr-ledger/overview", occurredAt: "2026-05-19T08:02:33Z", ip: "212.118.20.91" },
  { id: "a-007", kind: "export",  actor: { name: "Sara Ahmad",  email: "sara.ahmad@repair.example" },
    detail: "Exported Revenue by product as CSV",
    target: "Revenue by product", occurredAt: "2026-05-15T17:48:00Z", ip: "196.219.211.42" },
  { id: "a-008", kind: "signout", actor: { name: "Omar Khalil", email: "omar.khalil@repair.example" },
    detail: "Signed out",
    target: "/sign-out", occurredAt: "2026-05-15T11:46:18Z", ip: "212.118.20.91" },
  { id: "a-009", kind: "filter",  actor: { name: "Omar Khalil", email: "omar.khalil@repair.example" },
    detail: "Switched breakdown tab to By product",
    target: "Revenue by product", occurredAt: "2026-05-15T11:39:02Z", ip: "212.118.20.91" },
  { id: "a-010", kind: "view",    actor: { name: "Omar Khalil", email: "omar.khalil@repair.example" },
    detail: "Opened Financial Overview page",
    target: "/r3pr-ledger/overview", occurredAt: "2026-05-15T11:32:11Z", ip: "212.118.20.91" },
  { id: "a-011", kind: "export",  actor: { name: "Omar Khalil", email: "omar.khalil@repair.example" },
    detail: "Exported Revenue overview as PDF",
    target: "Revenue overview", occurredAt: "2026-05-12T11:02:00Z", ip: "212.118.20.91" },
  { id: "a-012", kind: "export",  actor: { name: "Sara Ahmad",  email: "sara.ahmad@repair.example" },
    detail: "Exported Revenue by category as CSV",
    target: "Revenue by category", occurredAt: "2026-05-08T08:21:00Z", ip: "196.219.211.42" },
  { id: "a-013", kind: "signin",  actor: { name: "Omar Khalil", email: "omar.khalil@repair.example" },
    detail: "Signed in via Google",
    target: "/sign-in", occurredAt: "2026-04-30T21:58:04Z", ip: "212.118.20.91" },
  { id: "a-014", kind: "export",  actor: { name: "Omar Khalil", email: "omar.khalil@repair.example" },
    detail: "Exported Revenue overview as PDF",
    target: "Revenue overview", occurredAt: "2026-04-30T22:05:00Z", ip: "212.118.20.91" },
  { id: "a-015", kind: "export",  actor: { name: "Sara Ahmad",  email: "sara.ahmad@repair.example" },
    detail: "Exported Discount impact by code as PDF",
    target: "Discount impact by code", occurredAt: "2026-04-28T15:11:00Z", ip: "196.219.211.42" },
  { id: "a-016", kind: "view",    actor: { name: "Sara Ahmad",  email: "sara.ahmad@repair.example" },
    detail: "Opened Financial Overview page",
    target: "/r3pr-ledger/overview", occurredAt: "2026-04-28T15:08:22Z", ip: "196.219.211.42" },
];

export function formatAuditTime(iso) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  return { date, time };
}

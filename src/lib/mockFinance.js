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

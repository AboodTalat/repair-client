"use client";

/**
 * adminDashboard — data layer for the admin home dashboard
 * (/r3pr-console/dashboard). WIRED TO BACKEND.
 *
 * The dashboard is a read-only snapshot, so it fans out one batch of the
 * existing read resolvers and shapes their output for the KPI cards / charts /
 * tables. Nothing here is dashboard-specific on the server — it reuses:
 *   - myAppDashboardSummary        → active orders, new customers (30d),
 *                                    low-stock count, top products
 *   - myAppReportSalesByPeriod     → 7-day revenue trend + 30d total & delta
 *   - myAppReportRevenueByCategory → revenue-share donut (by major)  [via fetchRevenueReport]
 *   - myAppReportInventoryStatus   → low-stock variant list
 *   - myAppAdminListOrders         → recent orders feed
 *
 * Same honesty rule as adminReports: only deltas we can genuinely compute (a
 * prior-period comparison) are surfaced; KPIs with no comparable base show no
 * arrow rather than a fabricated 0%. All SQL aggregates arrive as strings, so
 * every number is run through `num()`.
 */

import { repairCall } from "@/lib/repairAuthedApi";
import { num, priorRange, pctDelta, fetchRevenueReport } from "@/lib/adminReports";
import { mapAdminOrderRow, statusLabel } from "@/lib/adminOrders";
import { todayISO, daysAgoISO } from "@/lib/adminDates";

const RECENT_ORDERS_LIMIT = 6;
const LOW_STOCK_LIMIT = 6;

// Inclusive-of-the-full-end-day range input (mirrors adminReports.rangeInput).
function rangeInput(from, to, extra = {}) {
  const input = { ...extra };
  if (from) input.startDate = `${from} 00:00:00`;
  if (to) input.endDate = `${to} 23:59:59`;
  return input;
}

// "2026-07-04" → "Jul 4" for the compact 7-day chart axis.
function shortDay(bucket) {
  const d = new Date(`${bucket}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return bucket;
  return `${d.toLocaleString("en-US", { month: "short", timeZone: "UTC" })} ${d.getUTCDate()}`;
}

function sumRevenue(rows) {
  return (rows || []).reduce((s, r) => s + num(r.placed_revenue), 0);
}

// The last `n` calendar-day keys ("YYYY-MM-DD"), oldest → today. Built from the
// same LOCAL-calendar helper as the range window, so these keys match both the
// requested range and the `bucket` values the resolver groups by. Formatting
// them in UTC instead put the whole chart a day out of step for three hours
// every night — see lib/adminDates.js.
function lastNDayKeys(n) {
  const keys = [];
  for (let i = n - 1; i >= 0; i--) keys.push(daysAgoISO(i));
  return keys;
}

export async function fetchDashboardData() {
  const to = todayISO();
  const from = daysAgoISO(29); // last 30 days, inclusive
  const prior = priorRange(from, to);

  // allSettled, NOT all.
  //
  // This is the console's landing page (/r3pr-console redirects here) and it
  // fans out to six independent resolvers. Under Promise.all a single rejection
  // took the whole page down: `repairCall` throws on
  // `blnRequestSuccessful:false` (repairClientApi.js), DashboardView catches and
  // renders ONLY its error box, and the five panels that answered fine are
  // discarded. Reproduced against the running server with one bad date on the
  // revenue call — five panels returned data, the page showed nothing.
  //
  // So every panel now stands or falls alone. A failed one renders its own empty
  // state; `failures` carries the rest up so the view can say which parts are
  // missing instead of pretending the page is complete. Only a total wipe-out
  // (every call failed — almost always auth or the server being down) still
  // throws, because at that point there is genuinely nothing to show.
  const settled = await Promise.allSettled([
    repairCall("myAppDashboardSummary", {}, { isQuery: true }),
    repairCall("myAppReportSalesByPeriod", rangeInput(from, to, { groupBy: "day" }), { isQuery: true }),
    prior
      ? repairCall("myAppReportSalesByPeriod", rangeInput(prior.from, prior.to, { groupBy: "day" }), { isQuery: true })
      : Promise.resolve(null),
    fetchRevenueReport({ from, to }),
    repairCall("myAppReportInventoryStatus", { limit: LOW_STOCK_LIMIT, offset: 0 }, { isQuery: true }),
    repairCall("myAppAdminListOrders", { limit: RECENT_ORDERS_LIMIT, offset: 0 }, { isQuery: true }),
  ]);

  const PANELS = ["summary", "sales", "salesPrior", "revenue", "inventory", "orders"];
  const LABELS = {
    summary: "KPIs and top products",
    sales: "sales trend",
    salesPrior: "prior-period comparison",
    revenue: "revenue by category",
    inventory: "low stock",
    orders: "recent orders",
  };
  const failures = [];
  const value = {};
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") {
      value[PANELS[i]] = r.value;
    } else {
      value[PANELS[i]] = null;
      failures.push(LABELS[PANELS[i]]);
    }
  });
  if (failures.length === PANELS.length) {
    throw new Error(settled[0]?.reason?.message || "Failed to load the dashboard");
  }

  const summary = value.summary;
  const salesCur = value.sales;
  const salesPrev = value.salesPrior;
  const revenue = value.revenue;
  const inventory = value.inventory;
  const ordersRes = value.orders;

  // ── Sales: 30d total (+ prior-period delta) and the last-7-days trend ──────
  const curRows = salesCur?.rows || [];
  const sales30 = sumRevenue(curRows);
  const salesPrior30 = salesPrev ? sumRevenue(salesPrev.rows) : null;
  const salesDelta = salesPrior30 != null ? pctDelta(sales30, salesPrior30) : null;

  // Zero-fill the last 7 CALENDAR days. The resolver GROUP BYs on bucket, so
  // days with no orders are absent from curRows — slicing rows would grab the
  // last 7 days-that-had-sales (a much wider calendar span). Index by bucket and
  // map every one of the 7 day keys, defaulting a missing day to 0.
  const byBucket = new Map((curRows || []).map((r) => [r.bucket, num(r.placed_revenue)]));
  const last7 = lastNDayKeys(7).map((key) => ({ day: shortDay(key), value: byBucket.get(key) || 0 }));
  const sales7Total = last7.reduce((s, r) => s + r.value, 0);

  // ── KPIs. delta === 0 renders flat (no arrow); we pass 0 when there's no
  //    comparable base rather than a made-up percentage. ────────────────────
  const kpis = {
    totalSales: {
      value: sales30,
      delta: salesDelta ?? 0,
      period: "revenue · last 30 days",
    },
    activeOrders: {
      value: num(summary?.active_orders),
      delta: 0,
      period: "currently in pipeline",
    },
    newCustomers: {
      value: num(summary?.new_customers_30d),
      delta: 0,
      period: "new sign-ups · last 30 days",
    },
    lowStock: {
      value: num(summary?.low_stock_count),
      delta: 0,
      period: "variants under threshold",
    },
  };

  // ── Top products (from the summary aggregate) ─────────────────────────────
  const topProducts = (summary?.top_products || []).map((p, i) => ({
    id: `${p.product_name}-${i}`,
    name: p.product_name,
    units: num(p.units_sold),
    revenue: num(p.revenue),
  }));

  // ── Low stock (variant list) ──────────────────────────────────────────────
  const lowStock = (inventory?.low_stock || []).map((v) => ({
    id: v.variant_id,
    product: v.product_name,
    variant: `${v.size_name || "—"} / ${v.color_name || "—"}`,
    qty: num(v.quantity),
    threshold: num(v.low_stock_threshold),
  }));

  // ── Recent orders ─────────────────────────────────────────────────────────
  const recentOrders = (ordersRes?.items || []).map((o) => {
    const row = mapAdminOrderRow(o);
    return {
      id: row.orderNumber,
      numericId: row.id,
      customer: row.customer?.name || row.customer?.email || "—",
      total: row.total,
      status: row.status, // display key (drives StatusBadge tone)
      statusLabel: statusLabel(row.status),
      placed: row.placed,
    };
  });

  return {
    kpis,
    sales: { last7, total7: sales7Total, total30: sales30 },
    donut: revenue?.donut || [],
    topProducts,
    lowStock,
    recentOrders,
    // Which panels couldn't be loaded this time (empty when all six answered).
    // The view renders this as a banner above the still-usable page.
    failures,
  };
}

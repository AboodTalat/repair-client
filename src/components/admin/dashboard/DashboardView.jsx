"use client";

import { useEffect, useState } from "react";
import KpiCard from "@/components/admin/shared/KpiCard";
import Button from "@/components/admin/shared/Button";
import RecentOrdersTable from "@/components/admin/dashboard/RecentOrdersTable";
import { LineChart, Donut } from "@/components/admin/shared/Charts";
import {
  IconCart,
  IconUsers,
  IconBox,
  IconAlert,
  IconDownload,
} from "@/components/admin/shared/Icons";
import { formatCurrency, formatNumber } from "@/lib/mockAdmin";
import { downloadCsv } from "@/lib/adminReports";
import { fetchDashboardData } from "@/lib/adminDashboard";

// Admin dashboard — WIRED TO BACKEND (adminDashboard.js → reports.ts /
// orders.ts resolvers). Fetches one batch on mount, renders KPIs + a 7-day
// sales trend + revenue-share donut + recent orders + top products + low stock.
// Every figure is live; nothing is mock. Loading / error / empty states mirror
// the wired ReportsView pattern.

// Refresh spinner icon (inline — the shared Icons set has no refresh glyph).
function IconRefresh() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-full">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" strokeLinecap="round" />
      <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Loading() {
  return (
    <div className="grid place-items-center rounded-[4px] border border-[#e5e7eb] bg-white px-6 py-24">
      <div className="flex flex-col items-center gap-3">
        <span className="size-7 animate-spin rounded-full border-2 border-[#e5e7eb] border-t-[#1d4ed8]" />
        <span className="font-body text-[12px] text-[#6b7280]">Loading dashboard…</span>
      </div>
    </div>
  );
}

function ErrorBox({ message, onRetry }) {
  return (
    <div className="grid place-items-center rounded-[4px] border border-[#fecaca] bg-[#fef2f2] px-6 py-20">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="grid size-8 place-items-center text-[#dc2626]">
          <IconAlert />
        </span>
        <p className="max-w-md font-body text-[13px] text-[#991b1b]">{message}</p>
        {onRetry ? (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function EmptyNote({ children }) {
  return (
    <div className="grid place-items-center rounded-[4px] border border-dashed border-[#e5e7eb] px-6 py-10">
      <p className="font-body text-[12px] text-[#6b7280]">{children}</p>
    </div>
  );
}

export default function DashboardView() {
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    let cancelled = false;
    // setState inside the async fn (not the effect body) — same shape as the
    // other wired admin managers to avoid react-hooks/set-state-in-effect.
    async function run() {
      setState({ loading: true, error: null, data: null });
      try {
        const data = await fetchDashboardData();
        if (!cancelled) setState({ loading: false, error: null, data });
      } catch (err) {
        if (!cancelled) {
          setState({ loading: false, error: err?.message || "Failed to load the dashboard", data: null });
        }
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const reload = () => setNonce((n) => n + 1);
  const { loading, error, data } = state;

  const toolbar = (
    <>
      <Button variant="secondary" icon={<IconRefresh />} onClick={reload} disabled={loading}>
        Refresh
      </Button>
      <Button
        variant="secondary"
        icon={<IconDownload />}
        disabled={loading || !data || data.recentOrders.length === 0}
        onClick={() =>
          downloadCsv(
            `dashboard-recent-orders-${new Date().toISOString().slice(0, 10)}.csv`,
            [
              { key: "id", label: "Order" },
              { key: "customer", label: "Customer" },
              { key: "total", label: "Total (JOD)" },
              { key: "statusLabel", label: "Status" },
              { key: "placed", label: "Placed" },
            ],
            data?.recentOrders || []
          )
        }
      >
        Export
      </Button>
    </>
  );

  return (
    <>
      <div className="mb-4 flex items-center justify-end gap-2">{toolbar}</div>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : (
        <DashboardBody data={data} onRetry={reload} />
      )}
    </>
  );
}

// Some panels loaded, some didn't. Naming the missing ones beats silently
// rendering them empty — an empty "Recent orders" that actually failed to load
// reads as "no orders", which is a different and much worse message.
function PartialNotice({ failures, onRetry }) {
  if (!failures || failures.length === 0) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[4px] border border-[#fde68a] bg-[#fffbeb] px-4 py-3">
      <span className="grid size-4 shrink-0 place-items-center text-[#b45309]">
        <IconAlert />
      </span>
      <p className="flex-1 font-body text-[12px] text-[#92400e]">
        Couldn&apos;t load {failures.join(", ")}. Everything else on this page is up to date.
      </p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

function DashboardBody({ data, onRetry }) {
  const { kpis, sales, donut, topProducts, lowStock, recentOrders, failures } = data;

  return (
    <>
      <PartialNotice failures={failures} onRetry={onRetry} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total Sales"
          value={formatCurrency(kpis.totalSales.value)}
          delta={kpis.totalSales.delta}
          period={kpis.totalSales.period}
          icon={<IconCart />}
          accent="#1d4ed8"
        />
        <KpiCard
          label="Active Orders"
          value={formatNumber(kpis.activeOrders.value)}
          delta={kpis.activeOrders.delta}
          period={kpis.activeOrders.period}
          icon={<IconBox />}
          accent="#f59e0b"
        />
        <KpiCard
          label="New Customers"
          value={formatNumber(kpis.newCustomers.value)}
          delta={kpis.newCustomers.delta}
          period={kpis.newCustomers.period}
          icon={<IconUsers />}
          accent="#16a34a"
        />
        <KpiCard
          label="Low Stock Alerts"
          value={formatNumber(kpis.lowStock.value)}
          delta={kpis.lowStock.delta}
          period={kpis.lowStock.period}
          icon={<IconAlert />}
          accent="#dc2626"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-6 sm:gap-4 xl:grid-cols-3">
        <section className="min-w-0 rounded-[4px] border border-[#e5e7eb] bg-white p-4 sm:p-5 xl:col-span-2">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <h2 className="font-display text-[13px] font-bold uppercase tracking-[1.4px] text-[#11191f] sm:text-[14px]">
                Sales — last 7 days
              </h2>
              <p className="font-body text-[12px] text-[#6b7280]">
                Daily revenue (placed orders, excludes cancelled/returned).
              </p>
            </div>
            <span className="shrink-0 font-display text-[18px] font-bold text-[#11191f] sm:text-[20px]">
              {formatCurrency(sales.total7)}
            </span>
          </div>
          {sales.last7.length ? (
            <LineChart data={sales.last7} height={240} color="#1d4ed8" />
          ) : (
            <EmptyNote>No sales in the last 7 days.</EmptyNote>
          )}
        </section>

        <section className="min-w-0 rounded-[4px] border border-[#e5e7eb] bg-white p-4 sm:p-5">
          <div className="mb-4">
            <h2 className="font-display text-[13px] font-bold uppercase tracking-[1.4px] text-[#11191f] sm:text-[14px]">
              Revenue by category
            </h2>
            <p className="font-body text-[12px] text-[#6b7280]">
              Share of revenue per major (last 30 days).
            </p>
          </div>
          {donut.length ? (
            <Donut data={donut} size={180} label="JOD" />
          ) : (
            <EmptyNote>No revenue in the last 30 days.</EmptyNote>
          )}
        </section>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-6 sm:gap-4 xl:grid-cols-3">
        <section className="min-w-0 rounded-[4px] border border-[#e5e7eb] bg-white p-4 sm:p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-[13px] font-bold uppercase tracking-[1.4px] text-[#11191f] sm:text-[14px]">
              Recent orders
            </h2>
            <a
              href="/r3pr-console/orders"
              className="shrink-0 font-body text-[12px] font-medium text-[#1d4ed8] hover:underline"
            >
              View all
            </a>
          </div>
          {recentOrders.length ? (
            <RecentOrdersTable rows={recentOrders} />
          ) : (
            <EmptyNote>No orders yet.</EmptyNote>
          )}
        </section>

        <section className="flex min-w-0 flex-col gap-3 sm:gap-4">
          <div className="rounded-[4px] border border-[#e5e7eb] bg-white p-4 sm:p-5">
            {/* Period label is load-bearing: this list comes from
                myAppDashboardSummary, which has NO date filter, while every
                other panel here is 30-day scoped. Unlabelled, it read as a
                30-day ranking. */}
            <div className="mb-4">
              <h2 className="font-display text-[13px] font-bold uppercase tracking-[1.4px] text-[#11191f] sm:text-[14px]">
                Top-selling products
              </h2>
              <p className="font-body text-[12px] text-[#6b7280]">
                All-time units sold (fulfilled orders).
              </p>
            </div>
            {topProducts.length ? (
              <ul className="flex flex-col gap-3">
                {topProducts.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-[2px] bg-[#f3f4f6] font-display text-[11px] font-bold text-[#11191f]">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-body text-[13px] font-medium text-[#11191f]">
                        {p.name}
                      </p>
                      <p className="truncate font-body text-[11px] text-[#6b7280]">
                        {formatNumber(p.units)} units · {formatCurrency(p.revenue)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyNote>No sales data yet.</EmptyNote>
            )}
          </div>

          <div className="rounded-[4px] border border-[#fecaca] bg-[#fef2f2] p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="grid size-5 place-items-center text-[#dc2626]">
                <IconAlert />
              </span>
              <h2 className="font-display text-[13px] font-bold uppercase tracking-[1.4px] text-[#991b1b]">
                Low stock
              </h2>
            </div>
            {lowStock.length ? (
              <ul className="flex flex-col gap-2">
                {lowStock.slice(0, 5).map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-2 rounded-[2px] bg-white px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-body text-[12px] font-medium text-[#11191f]">
                        {row.product}
                      </p>
                      <p className="truncate font-body text-[11px] text-[#6b7280]">{row.variant}</p>
                    </div>
                    <span className="shrink-0 font-display text-[12px] font-bold text-[#dc2626]">
                      {row.qty} / {row.threshold}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-body text-[12px] text-[#166534]">All variants are above their thresholds.</p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

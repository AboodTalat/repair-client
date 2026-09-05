"use client";

import { useEffect, useState } from "react";
import Button from "@/components/admin/shared/Button";
import DataTable from "@/components/admin/shared/DataTable";
import { DateInput } from "@/components/admin/shared/Form";
import { LineChart, BarChart, Donut } from "@/components/admin/shared/Charts";
import {
  IconDownload,
  IconArrowUp,
  IconArrowDown,
  IconCalendar,
} from "@/components/admin/shared/Icons";
import {
  fetchFinanceOverview,
  aggregate,
  pctDelta,
  rollupBy,
  formatCurrency,
  formatNumber,
  downloadCsv,
} from "@/lib/finance";
import { todayISO, daysAgoISO, startOfYearISO } from "@/lib/adminDates";

// Accountant Financial Overview — WIRED TO BACKEND (myAppFinanceDailySeries /
// DiscountByCode / RevenueByProduct + myAppReportRevenueByCategory). Date range
// drives the fetch; prior-period deltas are real (the resolver returns
// index-paired prev* columns per day). Export is client-side CSV (no PDF, no
// server pipeline) — same posture as the admin Reports page.

// ── Date presets (today-relative) ───────────────────────────────────────────
// Local-calendar dates, NOT `toISOString().slice(0,10)` — revenue is bucketed
// on the database's clock (local), so a UTC-derived preset dropped the current
// day's takings between 00:00 and 03:00. See lib/adminDates.js.
const PRESETS = [
  { label: "7D", from: () => daysAgoISO(6), to: todayISO },
  { label: "30D", from: () => daysAgoISO(29), to: todayISO },
  { label: "90D", from: () => daysAgoISO(89), to: todayISO },
  { label: "YTD", from: startOfYearISO, to: todayISO },
];

const BREAKDOWN_TABS = [
  { key: "category", label: "By category" },
  { key: "product", label: "By product" },
  { key: "time", label: "By time period" },
];

function shortMoney(v) {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v));
}

// ── Async data hook (cancelled-flag only; setState inside the called fn) ─────
function useFinanceData(from, to) {
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setState({ loading: true, error: null, data: null });
      try {
        const data = await fetchFinanceOverview({ from, to });
        if (!cancelled) setState({ loading: false, error: null, data });
      } catch (err) {
        if (!cancelled) setState({ loading: false, error: err?.message || "Couldn't load the ledger.", data: null });
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [from, to, nonce]);

  return { ...state, reload: () => setNonce((n) => n + 1) };
}

// ── Shared primitives ─────────────────────────────────────────────────────────
function KpiCard({ label, value, delta, hint, accent = "#1d4ed8" }) {
  const positive = delta != null && delta > 0;
  const neutral = delta == null || delta === 0;
  const deltaColor = neutral ? "#9ca3af" : positive ? "#16a34a" : "#dc2626";
  return (
    <div className="relative flex flex-col gap-2 overflow-hidden rounded-[4px] border border-[#e5e7eb] bg-white p-5">
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: accent }} />
      <span className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">{label}</span>
      <span className="font-display font-bold leading-none text-[#11191f]" style={{ fontSize: "clamp(20px, 4.2vw, 28px)" }}>
        {value}
      </span>
      {delta != null ? (
        <span className="flex flex-wrap items-center gap-1 font-body text-[11px]" style={{ color: deltaColor }}>
          {!neutral ? <span className="grid size-3 place-items-center">{positive ? <IconArrowUp /> : <IconArrowDown />}</span> : null}
          {neutral ? "—" : `${Math.abs(delta).toFixed(1)}%`}
          {hint ? <span className="ml-1 text-[#9ca3af]">{hint}</span> : null}
        </span>
      ) : hint ? (
        <span className="font-body text-[11px] text-[#6b7280]">{hint}</span>
      ) : null}
    </div>
  );
}

function ReportCard({ title, subtitle, action, children, padding = "p-5" }) {
  return (
    <section className={`rounded-[4px] border border-[#e5e7eb] bg-white ${padding}`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-[13px] font-bold uppercase tracking-[1.4px] text-[#11191f]">{title}</h2>
          {subtitle ? <p className="mt-0.5 font-body text-[12px] text-[#6b7280]">{subtitle}</p> : null}
        </div>
        {action ?? null}
      </div>
      {children}
    </section>
  );
}

function EmptyChart({ message }) {
  return (
    <div className="grid h-[200px] place-items-center rounded-[2px] border border-dashed border-[#e5e7eb] bg-[#fafafa] font-body text-[12px] text-[#9ca3af]">
      {message}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function FinanceOverview() {
  const [preset, setPreset] = useState("30D");
  const [from, setFrom] = useState(daysAgoISO(29));
  const [to, setTo] = useState(todayISO());
  const [compare, setCompare] = useState(true);
  const [tab, setTab] = useState("category");
  const [granularity, setGranularity] = useState("week");

  const { loading, error, data, reload } = useFinanceData(from, to);

  function applyPreset(p) {
    setPreset(p.label);
    setFrom(p.from());
    setTo(p.to());
  }
  function handleFromChange(e) { setPreset(""); setFrom(e.target.value); }
  function handleToChange(e) { setPreset(""); setTo(e.target.value); }

  const rangeInvalid = from && to && from > to;
  const series = data?.series || [];
  const totals = aggregate(series);
  const aov = totals.orders ? totals.revenue / totals.orders : 0;
  const aovPrev = totals.prevOrders ? totals.prevRevenue / totals.prevOrders : 0;
  const aovDelta = aovPrev ? pctDelta(aov, aovPrev) : null;

  const lineSeries = compare
    ? [
        { key: "revenue", color: "#1d4ed8", name: "This period" },
        { key: "prevRevenue", color: "#d1d5db", name: "Prior period" },
      ]
    : [{ key: "revenue", color: "#1d4ed8", name: "" }];

  const rangeLabel = `${from} → ${to} · ${series.length} ${series.length === 1 ? "day" : "days"}`;

  function handleExportCsv() {
    if (!series.length) return;
    downloadCsv(
      `finance-overview-${from}_${to}.csv`,
      [
        { key: "day", label: "Date" },
        { key: "revenue", label: "Revenue (JOD)" },
        { key: "orders", label: "Orders" },
        { key: "discount", label: "Discount (JOD)" },
        { key: "net", label: "Net (JOD)" },
      ],
      series
    );
  }

  return (
    <>
      {/* ── Filter bar ─────────────────────────────────────────── */}
      <div className="mb-5 rounded-[4px] border border-[#e5e7eb] bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="mr-1 grid size-4 place-items-center text-[#6b7280]"><IconCalendar /></span>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p)}
              className="rounded-[2px] border px-3 py-1 font-body text-[12px] font-medium transition-colors"
              style={
                preset === p.label
                  ? { borderColor: "#1d4ed8", backgroundColor: "#eff6ff", color: "#1d4ed8" }
                  : { borderColor: "#e5e7eb", backgroundColor: "#fff", color: "#6b7280" }
              }
            >
              {p.label}
            </button>
          ))}
          <span className="h-5 w-px bg-[#e5e7eb]" />
          <span className="font-body text-[11px] text-[#9ca3af]">Custom range</span>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex flex-1 flex-wrap gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">From</span>
              <DateInput value={from} max={to || undefined} onChange={handleFromChange} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">To</span>
              <DateInput value={to} min={from || undefined} max={todayISO()} onChange={handleToChange} />
            </label>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button variant="secondary" icon={<IconDownload />} disabled={!series.length} onClick={handleExportCsv}>
              Export CSV
            </Button>
          </div>
        </div>

        <p className="mt-3 font-body text-[11px] text-[#9ca3af]">{rangeLabel}</p>
      </div>

      {rangeInvalid ? (
        <EmptyChart message="“From” is after “To” — adjust the range." />
      ) : loading ? (
        <div className="grid place-items-center rounded-[4px] border border-[#e5e7eb] bg-white px-6 py-20">
          <span className="size-7 animate-spin rounded-full border-2 border-[#e5e7eb] border-t-[#1d4ed8]" />
        </div>
      ) : error ? (
        <div className="grid place-items-center rounded-[4px] border border-[#fecaca] bg-[#fef2f2] px-6 py-16">
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="max-w-md font-body text-[13px] text-[#991b1b]">{error}</p>
            <Button variant="secondary" size="sm" onClick={reload}>Retry</Button>
          </div>
        </div>
      ) : (
        <>
          {/* ── KPI row ──────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard label="Total revenue" value={formatCurrency(totals.revenue)} delta={pctDelta(totals.revenue, totals.prevRevenue)} hint="vs prior period" accent="#1d4ed8" />
            <KpiCard label="Total orders" value={formatNumber(totals.orders)} delta={pctDelta(totals.orders, totals.prevOrders)} hint="vs prior period" accent="#0ea5e9" />
            <KpiCard label="Discount impact" value={formatCurrency(totals.discount)} delta={pctDelta(totals.discount, totals.prevDiscount)} hint="redeemed value" accent="#a855f7" />
            <KpiCard label="Avg. order value" value={formatCurrency(aov)} delta={aovDelta} hint="vs prior period" accent="#f59e0b" />
            <KpiCard label="Net revenue" value={formatCurrency(totals.net)} delta={pctDelta(totals.net, totals.prevNet)} hint="after discounts" accent="#16a34a" />
          </div>

          {/* ── Revenue over time ────────────────────────────────── */}
          <div className="mt-4">
            <ReportCard
              title="Revenue over time"
              subtitle={`Daily gross revenue · ${rangeLabel}`}
              action={
                <button
                  type="button"
                  onClick={() => setCompare((v) => !v)}
                  className="shrink-0 rounded-[2px] border px-3 py-1.5 font-body text-[11px] font-medium transition-colors"
                  style={
                    compare
                      ? { borderColor: "#1d4ed8", backgroundColor: "#eff6ff", color: "#1d4ed8" }
                      : { borderColor: "#e5e7eb", backgroundColor: "#fff", color: "#6b7280" }
                  }
                >
                  Compare
                </button>
              }
            >
              {series.length ? (
                <LineChart data={series} series={lineSeries} height={280} yFormatter={shortMoney} />
              ) : (
                <EmptyChart message="No revenue in this date range." />
              )}
            </ReportCard>
          </div>

          {/* ── Breakdown tabs ───────────────────────────────────── */}
          <div className="mt-6 overflow-x-auto border-b border-[#e5e7eb]">
            <nav className="-mb-px flex gap-1">
              {BREAKDOWN_TABS.map((t) => {
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className="shrink-0 border-b-2 px-4 pb-3 pt-1 font-body text-[13px] font-medium transition-colors"
                    style={{ borderBottomColor: active ? "#1d4ed8" : "transparent", color: active ? "#1d4ed8" : "#6b7280" }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mt-4">
            {tab === "category" ? <CategoryBreakdown categories={data.revenueByCategory} /> : null}
            {tab === "product" ? <ProductBreakdown products={data.revenueByProduct} /> : null}
            {tab === "time" ? (
              <TimeBreakdown rows={series} granularity={granularity} onGranularityChange={setGranularity} rangeLabel={rangeLabel} />
            ) : null}
          </div>

          {/* ── Discount impact by code ──────────────────────────── */}
          <div className="mt-4">
            <ReportCard title="Discount impact by code" subtitle="Redemptions and JOD value applied — sorted by impact.">
              <DataTable
                columns={[
                  { key: "code", label: "Code", render: (r) => <span className="font-display text-[12px] font-bold tracking-[1px] text-[#11191f]">{r.code}</span> },
                  { key: "type", label: "Value" },
                  { key: "redemptions", label: "Redemptions", align: "right", render: (r) => formatNumber(r.redemptions) },
                  { key: "impact", label: "Impact", align: "right", render: (r) => <span className="font-display font-semibold text-[#11191f]">{formatCurrency(r.impact)}</span> },
                  {
                    key: "active",
                    label: "Status",
                    render: (r) => (
                      <span className="inline-block rounded-full px-2 py-0.5 font-body text-[11px] font-medium" style={r.active ? { backgroundColor: "#dcfce7", color: "#166534" } : { backgroundColor: "#f3f4f6", color: "#6b7280" }}>
                        {r.active ? "Active" : "Inactive"}
                      </span>
                    ),
                  },
                ]}
                rows={data.discountByCode}
                empty={<p className="font-body text-[13px] text-[#6b7280]">No promo codes in this range.</p>}
              />
            </ReportCard>
          </div>
        </>
      )}
    </>
  );
}

// ── Breakdown panels ─────────────────────────────────────────────────────────
function CategoryBreakdown({ categories }) {
  const total = categories.reduce((s, d) => s + d.value, 0);
  if (!categories.length) return <EmptyChart message="No category revenue in this range." />;
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div className="xl:col-span-2">
        <ReportCard title="Revenue by category" subtitle="JOD — horizontal for easy comparison.">
          <BarChart data={categories} horizontal height={280} yFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        </ReportCard>
      </div>
      <ReportCard title="Revenue share" subtitle="Proportion of total revenue.">
        <Donut data={categories} size={180} label="JOD" />
        <ul className="mt-4 flex flex-col gap-2">
          {categories.map((r) => {
            const pct = total ? (r.value / total) * 100 : 0;
            return (
              <li key={r.label} className="flex items-center gap-2 font-body text-[12px]">
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />
                <span className="flex-1 truncate text-[#11191f]">{r.label}</span>
                <span className="tabular-nums text-[#6b7280]">{pct.toFixed(1)}%</span>
                <span className="tabular-nums font-semibold text-[#11191f]">{formatCurrency(r.value)}</span>
              </li>
            );
          })}
        </ul>
      </ReportCard>
    </div>
  );
}

function ProductBreakdown({ products }) {
  const total = products.reduce((s, p) => s + p.revenue, 0);
  return (
    <ReportCard title="Revenue by product" subtitle="Ranked by gross revenue — top sellers first.">
      <DataTable
        columns={[
          { key: "rank", label: "#", width: "48px", render: (r) => <span className="grid size-6 place-items-center rounded-[2px] bg-[#f3f4f6] font-display text-[10px] font-bold text-[#11191f]">{(r._idx ?? 0) + 1}</span> },
          { key: "name", label: "Product", render: (r) => <span className="font-body text-[13px] text-[#11191f]">{r.name}</span> },
          { key: "units", label: "Units sold", align: "right", render: (r) => formatNumber(r.units) },
          { key: "revenue", label: "Revenue", align: "right", render: (r) => <span className="font-display font-semibold text-[#11191f]">{formatCurrency(r.revenue)}</span> },
          {
            key: "share",
            label: "Share",
            align: "right",
            render: (r) => {
              const pct = total ? (r.revenue / total) * 100 : 0;
              return (
                <div className="flex items-center justify-end gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#f3f4f6]">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: "#1d4ed8" }} />
                  </div>
                  <span className="font-body text-[12px] tabular-nums text-[#6b7280]">{pct.toFixed(1)}%</span>
                </div>
              );
            },
          },
        ]}
        rows={products.map((r, i) => ({ ...r, _idx: i }))}
        empty={<p className="font-body text-[13px] text-[#6b7280]">No product revenue in this range.</p>}
      />
    </ReportCard>
  );
}

function TimeBreakdown({ rows, granularity, onGranularityChange, rangeLabel }) {
  const buckets = rollupBy(rows, granularity);
  return (
    <ReportCard
      title="Revenue by time period"
      subtitle={`${rangeLabel} · grouped by ${granularity}`}
      action={
        <div className="inline-flex shrink-0 overflow-hidden rounded-[2px] border border-[#e5e7eb]">
          {["day", "week", "month"].map((g) => {
            const active = granularity === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => onGranularityChange(g)}
                className="px-3 py-1.5 font-body text-[11px] font-medium uppercase tracking-[1px] transition-colors"
                style={active ? { backgroundColor: "#11191f", color: "#fff" } : { backgroundColor: "#fff", color: "#6b7280" }}
              >
                {g}
              </button>
            );
          })}
        </div>
      }
    >
      {buckets.length ? (
        <>
          <BarChart data={buckets.map((b) => ({ label: b.label, value: b.revenue }))} height={240} color="#1d4ed8" horizontal={buckets.length > 7} yFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
          <div className="mt-4">
            <DataTable
              columns={[
                { key: "label", label: granularity[0].toUpperCase() + granularity.slice(1) },
                { key: "orders", label: "Orders", align: "right", render: (r) => formatNumber(r.orders) },
                { key: "revenue", label: "Revenue", align: "right", render: (r) => formatCurrency(r.revenue) },
                { key: "discount", label: "Discount", align: "right", render: (r) => <span style={{ color: "#a855f7" }}>{formatCurrency(r.discount)}</span> },
                { key: "net", label: "Net", align: "right", render: (r) => <span className="font-display font-semibold text-[#11191f]">{formatCurrency(r.net)}</span> },
              ]}
              rows={buckets}
            />
          </div>
        </>
      ) : (
        <EmptyChart message="No revenue in this date range." />
      )}
    </ReportCard>
  );
}

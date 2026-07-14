"use client";

import { useEffect, useState } from "react";
import Button from "@/components/admin/shared/Button";
import DataTable from "@/components/admin/shared/DataTable";
import { DateInput } from "@/components/admin/shared/Form";
import { LineChart, BarChart, Donut } from "@/components/admin/shared/Charts";
import { IconDownload, IconArrowUp, IconArrowDown, IconAlert } from "@/components/admin/shared/Icons";
import { formatCurrency, formatNumber } from "@/lib/mockAdmin";
import {
  fetchSalesReport,
  fetchRevenueReport,
  fetchPromoReport,
  fetchInventoryReport,
  fetchDeliveryReport,
  fetchCustomerReport,
  fetchReturnsReport,
  downloadCsv,
} from "@/lib/adminReports";

// Admin Reports — WIRED TO BACKEND (reports.ts). Every tab fetches its own
// slice on demand from a read-only report resolver via repairCall; only
// metrics the backend actually returns are shown. Date range is sent inclusive
// of the full end day (adminReports.rangeInput). Sales + Customers show a real
// prior-period delta (a second resolver call against the preceding window).

// ── Date preset helpers ──────────────────────────────────────────────────────

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}
function isoMinus(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
function isoStartOfYear() {
  return `${new Date().getFullYear()}-01-01`;
}

const PRESETS = [
  { label: "7D", from: () => isoMinus(6), to: isoToday },
  { label: "30D", from: () => isoMinus(29), to: isoToday },
  { label: "90D", from: () => isoMinus(89), to: isoToday },
  { label: "YTD", from: isoStartOfYear, to: isoToday },
];

const TABS = [
  { key: "sales", label: "Sales" },
  { key: "revenue", label: "Revenue" },
  { key: "promo", label: "Promo usage" },
  { key: "inventory", label: "Inventory" },
  { key: "customers", label: "Customers" },
  { key: "delivery", label: "Delivery" },
  { key: "returns", label: "Returns" },
];

// ── Async data hook ────────────────────────────────────────────────────────
// Uses ONLY a `cancelled` flag (no run-once ref) — the documented Strict-Mode
// pattern. Double-mount fires two reads; the first is ignored, the second
// resolves. `reload` bumps a nonce to retry after an error.
function useReportData(fetcher, deps) {
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    let cancelled = false;
    // setState lives inside the called function (not the effect body) so the
    // synchronous loading flip doesn't trip react-hooks/set-state-in-effect —
    // same shape as the other wired admin managers (e.g. StockAlertManager).
    async function run() {
      setState({ loading: true, error: null, data: null });
      try {
        const data = await fetcher();
        if (!cancelled) setState({ loading: false, error: null, data });
      } catch (err) {
        if (!cancelled) setState({ loading: false, error: err?.message || "Failed to load report", data: null });
      }
    }
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { ...state, reload: () => setNonce((n) => n + 1) };
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function MetricStat({ label, value, delta, hint }) {
  const positive = delta > 0;
  const neutral = delta == null || delta === 0;
  const deltaColor = neutral ? "#9ca3af" : positive ? "#16a34a" : "#dc2626";

  return (
    <div className="flex flex-col gap-1.5 rounded-[4px] border border-[#e5e7eb] bg-white p-4">
      <span className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">{label}</span>
      {/* Responsive + wrap: large currency values (e.g. "JOD 1,234,567.00")
          must not overflow the card in the 2-col mobile grid. Scale the size up
          with the viewport and allow wrapping instead of clipping digits. */}
      <span className="font-display text-[18px] font-bold leading-tight text-[#11191f] break-words sm:text-[20px] lg:text-[22px]">{value}</span>
      {delta != null ? (
        <span className="flex items-center gap-1 font-body text-[11px]" style={{ color: deltaColor }}>
          {!neutral ? (
            <span className="grid size-3 place-items-center">
              {positive ? <IconArrowUp /> : <IconArrowDown />}
            </span>
          ) : null}
          {neutral ? "—" : `${Math.abs(delta).toFixed(1)}%`}
          {hint ? <span className="ml-1 text-[#9ca3af]">{hint}</span> : null}
        </span>
      ) : hint ? (
        <span className="font-body text-[11px] text-[#6b7280]">{hint}</span>
      ) : null}
    </div>
  );
}

function ReportCard({ title, subtitle, action, children }) {
  return (
    <section className="rounded-[4px] border border-[#e5e7eb] bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-[13px] font-bold uppercase tracking-[1.4px] text-[#11191f]">{title}</h2>
          {subtitle ? <p className="mt-0.5 font-body text-[12px] text-[#6b7280]">{subtitle}</p> : null}
        </div>
        {action ?? null}
      </div>
      {children}
    </section>
  );
}

function Loading({ label = "Loading report…" }) {
  return (
    <div className="grid place-items-center rounded-[4px] border border-[#e5e7eb] bg-white px-6 py-20">
      <div className="flex flex-col items-center gap-3">
        <span className="size-7 animate-spin rounded-full border-2 border-[#e5e7eb] border-t-[#1d4ed8]" />
        <span className="font-body text-[12px] text-[#6b7280]">{label}</span>
      </div>
    </div>
  );
}

function ErrorBox({ message, onRetry }) {
  return (
    <div className="grid place-items-center rounded-[4px] border border-[#fecaca] bg-[#fef2f2] px-6 py-16">
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

function EmptyNote({ children = "No data for the selected range." }) {
  return (
    <div className="grid place-items-center rounded-[4px] border border-dashed border-[#e5e7eb] bg-white px-6 py-12">
      <p className="font-body text-[13px] text-[#6b7280]">{children}</p>
    </div>
  );
}

function ExportCsvButton({ filename, headers, rows }) {
  const disabled = !rows || rows.length === 0;
  return (
    <Button
      variant="secondary"
      size="sm"
      icon={<IconDownload />}
      disabled={disabled}
      onClick={() => downloadCsv(filename, headers, rows)}
    >
      Export CSV
    </Button>
  );
}

// Currency formatter for chart Y axes (short JOD).
function shortMoney(v) {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v));
}

// ── Root component ────────────────────────────────────────────────────────────

export default function ReportsView() {
  const [tab, setTab] = useState("sales");
  const [preset, setPreset] = useState("30D");
  const [from, setFrom] = useState(isoMinus(29));
  const [to, setTo] = useState(isoToday());

  function applyPreset(p) {
    setPreset(p.label);
    setFrom(p.from());
    setTo(p.to());
  }
  function handleFromChange(e) {
    setPreset("");
    setFrom(e.target.value);
  }
  function handleToChange(e) {
    setPreset("");
    setTo(e.target.value);
  }

  const rangeInvalid = from && to && from > to;

  return (
    <>
      {/* ── Filter bar ─────────────────────────────────────────── */}
      <div className="mb-5 rounded-[4px] border border-[#e5e7eb] bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
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
              <DateInput value={to} min={from || undefined} max={isoToday()} onChange={handleToChange} />
            </label>
          </div>
        </div>
        {rangeInvalid ? (
          <p className="mt-3 font-body text-[12px] text-[#dc2626]">“From” is after “To” — adjust the range.</p>
        ) : null}
      </div>

      {/* ── Tab bar ────────────────────────────────────────────── */}
      <div className="mb-5 overflow-x-auto border-b border-[#e5e7eb]">
        <nav className="-mb-px flex gap-1">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className="shrink-0 border-b-2 px-4 pb-3 pt-1 font-body text-[13px] font-medium transition-colors"
                style={{
                  borderBottomColor: active ? "#1d4ed8" : "transparent",
                  color: active ? "#1d4ed8" : "#6b7280",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Tab content ───────────────────────────────────────── */}
      {rangeInvalid ? (
        <EmptyNote>Fix the date range to see results.</EmptyNote>
      ) : (
        <>
          {tab === "sales" ? <SalesReport from={from} to={to} /> : null}
          {tab === "revenue" ? <RevenueReport from={from} to={to} /> : null}
          {tab === "promo" ? <PromoReport from={from} to={to} /> : null}
          {tab === "inventory" ? <InventoryReport /> : null}
          {tab === "customers" ? <CustomerReport from={from} to={to} /> : null}
          {tab === "delivery" ? <DeliveryReport from={from} to={to} /> : null}
          {tab === "returns" ? <ReturnsReport from={from} to={to} /> : null}
        </>
      )}
    </>
  );
}

// ── Sales ─────────────────────────────────────────────────────────────────────

function SalesReport({ from, to }) {
  const { loading, error, data, reload } = useReportData(() => fetchSalesReport({ from, to }), [from, to]);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const t = data.totals;
  const d = data.deltas;
  const csvRows = data.series.map((s) => ({ bucket: s.label, revenue: s.value, orders: s.orders }));

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricStat label="Total sales" value={formatCurrency(t.sales)} delta={d.sales} hint="vs prior period" />
        <MetricStat label="Orders" value={formatNumber(t.orders)} delta={d.orders} hint="vs prior period" />
        <MetricStat label="Avg. order value" value={formatCurrency(t.aov)} delta={d.aov} hint="vs prior period" />
        <MetricStat label="Fulfilled revenue" value={formatCurrency(t.fulfilled)} delta={null} hint="past pending" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ReportCard
            title="Sales over time"
            subtitle={`Placed revenue by ${data.groupBy} · ${from} → ${to}`}
            action={
              <ExportCsvButton
                filename={`sales_${from}_${to}.csv`}
                headers={[
                  { key: "bucket", label: "Period" },
                  { key: "revenue", label: "Revenue (JOD)" },
                  { key: "orders", label: "Orders" },
                ]}
                rows={csvRows}
              />
            }
          >
            {data.series.length ? (
              <LineChart data={data.series} height={260} color="#1d4ed8" yFormatter={shortMoney} />
            ) : (
              <EmptyNote />
            )}
          </ReportCard>
        </div>

        <ReportCard title="Top products" subtitle="All-time · by units (fulfilled orders)">
          {data.topProducts.length ? (
            <ul className="flex flex-col gap-3">
              {data.topProducts.map((p, i) => (
                <li key={p.name + i} className="flex items-center gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-[2px] bg-[#f3f4f6] font-display text-[10px] font-bold text-[#11191f]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-body text-[13px] text-[#11191f]">{p.name}</p>
                    <p className="font-body text-[11px] text-[#6b7280]">{formatNumber(p.units)} units</p>
                  </div>
                  <span className="shrink-0 font-display text-[12px] font-semibold text-[#11191f]">
                    {formatCurrency(p.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote>No sales yet.</EmptyNote>
          )}
        </ReportCard>
      </div>
    </>
  );
}

// ── Revenue ───────────────────────────────────────────────────────────────────

function RevenueReport({ from, to }) {
  const { loading, error, data, reload } = useReportData(() => fetchRevenueReport({ from, to }), [from, to]);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const t = data.totals;
  const avgPerCat = t.categories > 0 ? t.gross / t.categories : 0;
  const hasData = data.rows.length > 0;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricStat label="Gross revenue" value={formatCurrency(t.gross)} delta={null} hint="in selected range" />
        <MetricStat label="Units sold" value={formatNumber(t.units)} delta={null} hint="in selected range" />
        <MetricStat label="Categories" value={formatNumber(t.categories)} delta={null} hint="with sales" />
        <MetricStat label="Avg. per category" value={formatCurrency(avgPerCat)} delta={null} hint="gross ÷ categories" />
      </div>

      {hasData ? (
        <>
          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <ReportCard title="Revenue by category" subtitle="Top placements by gross revenue (JOD).">
                <BarChart data={data.bars} horizontal height={260} yFormatter={shortMoney} />
              </ReportCard>
            </div>
            <ReportCard title="Revenue share" subtitle="By major category.">
              <Donut data={data.donut} size={180} label="JOD" />
            </ReportCard>
          </div>

          <div className="mt-4">
            <ReportCard
              title="Category breakdown"
              subtitle="Every placement with sales in range."
              action={
                <ExportCsvButton
                  filename={`revenue_by_category_${from}_${to}.csv`}
                  headers={[
                    { key: "label", label: "Category" },
                    { key: "units", label: "Units sold" },
                    { key: "revenue", label: "Revenue (JOD)" },
                  ]}
                  rows={data.rows}
                />
              }
            >
              <DataTable
                columns={[
                  { key: "label", label: "Category" },
                  { key: "units", label: "Units", align: "right", render: (r) => formatNumber(r.units) },
                  { key: "revenue", label: "Revenue", align: "right", render: (r) => formatCurrency(r.revenue) },
                ]}
                rows={data.rows}
              />
            </ReportCard>
          </div>
        </>
      ) : (
        <div className="mt-4">
          <EmptyNote />
        </div>
      )}
    </>
  );
}

// ── Promo usage ───────────────────────────────────────────────────────────────

function PromoReport({ from, to }) {
  const { loading, error, data, reload } = useReportData(() => fetchPromoReport({ from, to }), [from, to]);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const t = data.totals;
  const csvRows = data.rows.map((r) => ({
    code: r.code,
    value: r.discount_type === "percentage" ? `${r.discount_value}%` : formatCurrency(r.discount_value),
    redemptions: r.orders_using,
    discount_given: r.total_discount_given,
    all_time_uses: r.used_count,
    expires: r.expires_at ? new Date(r.expires_at).toISOString().slice(0, 10) : "Never",
    status: r.is_active ? "Active" : "Inactive",
  }));

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricStat label="Active codes" value={String(t.activeCodes)} delta={null} hint={`of ${t.totalCodes} total`} />
        <MetricStat label="Redemptions" value={formatNumber(t.redemptions)} delta={null} hint="in selected range" />
        <MetricStat label="Discount given" value={formatCurrency(t.discountGiven)} delta={null} hint="promo value applied" />
        <MetricStat label="Avg. discount" value={formatCurrency(t.avgDiscount)} delta={null} hint="per redemption" />
      </div>

      <div className="mt-4">
        <ReportCard
          title="Code usage"
          subtitle="Redemptions and discount given in range; all-time uses + status."
          action={
            <ExportCsvButton
              filename={`promo_usage_${from}_${to}.csv`}
              headers={[
                { key: "code", label: "Code" },
                { key: "value", label: "Value" },
                { key: "redemptions", label: "Redemptions" },
                { key: "discount_given", label: "Discount given (JOD)" },
                { key: "all_time_uses", label: "All-time uses" },
                { key: "expires", label: "Expires" },
                { key: "status", label: "Status" },
              ]}
              rows={csvRows}
            />
          }
        >
          <DataTable
            columns={[
              {
                key: "code",
                label: "Code",
                render: (r) => (
                  <span className="font-display text-[12px] font-bold tracking-[1px] text-[#11191f]">{r.code}</span>
                ),
              },
              {
                key: "value",
                label: "Value",
                render: (r) =>
                  r.discount_type === "percentage" ? `${r.discount_value}% off` : `${formatCurrency(r.discount_value)} off`,
              },
              { key: "orders_using", label: "Redemptions", align: "right", render: (r) => formatNumber(r.orders_using) },
              {
                key: "total_discount_given",
                label: "Discount given",
                align: "right",
                render: (r) => formatCurrency(r.total_discount_given),
              },
              { key: "used_count", label: "All-time", align: "right", render: (r) => formatNumber(r.used_count) },
              {
                key: "expires_at",
                label: "Expires",
                render: (r) => (r.expires_at ? new Date(r.expires_at).toLocaleDateString("en-CA") : "Never"),
              },
              {
                key: "is_active",
                label: "Status",
                render: (r) => (
                  <span
                    className="inline-block rounded-full px-2 py-0.5 font-body text-[11px] font-medium"
                    style={r.is_active ? { backgroundColor: "#dcfce7", color: "#166534" } : { backgroundColor: "#f3f4f6", color: "#6b7280" }}
                  >
                    {r.is_active ? "Active" : "Inactive"}
                  </span>
                ),
              },
            ]}
            rows={data.rows}
            empty={<p className="font-body text-[13px] text-[#6b7280]">No promo codes yet.</p>}
          />
        </ReportCard>
      </div>
    </>
  );
}

// ── Inventory ─────────────────────────────────────────────────────────────────

const INVENTORY_PAGE_SIZE = 50;

function InventoryReport() {
  const [offset, setOffset] = useState(0);
  const { loading, error, data, reload } = useReportData(
    () => fetchInventoryReport({ limit: INVENTORY_PAGE_SIZE, offset }),
    [offset]
  );

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const t = data.totals;
  const total = data.total;
  const start = total === 0 ? 0 : data.offset + 1;
  const end = Math.min(data.offset + data.limit, total);
  const canPrev = data.offset > 0;
  const canNext = data.offset + data.limit < total;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricStat label="Total SKUs" value={formatNumber(t.variants)} delta={null} hint="all variants" />
        <MetricStat label="In stock" value={formatNumber(t.inStock)} delta={null} hint="above threshold" />
        <MetricStat label="Low stock" value={formatNumber(t.lowStock)} delta={null} hint="at / below threshold" />
        <MetricStat label="Out of stock" value={formatNumber(t.outOfStock)} delta={null} hint="zero quantity" />
      </div>

      <div className="mt-4">
        <ReportCard
          title="Low-stock variants"
          subtitle={total > 0 ? `Showing ${start}–${end} of ${formatNumber(total)} below threshold (lowest first).` : "Variants at or below their low-stock threshold."}
          action={
            <ExportCsvButton
              filename={`inventory_low_stock_p${data.offset / data.limit + 1}.csv`}
              headers={[
                { key: "product_name", label: "Product" },
                { key: "color_name", label: "Color" },
                { key: "size_name", label: "Size" },
                { key: "quantity", label: "Qty" },
                { key: "low_stock_threshold", label: "Threshold" },
              ]}
              rows={data.rows}
            />
          }
        >
          <DataTable
            columns={[
              { key: "product_name", label: "Product" },
              { key: "color_name", label: "Color" },
              { key: "size_name", label: "Size" },
              {
                key: "quantity",
                label: "Qty",
                align: "right",
                render: (r) => (
                  <span
                    className="font-display text-[12px] font-bold"
                    style={{ color: r.quantity === 0 ? "#dc2626" : "#f59e0b" }}
                  >
                    {r.quantity}
                  </span>
                ),
              },
              { key: "low_stock_threshold", label: "Threshold", align: "right" },
            ]}
            rows={data.rows}
            empty={<p className="font-body text-[13px] text-[#6b7280]">No low-stock variants — inventory is healthy.</p>}
          />

          {total > data.limit ? (
            <div className="mt-4 flex items-center justify-between">
              <span className="font-body text-[12px] text-[#6b7280]">
                Page {Math.floor(data.offset / data.limit) + 1} of {Math.ceil(total / data.limit)}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!canPrev}
                  onClick={() => setOffset((o) => Math.max(0, o - INVENTORY_PAGE_SIZE))}
                >
                  Prev
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!canNext}
                  onClick={() => setOffset((o) => o + INVENTORY_PAGE_SIZE)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </ReportCard>
      </div>
    </>
  );
}

// ── Customers ─────────────────────────────────────────────────────────────────

function CustomerReport({ from, to }) {
  const { loading, error, data, reload } = useReportData(() => fetchCustomerReport({ from, to }), [from, to]);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const t = data.totals;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricStat label="New customers" value={formatNumber(t.newCustomers)} delta={data.deltas.newCustomers} hint="vs prior period" />
        <MetricStat label="Returning" value={formatNumber(t.returningCustomers)} delta={null} hint=">1 order in range" />
        <MetricStat label="Top spender" value={formatCurrency(t.topSpenderAmount)} delta={null} hint="in selected range" />
        <MetricStat label="Top spender orders" value={formatNumber(t.topSpenderOrders)} delta={null} hint="from top customer" />
      </div>

      <div className="mt-4">
        <ReportCard
          title="Top customers"
          subtitle="By spend in range (top 10)."
          action={
            <ExportCsvButton
              filename={`top_customers_${from}_${to}.csv`}
              headers={[
                { key: "email", label: "Customer" },
                { key: "orders", label: "Orders" },
                { key: "spent", label: "Spent (JOD)" },
              ]}
              rows={data.topCustomers}
            />
          }
        >
          <DataTable
            columns={[
              { key: "email", label: "Customer" },
              { key: "orders", label: "Orders", align: "right", render: (r) => formatNumber(r.orders) },
              { key: "spent", label: "Spent", align: "right", render: (r) => formatCurrency(r.spent) },
            ]}
            rows={data.topCustomers}
            empty={<p className="font-body text-[13px] text-[#6b7280]">No customer orders in this range.</p>}
          />
        </ReportCard>
      </div>
    </>
  );
}

// ── Delivery ──────────────────────────────────────────────────────────────────

function DeliveryReport({ from, to }) {
  const { loading, error, data, reload } = useReportData(() => fetchDeliveryReport({ from, to }), [from, to]);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const t = data.totals;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricStat label="Assigned" value={formatNumber(t.assigned)} delta={null} hint="orders in range" />
        <MetricStat label="Delivered" value={formatNumber(t.delivered)} delta={null} hint="completed" />
        <MetricStat label="Failed" value={formatNumber(t.failed)} delta={null} hint="failed delivery" />
        <MetricStat
          label="Success rate"
          value={t.successRate == null ? "—" : `${t.successRate}%`}
          delta={null}
          hint="delivered ÷ assigned"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ReportCard
            title="By delivery account"
            subtitle="Per-account outcomes in range."
            action={
              <ExportCsvButton
                filename={`delivery_performance_${from}_${to}.csv`}
                headers={[
                  { key: "email", label: "Account" },
                  { key: "assigned", label: "Assigned" },
                  { key: "delivered", label: "Delivered" },
                  { key: "failed", label: "Failed" },
                  { key: "success_rate", label: "Success rate (%)" },
                ]}
                rows={data.rows}
              />
            }
          >
            <DataTable
              columns={[
                { key: "email", label: "Account" },
                { key: "assigned", label: "Assigned", align: "right", render: (r) => formatNumber(r.assigned) },
                { key: "delivered", label: "Delivered", align: "right", render: (r) => formatNumber(r.delivered) },
                { key: "failed", label: "Failed", align: "right", render: (r) => formatNumber(r.failed) },
                {
                  key: "success_rate",
                  label: "Success",
                  align: "right",
                  render: (r) => (r.success_rate == null ? "—" : `${r.success_rate}%`),
                },
              ]}
              rows={data.rows}
              empty={<p className="font-body text-[13px] text-[#6b7280]">No delivery accounts found.</p>}
            />
          </ReportCard>
        </div>
        <ReportCard title="Outcome split" subtitle="Across all accounts.">
          {data.donut.length ? <Donut data={data.donut} size={180} label="Orders" /> : <EmptyNote>No assigned orders in range.</EmptyNote>}
        </ReportCard>
      </div>
    </>
  );
}

// ── Returns ───────────────────────────────────────────────────────────────────

function ReturnsReport({ from, to }) {
  const { loading, error, data, reload } = useReportData(() => fetchReturnsReport({ from, to }), [from, to]);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const t = data.totals;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricStat label="Return rate" value={`${t.returnRate}%`} delta={null} hint="returned ÷ all orders" />
        <MetricStat label="Cancel rate" value={`${t.cancelRate}%`} delta={null} hint="cancelled ÷ all orders" />
        <MetricStat label="Returned" value={formatNumber(t.returned)} delta={null} hint="orders in range" />
        <MetricStat label="Cancelled" value={formatNumber(t.cancelled)} delta={null} hint="orders in range" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ReportCard title="Order outcomes" subtitle={`Based on ${formatNumber(t.totalOrders)} orders · ${formatNumber(t.refunded)} refunded.`}>
            {data.donut.length ? (
              <Donut data={data.donut} size={200} label="Orders" />
            ) : (
              <EmptyNote>No orders in this range.</EmptyNote>
            )}
          </ReportCard>
        </div>
        <ReportCard title="Summary" subtitle="Totals for the selected range.">
          <ul className="flex flex-col gap-3 font-body text-[13px] text-[#11191f]">
            <li className="flex items-center justify-between">
              <span className="text-[#6b7280]">Total orders</span>
              <span className="font-semibold">{formatNumber(t.totalOrders)}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-[#6b7280]">Delivered</span>
              <span className="font-semibold">{formatNumber(t.delivered)}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-[#6b7280]">Returned</span>
              <span className="font-semibold">{formatNumber(t.returned)}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-[#6b7280]">Cancelled</span>
              <span className="font-semibold">{formatNumber(t.cancelled)}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-[#6b7280]">Refunded (payment)</span>
              <span className="font-semibold">{formatNumber(t.refunded)}</span>
            </li>
          </ul>
        </ReportCard>
      </div>
    </>
  );
}

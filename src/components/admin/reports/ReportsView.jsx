"use client";

import { useState } from "react";
import Button from "@/components/admin/shared/Button";
import DataTable from "@/components/admin/shared/DataTable";
import { DateInput, Select } from "@/components/admin/shared/Form";
import { LineChart, BarChart, Donut } from "@/components/admin/shared/Charts";
import {
  IconDownload,
  IconArrowUp,
  IconArrowDown,
} from "@/components/admin/shared/Icons";
import {
  SALES_BY_DAY,
  SALES_SERIES_30,
  SIGNUPS_SERIES_30,
  REVENUE_BY_CATEGORY,
  TOP_PRODUCTS,
  PROMO_CODES,
  formatCurrency,
  formatNumber,
} from "@/lib/mockAdmin";

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
  { label: "7D",  from: () => isoMinus(6),    to: isoToday },
  { label: "30D", from: () => isoMinus(29),   to: isoToday },
  { label: "90D", from: () => isoMinus(89),   to: isoToday },
  { label: "YTD", from: isoStartOfYear,       to: isoToday },
];

// ── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { key: "sales",     label: "Sales" },
  { key: "revenue",   label: "Revenue" },
  { key: "promo",     label: "Promo usage" },
  { key: "inventory", label: "Inventory" },
  { key: "customers", label: "Customers" },
  { key: "delivery",  label: "Delivery" },
  { key: "returns",   label: "Returns" },
];

// ── Shared primitives ─────────────────────────────────────────────────────────

function MetricStat({ label, value, delta, hint }) {
  const positive = delta > 0;
  const neutral  = delta == null || delta === 0;
  const deltaColor = neutral ? "#9ca3af" : positive ? "#16a34a" : "#dc2626";

  return (
    <div className="flex flex-col gap-1.5 rounded-[4px] border border-[#e5e7eb] bg-white p-4">
      <span className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
        {label}
      </span>
      <span className="font-display text-[22px] font-bold leading-none text-[#11191f]">
        {value}
      </span>
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
          <h2 className="font-display text-[13px] font-bold uppercase tracking-[1.4px] text-[#11191f]">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 font-body text-[12px] text-[#6b7280]">{subtitle}</p>
          ) : null}
        </div>
        {action ?? null}
      </div>
      {children}
    </section>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export default function ReportsView() {
  const [tab,      setTab]      = useState("sales");
  const [preset,   setPreset]   = useState("30D");
  const [from,     setFrom]     = useState(isoMinus(29));
  const [to,       setTo]       = useState(isoToday());
  const [category, setCategory] = useState("");

  function applyPreset(p) {
    setPreset(p.label);
    setFrom(p.from());
    setTo(p.to());
  }
  function handleFromChange(e) { setPreset(""); setFrom(e.target.value); }
  function handleToChange(e)   { setPreset(""); setTo(e.target.value); }

  return (
    <>
      {/* ── Filter bar ─────────────────────────────────────────── */}
      <div className="mb-5 rounded-[4px] border border-[#e5e7eb] bg-white p-4">
        {/* Presets row */}
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

        {/* Date inputs + category + export */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex flex-1 flex-wrap gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                From
              </span>
              <DateInput value={from} onChange={handleFromChange} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                To
              </span>
              <DateInput value={to} onChange={handleToChange} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                Category
              </span>
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={[
                  { value: "",       label: "All categories" },
                  { value: "women",  label: "Women" },
                  { value: "men",    label: "Men" },
                  { value: "kids",   label: "Kids" },
                  { value: "sale",   label: "Sale" },
                ]}
              />
            </label>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="secondary" icon={<IconDownload />}>Export PDF</Button>
            <Button variant="secondary" icon={<IconDownload />}>Export CSV</Button>
          </div>
        </div>
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
      {tab === "sales"     ? <SalesReport     from={from} to={to} /> : null}
      {tab === "revenue"   ? <RevenueReport   /> : null}
      {tab === "promo"     ? <PromoReport     /> : null}
      {tab === "inventory" ? <InventoryReport /> : null}
      {tab === "customers" ? <CustomerReport  /> : null}
      {tab === "delivery"  ? <DeliveryReport  /> : null}
      {tab === "returns"   ? <ReturnsReport   /> : null}
    </>
  );
}

// ── Sales ─────────────────────────────────────────────────────────────────────

function SalesReport({ from, to }) {
  const [compare, setCompare] = useState(true);

  const total     = SALES_SERIES_30.reduce((s, d) => s + d.current, 0);
  const totalPrev = SALES_SERIES_30.reduce((s, d) => s + d.prev, 0);
  const delta     = +((((total - totalPrev) / totalPrev) * 100).toFixed(1));
  const avgOrder  = total / 214;

  const chartSeries = compare
    ? [
        { key: "current", color: "#1d4ed8", name: "This period" },
        { key: "prev",    color: "#d1d5db", name: "Prior period" },
      ]
    : [{ key: "current", color: "#1d4ed8", name: "" }];

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricStat label="Total sales"      value={formatCurrency(total)}     delta={delta}  hint="vs prior period" />
        <MetricStat label="Orders"           value={formatNumber(214)}         delta={7.2}    hint="vs prior period" />
        <MetricStat label="Avg. order value" value={formatCurrency(avgOrder)}  delta={3.1}    hint="vs prior period" />
        <MetricStat label="Refunds"          value={formatCurrency(1240)}      delta={-1.4}   hint="vs prior period" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ReportCard
            title="Daily sales"
            subtitle={`Revenue by day · ${from} → ${to}`}
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
            <LineChart
              data={SALES_SERIES_30}
              series={chartSeries}
              height={260}
              yFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
            />
          </ReportCard>
        </div>

        <ReportCard title="Top products" subtitle="By revenue this period.">
          <ul className="flex flex-col gap-3">
            {TOP_PRODUCTS.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3">
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
        </ReportCard>
      </div>
    </>
  );
}

// ── Revenue ───────────────────────────────────────────────────────────────────

function RevenueReport() {
  const total = REVENUE_BY_CATEGORY.reduce((s, d) => s + d.value, 0);
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricStat label="Gross revenue"  value={formatCurrency(total)}       delta={12.4} hint="vs prior period" />
        <MetricStat label="Net revenue"    value={formatCurrency(total * 0.84)} delta={11.1} hint="after discounts" />
        <MetricStat label="Discount cost"  value={formatCurrency(total * 0.16)} delta={4.3}  hint="vs prior period" />
        <MetricStat label="Avg. margin"    value="38.2%"                        delta={1.8}  hint="vs prior period" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ReportCard title="Revenue by category" subtitle="JOD — horizontal for easy comparison.">
            <BarChart
              data={REVENUE_BY_CATEGORY}
              horizontal
              height={260}
              yFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
          </ReportCard>
        </div>
        <ReportCard title="Revenue share" subtitle="Proportion of total revenue.">
          <Donut data={REVENUE_BY_CATEGORY} size={180} label="JOD" />
        </ReportCard>
      </div>
    </>
  );
}

// ── Promo usage ───────────────────────────────────────────────────────────────

function UsageBar({ used, limit }) {
  const pct = limit ? Math.min((used / limit) * 100, 100) : 100;
  const critical = limit && pct >= 90;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#f3f4f6]">
        <div
          className="h-full rounded-full transition-[width]"
          style={{
            width: `${pct}%`,
            backgroundColor: critical ? "#dc2626" : "#1d4ed8",
          }}
        />
      </div>
      <span className="font-body text-[12px] tabular-nums text-[#6b7280]">
        {used}{limit ? ` / ${limit}` : ""}
      </span>
    </div>
  );
}

function PromoReport() {
  const totalRedemptions = PROMO_CODES.reduce((s, p) => s + p.used, 0);
  const activeCount      = PROMO_CODES.filter((p) => p.active).length;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricStat label="Active codes"   value={String(activeCount)}       delta={null} hint={`of ${PROMO_CODES.length} total`} />
        <MetricStat label="Redemptions"    value={formatNumber(totalRedemptions)} delta={22.4} hint="vs prior period" />
        <MetricStat label="Revenue impact" value={formatCurrency(8_420)}     delta={18.6} hint="discount value applied" />
        <MetricStat label="Avg. discount"  value={formatCurrency(8_420 / totalRedemptions)} delta={null} hint="per order" />
      </div>

      <div className="mt-4">
        <ReportCard title="Code usage" subtitle="Redemptions, limits, and expiry.">
          <DataTable
            columns={[
              {
                key: "code",
                label: "Code",
                render: (r) => (
                  <span className="font-display text-[12px] font-bold tracking-[1px] text-[#11191f]">
                    {r.code}
                  </span>
                ),
              },
              {
                key: "type",
                label: "Value",
                render: (r) =>
                  r.type === "percentage"
                    ? `${r.amount}% off`
                    : `${formatCurrency(r.amount)} off`,
              },
              {
                key: "used",
                label: "Usage",
                render: (r) => <UsageBar used={r.used} limit={r.usageLimit} />,
              },
              {
                key: "minOrder",
                label: "Min order",
                align: "right",
                render: (r) => formatCurrency(r.minOrder),
              },
              { key: "expires", label: "Expires" },
              {
                key: "active",
                label: "Status",
                render: (r) => (
                  <span
                    className="inline-block rounded-full px-2 py-0.5 font-body text-[11px] font-medium"
                    style={
                      r.active
                        ? { backgroundColor: "#dcfce7", color: "#166534" }
                        : { backgroundColor: "#f3f4f6", color: "#6b7280" }
                    }
                  >
                    {r.active ? "Active" : "Expired"}
                  </span>
                ),
              },
            ]}
            rows={PROMO_CODES}
          />
        </ReportCard>
      </div>
    </>
  );
}

// ── Inventory ─────────────────────────────────────────────────────────────────

const STOCK_BY_CATEGORY = [
  { label: "T-Shirts",     value: 920, color: "#0ea5e9" },
  { label: "Accessories",  value: 640, color: "#a855f7" },
  { label: "Hoodies",      value: 480, color: "#1d4ed8" },
  { label: "Shorts",       value: 310, color: "#10b981" },
  { label: "Joggers",      value: 220, color: "#f59e0b" },
];

function InventoryReport() {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricStat label="Total SKUs"    value="186"  delta={null} hint="active variants" />
        <MetricStat label="In stock"      value="148"  delta={2.1}  hint="vs prior period" />
        <MetricStat label="Low stock"     value="14"   delta={-5.3} hint="below threshold" />
        <MetricStat label="Out of stock"  value="24"   delta={-8.0} hint="vs prior period" />
      </div>

      <div className="mt-4">
        <ReportCard
          title="Stock by category"
          subtitle="Active units per major category — horizontal for easy scanning."
        >
          <BarChart
            data={STOCK_BY_CATEGORY}
            horizontal
            height={240}
            yFormatter={(v) => String(v)}
          />
        </ReportCard>
      </div>
    </>
  );
}

// ── Customers ─────────────────────────────────────────────────────────────────

function CustomerReport() {
  const [compare, setCompare] = useState(true);

  const totalNew  = SIGNUPS_SERIES_30.reduce((s, d) => s + d.current, 0);
  const totalPrev = SIGNUPS_SERIES_30.reduce((s, d) => s + d.prev, 0);
  const delta = +((((totalNew - totalPrev) / totalPrev) * 100).toFixed(1));

  const chartSeries = compare
    ? [
        { key: "current", color: "#16a34a", name: "This period" },
        { key: "prev",    color: "#d1d5db", name: "Prior period" },
      ]
    : [{ key: "current", color: "#16a34a", name: "" }];

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricStat label="Total customers"  value="1,842"                  delta={null} hint="all time" />
        <MetricStat label="New this period"  value={formatNumber(totalNew)} delta={delta} hint="vs prior period" />
        <MetricStat label="Repeat rate"      value="38%"                    delta={2.1}  hint="vs prior period" />
        <MetricStat label="Avg. LTV"         value={formatCurrency(184.5)}  delta={5.6}  hint="lifetime value" />
      </div>

      <div className="mt-4">
        <ReportCard
          title="New sign-ups"
          subtitle="Daily new customer registrations."
          action={
            <button
              type="button"
              onClick={() => setCompare((v) => !v)}
              className="shrink-0 rounded-[2px] border px-3 py-1.5 font-body text-[11px] font-medium transition-colors"
              style={
                compare
                  ? { borderColor: "#16a34a", backgroundColor: "#f0fdf4", color: "#16a34a" }
                  : { borderColor: "#e5e7eb", backgroundColor: "#fff", color: "#6b7280" }
              }
            >
              Compare
            </button>
          }
        >
          <LineChart
            data={SIGNUPS_SERIES_30}
            series={chartSeries}
            height={240}
            yFormatter={(v) => String(v)}
          />
        </ReportCard>
      </div>
    </>
  );
}

// ── Delivery ──────────────────────────────────────────────────────────────────

const DELIVERY_BY_DAY = SALES_SERIES_30.map((d) => ({
  label: d.day,
  value: Math.round(d.current / 220),
}));

function DeliveryReport() {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricStat label="Avg. dispatch"     value="6h 14m" delta={-4.2} hint="vs prior period" />
        <MetricStat label="On-time delivery"  value="94%"    delta={1.1}  hint="vs prior period" />
        <MetricStat label="Failed deliveries" value="3"      delta={-25}  hint="last 30 days" />
        <MetricStat label="Active drivers"    value="8"      delta={null} hint="assigned accounts" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ReportCard
            title="Daily deliveries"
            subtitle="Completed deliveries per day — 30-day window."
          >
            <BarChart
              data={DELIVERY_BY_DAY}
              height={240}
              color="#1d4ed8"
              yFormatter={(v) => String(v)}
            />
          </ReportCard>
        </div>
        <ReportCard title="Delivery status split" subtitle="Distribution of outcomes.">
          <Donut
            data={[
              { label: "Delivered",    value: 186, color: "#16a34a" },
              { label: "Failed",       value: 3,   color: "#dc2626" },
              { label: "Returned",     value: 5,   color: "#a855f7" },
              { label: "In transit",   value: 12,  color: "#f59e0b" },
            ]}
            size={180}
            label="Orders"
          />
        </ReportCard>
      </div>
    </>
  );
}

// ── Returns ───────────────────────────────────────────────────────────────────

function ReturnsReport() {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricStat label="Return rate"     value="2.4%"               delta={-0.3} hint="vs prior period" />
        <MetricStat label="Total returns"   value="14"                 delta={-12}  hint="last 30 days" />
        <MetricStat label="Refunded"        value={formatCurrency(1240)} delta={-8.1} hint="vs prior period" />
        <MetricStat label="Pending review"  value="3"                  delta={null} hint="awaiting action" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ReportCard title="Return reasons" subtitle="Breakdown by reported reason.">
            <BarChart
              data={[
                { label: "Wrong size",    value: 6, color: "#1d4ed8" },
                { label: "Changed mind",  value: 4, color: "#f59e0b" },
                { label: "Quality issue", value: 3, color: "#dc2626" },
                { label: "Damaged",       value: 1, color: "#a855f7" },
              ]}
              horizontal
              height={200}
              yFormatter={(v) => String(v)}
            />
          </ReportCard>
        </div>
        <ReportCard title="Reason share" subtitle="Distribution.">
          <Donut
            data={[
              { label: "Wrong size",    value: 6, color: "#1d4ed8" },
              { label: "Changed mind",  value: 4, color: "#f59e0b" },
              { label: "Quality issue", value: 3, color: "#dc2626" },
              { label: "Damaged",       value: 1, color: "#a855f7" },
            ]}
            size={180}
            label="Returns"
          />
        </ReportCard>
      </div>
    </>
  );
}

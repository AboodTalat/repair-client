"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DELIVERY_FILTERS,
  deliveryCounts,
  deliveryItemsSummary,
  deliveryStatusLabel,
  deliveryTone,
  fetchDeliveryOrders,
  filterDeliveries,
  formatJOD,
  paymentInfo,
} from "@/lib/delivery";
import { IconSearch } from "@/components/admin/shared/Icons";

function StatPill({ tone, label, value, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex min-w-[160px] flex-1 items-center gap-3 rounded-[4px] border bg-white px-4 py-3 text-left transition-colors " +
        (active ? "border-[#11191f] shadow-sm" : "border-[#e5e7eb] hover:border-[#cbd5e1]")
      }
    >
      <span
        className="grid size-9 shrink-0 place-items-center rounded-[2px] font-display text-[14px] font-bold"
        style={{ backgroundColor: tone.bg, color: tone.fg }}
      >
        {value}
      </span>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="font-body text-[10px] font-semibold uppercase tracking-[1.2px] text-[#6b7280]">
          {label}
        </span>
        <span className="font-body text-[11px] text-[#11191f]">
          {active ? "Filtering" : "Tap to filter"}
        </span>
      </div>
    </button>
  );
}

function StatusBadge({ status }) {
  const tone = deliveryTone(status);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-body text-[10px] font-semibold uppercase tracking-[1px]"
      style={{ backgroundColor: tone.bg, color: tone.fg }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: tone.dot }} />
      {deliveryStatusLabel(status)}
    </span>
  );
}

function PaymentBadge({ order }) {
  const p = paymentInfo(order);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-body text-[10px] font-semibold uppercase tracking-[0.8px]"
      style={{ backgroundColor: p.tone.bg, color: p.tone.fg }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: p.tone.dot }} />
      {p.label}
    </span>
  );
}

function actionLabel(status) {
  if (status === "dispatched") return "Start";
  if (status === "out_for_delivery") return "Update";
  return "Open";
}

export default function DeliveryDashboard() {
  const router = useRouter();
  const [filter, setFilter] = useState("active");
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const { items } = await fetchDeliveryOrders();
        if (!cancelled) setOrders(items);
      } catch (err) {
        if (!cancelled) setError(err?.message || "Couldn't load your orders.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = deliveryCounts(orders);

  const filtered = filterDeliveries(orders, filter).filter((row) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      String(row.order_number || row.id).toLowerCase().includes(q) ||
      (row.customer?.name || "").toLowerCase().includes(q) ||
      (row.address || "").toLowerCase().includes(q)
    );
  });

  function toggleFilter(key) {
    setFilter((prev) => (prev === key ? "all" : key));
  }

  if (loading) {
    return (
      <div className="grid place-items-center rounded-[4px] border border-[#e5e7eb] bg-white px-6 py-20">
        <div className="flex flex-col items-center gap-3">
          <span className="size-7 animate-spin rounded-full border-2 border-[#e5e7eb] border-t-[#11191f]" />
          <span className="font-body text-[12px] text-[#6b7280]">Loading your orders…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid place-items-center rounded-[4px] border border-[#fecaca] bg-[#fef2f2] px-6 py-16">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="max-w-md font-body text-[13px] text-[#991b1b]">{error}</p>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="inline-flex h-9 items-center rounded-[2px] border border-[#e5e7eb] bg-white px-4 font-display text-[12px] font-semibold uppercase tracking-[1px] text-[#11191f] hover:bg-[#f3f4f6]"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* KPI / quick-filter row */}
      <div className="flex flex-wrap gap-3">
        <StatPill
          tone={deliveryTone("out_for_delivery")}
          label="To deliver"
          value={counts.active}
          active={filter === "active"}
          onClick={() => toggleFilter("active")}
        />
        <StatPill
          tone={deliveryTone("delivered")}
          label="Delivered"
          value={counts.delivered}
          active={filter === "delivered"}
          onClick={() => toggleFilter("delivered")}
        />
        <StatPill
          tone={deliveryTone("failed_delivery")}
          label="Failed"
          value={counts.failed_delivery}
          active={filter === "failed_delivery"}
          onClick={() => toggleFilter("failed_delivery")}
        />
      </div>

      {/* Search + filter chip row */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative max-w-md flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 grid size-4 -translate-y-1/2 place-items-center text-[#6b7280]">
            <IconSearch />
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order #, customer, address"
            className="h-10 w-full rounded-[2px] border border-[#e5e7eb] bg-white pl-9 pr-3 font-body text-[13px] text-[#11191f] outline-none placeholder:text-[#9ca3af] focus:border-[#11191f]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={
              "h-9 rounded-full px-3 font-body text-[11px] font-semibold uppercase tracking-[1px] transition-colors " +
              (filter === "all"
                ? "bg-[#11191f] text-white"
                : "border border-[#e5e7eb] bg-white text-[#11191f] hover:bg-[#f3f4f6]")
            }
          >
            All
            <span className="ml-1 opacity-70">({orders.length})</span>
          </button>
          {DELIVERY_FILTERS.map((f) => {
            const active = filter === f.key;
            const tone = deliveryTone(f.match[0]);
            const count = counts[f.key === "active" ? "active" : f.key] ?? 0;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={
                  "h-9 rounded-full px-3 font-body text-[11px] font-semibold uppercase tracking-[1px] transition-colors " +
                  (active
                    ? "text-white"
                    : "border border-[#e5e7eb] bg-white text-[#11191f] hover:bg-[#f3f4f6]")
                }
                style={active ? { backgroundColor: tone.fg } : undefined}
              >
                {f.label}
                <span className="ml-1 opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders list — table at md+, stacked cards on mobile */}
      <div className="hidden overflow-x-auto rounded-[4px] border border-[#e5e7eb] bg-white md:block">
        <table className="min-w-full border-collapse">
          <thead className="border-b border-[#e5e7eb] bg-[#fafafa]">
            <tr>
              <Th>Order</Th>
              <Th>Customer</Th>
              <Th>Address</Th>
              <Th>Items</Th>
              <Th align="right">Total</Th>
              <Th>Status</Th>
              <Th align="right">Action</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <p className="font-body text-[13px] text-[#6b7280]">
                    {orders.length === 0
                      ? "No orders are assigned to you yet."
                      : "No orders match the current filter."}
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-b border-[#f3f4f6] last:border-b-0 hover:bg-[#fafafa]"
                  onClick={() => router.push(`/r3pr-dispatch/orders/${row.id}`)}
                >
                  <Td>
                    <span className="font-display text-[12px] font-bold tracking-[0.6px] text-[#11191f]">
                      {row.order_number || `#${row.id}`}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5">
                      <PaymentBadge order={row} />
                      <span className="font-body text-[10px] uppercase tracking-[1px] text-[#6b7280]">
                        {row.is_cod ? "COD" : "Prepaid"}
                      </span>
                    </span>
                  </Td>
                  <Td>
                    <span className="block font-body text-[13px] font-medium text-[#11191f]">
                      {row.customer?.name}
                    </span>
                    <span className="block font-body text-[11px] text-[#6b7280]">
                      {row.customer?.phone || "—"}
                    </span>
                  </Td>
                  <Td>
                    <span className="block max-w-[260px] truncate font-body text-[13px] text-[#11191f]">
                      {row.address || "—"}
                    </span>
                  </Td>
                  <Td>
                    <span className="block font-body text-[13px] text-[#11191f]">
                      {deliveryItemsSummary(row)}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="font-body text-[13px] font-semibold tabular-nums text-[#11191f]">
                      {formatJOD(row.total)}
                    </span>
                    {row.is_cod && row.cod_amount > 0 ? (
                      <span className="block font-body text-[10px] uppercase tracking-[1px] text-[#b45309]">
                        Collect cash
                      </span>
                    ) : null}
                  </Td>
                  <Td>
                    <StatusBadge status={row.status} />
                  </Td>
                  <Td align="right">
                    <Link
                      href={`/r3pr-dispatch/orders/${row.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex h-8 items-center rounded-[2px] border border-[#e5e7eb] bg-white px-3 font-display text-[11px] font-semibold uppercase tracking-[1px] text-[#11191f] hover:bg-[#f3f4f6]"
                    >
                      {actionLabel(row.status)}
                    </Link>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="flex flex-col gap-3 md:hidden">
        {filtered.length === 0 ? (
          <div className="grid place-items-center rounded-[4px] border border-dashed border-[#e5e7eb] bg-white px-4 py-12">
            <p className="font-body text-[13px] text-[#6b7280]">
              {orders.length === 0
                ? "No orders are assigned to you yet."
                : "No orders match the current filter."}
            </p>
          </div>
        ) : (
          filtered.map((row) => (
            <Link
              key={row.id}
              href={`/r3pr-dispatch/orders/${row.id}`}
              className="flex flex-col gap-3 rounded-[4px] border border-[#e5e7eb] bg-white p-4 active:bg-[#fafafa]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="font-display text-[12px] font-bold tracking-[0.6px] text-[#11191f]">
                    {row.order_number || `#${row.id}`}
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <PaymentBadge order={row} />
                    <span className="font-body text-[10px] uppercase tracking-[1px] text-[#6b7280]">
                      {row.is_cod ? "COD" : "Prepaid"} · {formatJOD(row.total)}
                    </span>
                  </span>
                </div>
                <StatusBadge status={row.status} />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-body text-[13px] font-medium text-[#11191f]">
                  {row.customer?.name}
                </span>
                <span className="font-body text-[12px] text-[#6b7280]">
                  {row.customer?.phone || "—"}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 border-t border-[#f3f4f6] pt-2">
                <span className="font-body text-[12px] text-[#11191f]">
                  {row.address || "—"}
                </span>
                <span className="font-body text-[11px] text-[#6b7280]">
                  {deliveryItemsSummary(row)}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function Th({ children, align = "left" }) {
  return (
    <th
      className="px-4 py-3 font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]"
      style={{ textAlign: align }}
    >
      {children}
    </th>
  );
}

function Td({ children, align = "left" }) {
  return (
    <td
      className="px-4 py-3 align-top font-body text-[13px] text-[#11191f]"
      style={{ textAlign: align }}
    >
      {children}
    </td>
  );
}

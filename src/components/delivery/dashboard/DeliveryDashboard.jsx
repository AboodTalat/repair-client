"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ASSIGNED_ORDERS,
  DELIVERY_FILTERS,
  deliveryCounts,
  deliveryStatusLabel,
  deliveryTone,
  filterDeliveries,
  formatJOD,
  itemsSummary,
} from "@/lib/mockDelivery";
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
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: tone.dot }}
      />
      {deliveryStatusLabel(status)}
    </span>
  );
}

export default function DeliveryDashboard() {
  const router = useRouter();
  const [filter, setFilter] = useState("active");
  const [search, setSearch] = useState("");

  const counts = deliveryCounts(ASSIGNED_ORDERS);

  const filtered = filterDeliveries(ASSIGNED_ORDERS, filter).filter((row) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      row.id.toLowerCase().includes(q) ||
      row.customer.name.toLowerCase().includes(q) ||
      row.address.toLowerCase().includes(q)
    );
  });

  function toggleFilter(key) {
    setFilter((prev) => (prev === key ? "all" : key));
  }

  return (
    <div className="flex flex-col gap-6">
      {/* KPI / quick-filter row */}
      <div className="flex flex-wrap gap-3">
        <StatPill
          tone={deliveryTone("handed_to_delivery")}
          label="Out for Delivery"
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
            <span className="ml-1 opacity-70">({ASSIGNED_ORDERS.length})</span>
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
                    No orders match the current filter.
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
                      {row.id}
                    </span>
                    <span className="block font-body text-[10px] uppercase tracking-[1px] text-[#6b7280]">
                      {row.paymentMethod === "Cash on Delivery" ? "COD" : "Prepaid"}
                    </span>
                  </Td>
                  <Td>
                    <span className="block font-body text-[13px] font-medium text-[#11191f]">
                      {row.customer.name}
                    </span>
                    <span className="block font-body text-[11px] text-[#6b7280]">
                      {row.customer.phone}
                    </span>
                  </Td>
                  <Td>
                    <span className="block max-w-[260px] truncate font-body text-[13px] text-[#11191f]">
                      {row.address}
                    </span>
                    {row.addressNote ? (
                      <span className="block max-w-[260px] truncate font-body text-[11px] italic text-[#6b7280]">
                        {row.addressNote}
                      </span>
                    ) : null}
                  </Td>
                  <Td>
                    <span className="block font-body text-[13px] text-[#11191f]">
                      {itemsSummary(row.items)}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="font-body text-[13px] font-semibold tabular-nums text-[#11191f]">
                      {formatJOD(row.total)}
                    </span>
                    {row.paymentMethod === "Cash on Delivery" && row.codAmount > 0 ? (
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
                      {row.status === "handed_to_delivery" ? "Update" : "Open"}
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
              No orders match the current filter.
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
                <div className="flex flex-col">
                  <span className="font-display text-[12px] font-bold tracking-[0.6px] text-[#11191f]">
                    {row.id}
                  </span>
                  <span className="font-body text-[10px] uppercase tracking-[1px] text-[#6b7280]">
                    {row.paymentMethod === "Cash on Delivery" ? "COD" : "Prepaid"} ·{" "}
                    {formatJOD(row.total)}
                  </span>
                </div>
                <StatusBadge status={row.status} />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-body text-[13px] font-medium text-[#11191f]">
                  {row.customer.name}
                </span>
                <span className="font-body text-[12px] text-[#6b7280]">
                  {row.customer.phone}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 border-t border-[#f3f4f6] pt-2">
                <span className="font-body text-[12px] text-[#11191f]">
                  {row.address}
                </span>
                <span className="font-body text-[11px] text-[#6b7280]">
                  {itemsSummary(row.items)}
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

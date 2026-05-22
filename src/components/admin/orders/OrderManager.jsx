"use client";

import { useMemo, useState } from "react";
import Button from "@/components/admin/shared/Button";
import DataTable from "@/components/admin/shared/DataTable";
import Drawer from "@/components/admin/shared/Drawer";
import Modal from "@/components/admin/shared/Modal";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import { Chip, SearchInput } from "@/components/admin/shared/Form";
import { IconCheck, IconChevronDown, IconDownload } from "@/components/admin/shared/Icons";
import {
  ORDERS,
  ORDER_STATUSES,
  STATUS_TONE,
  formatCurrency,
} from "@/lib/mockAdmin";

const PIPELINE = ["processing", "prepared", "handed_to_delivery", "delivered"];
const PIPELINE_LABEL = {
  processing: "Processing",
  prepared: "Prepared",
  handed_to_delivery: "With Delivery",
  delivered: "Delivered",
};

function DeliveryFeeSettings() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("2.50");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function handleSave() {
    const val = parseFloat(input);
    if (isNaN(val) || val < 0) {
      setError("Enter a valid amount (0 or more).");
      return;
    }
    setError("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="mb-6 rounded-[4px] border border-[#e5e7eb] bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
          Settings
        </span>
        <span
          className="size-4 text-[#6b7280] transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <IconChevronDown />
        </span>
      </button>

      {open ? (
        <div className="border-t border-[#e5e7eb] px-4 pb-4 pt-4">
          <p className="mb-1 font-body text-[11px] font-medium uppercase tracking-[1px] text-[#11191f]">
            Delivery Fee
          </p>
          <p className="mb-3 font-body text-[12px] text-[#6b7280]">
            Applied to every order at checkout.
          </p>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-48 items-center rounded-[2px] border border-[#e5e7eb] bg-white transition-colors focus-within:border-[#11191f]">
              <span className="shrink-0 px-3 font-body text-[13px] text-[#6b7280]">JOD</span>
              <div className="h-4 w-px bg-[#e5e7eb]" />
              <input
                type="number"
                min="0"
                step="0.01"
                value={input}
                onChange={(e) => { setInput(e.target.value); setError(""); setSaved(false); }}
                className="h-full flex-1 bg-transparent px-3 font-body text-[14px] text-[#11191f] outline-none placeholder:text-[#9ca3af]"
                placeholder="0.00"
              />
            </div>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
            {saved ? (
              <span className="flex items-center gap-1 font-body text-[12px] text-[#16a34a]">
                <span
                  className="grid size-4 place-items-center rounded-full"
                  style={{ backgroundColor: "#16a34a" }}
                >
                  <IconCheck className="text-white" />
                </span>
                Saved
              </span>
            ) : null}
          </div>
          {error ? (
            <p className="mt-1.5 font-body text-[11px] text-[#dc2626]">{error}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function OrderManager() {
  const [orders, setOrders] = useState(ORDERS);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  const stats = useMemo(() => {
    const counts = { all: orders.length };
    ORDER_STATUSES.forEach((s) => (counts[s.key] = 0));
    orders.forEach((o) => (counts[o.status] = (counts[o.status] || 0) + 1));
    return counts;
  }, [orders]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (filter !== "all" && o.status !== filter) return false;
      if (query) {
        const q = query.toLowerCase();
        if (
          !o.id.toLowerCase().includes(q) &&
          !o.customer.name.toLowerCase().includes(q) &&
          !o.customer.email.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [orders, filter, query]);

  function updateStatus(orderId, next) {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        if (o.status === next) return o;
        return {
          ...o,
          status: next,
          history: [
            ...o.history,
            { at: new Date().toISOString().replace("T", " ").slice(0, 16), from: o.status, to: next, by: "admin@repair.app" },
          ],
        };
      })
    );
    if (selected?.id === orderId) {
      setSelected((s) =>
        s ? { ...s, status: next, history: [...s.history, { at: "now", from: s.status, to: next, by: "admin@repair.app" }] } : s
      );
    }
  }

  return (
    <>
      <DeliveryFeeSettings />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          All <span className="ml-1 text-[10px] opacity-70">{stats.all}</span>
        </Chip>
        {ORDER_STATUSES.map((s) => (
          <Chip key={s.key} active={filter === s.key} onClick={() => setFilter(s.key)}>
            {s.label} <span className="ml-1 text-[10px] opacity-70">{stats[s.key] || 0}</span>
          </Chip>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-[4px] border border-[#e5e7eb] bg-white p-4 md:flex-row md:items-end">
        <div className="flex-1">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search by order #, customer name, or email..."
          />
        </div>
        <Button variant="secondary" icon={<IconDownload />}>
          Export
        </Button>
      </div>

      <DataTable
        columns={[
          { key: "id", label: "Order #", render: (o) => <span className="font-body font-semibold">{o.id}</span> },
          {
            key: "customer",
            label: "Customer",
            render: (o) => (
              <div className="flex flex-col">
                <span className="font-body text-[13px] font-medium text-[#11191f]">
                  {o.customer.name}
                </span>
                <span className="font-body text-[11px] text-[#6b7280]">{o.customer.email}</span>
              </div>
            ),
          },
          {
            key: "items",
            label: "Items",
            render: (o) => `${o.items.reduce((s, i) => s + i.qty, 0)} × ${o.items.length}`,
          },
          {
            key: "total",
            label: "Total",
            align: "right",
            render: (o) => formatCurrency(o.total),
          },
          {
            key: "payment",
            label: "Payment",
            render: (o) => <StatusBadge status={o.payment} label={o.payment} dot={false} />,
          },
          {
            key: "status",
            label: "Status",
            render: (o) => <StatusBadge status={o.status} label={o.status} />,
          },
          { key: "placed", label: "Placed" },
        ]}
        rows={filtered}
        onRowClick={setSelected}
      />

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        width={680}
        title={selected ? `Order ${selected.id}` : ""}
        subtitle={selected ? `Placed ${selected.placed}` : ""}
        footer={
          selected ? (
            <>
              <Button variant="secondary" onClick={() => setSelected(null)}>
                Close
              </Button>
              <Button
                variant="dangerSolid"
                onClick={() => updateStatus(selected.id, "cancelled")}
                disabled={selected.status === "cancelled" || selected.status === "delivered"}
              >
                Cancel order
              </Button>
            </>
          ) : null
        }
      >
        {selected ? <OrderDetail order={selected} onUpdateStatus={(next) => updateStatus(selected.id, next)} /> : null}
      </Drawer>
    </>
  );
}

function OrderDetail({ order, onUpdateStatus }) {
  const [confirmNext, setConfirmNext] = useState(null);

  const currentIdx = PIPELINE.indexOf(order.status);
  const isCancelled = order.status === "cancelled" || order.status === "returned";
  const nextStep = !isCancelled && currentIdx >= 0 && currentIdx < PIPELINE.length - 1
    ? PIPELINE[currentIdx + 1]
    : null;

  function handleMarkAs(next) {
    if (next === "delivered") {
      setConfirmNext(next);
    } else {
      onUpdateStatus(next);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Modal
        open={!!confirmNext}
        onClose={() => setConfirmNext(null)}
        title="Confirm delivery"
        width={420}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmNext(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                onUpdateStatus(confirmNext);
                setConfirmNext(null);
              }}
            >
              Yes, mark as delivered
            </Button>
          </>
        }
      >
        <p className="font-body text-[14px] text-[#11191f]">
          Are you sure you want to mark order <strong>{order.id}</strong> as delivered?
        </p>
        <p className="mt-2 font-body text-[12px] text-[#6b7280]">
          This confirms the customer has received their order. This action cannot be undone from the admin panel.
        </p>
      </Modal>

      <section>
        <p className="mb-3 font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
          Pipeline
        </p>
        {isCancelled ? (
          <div className="rounded-[2px] border border-[#fecaca] bg-[#fef2f2] p-4">
            <StatusBadge status={order.status} label={order.status} />
            <p className="mt-2 font-body text-[12px] text-[#991b1b]">
              This order is terminal — no further status transitions possible from the admin.
            </p>
          </div>
        ) : (
          <ol className="flex items-center justify-between gap-2">
            {PIPELINE.map((step, i) => {
              const done = i <= currentIdx;
              const active = i === currentIdx;
              const tone = STATUS_TONE[step];
              return (
                <li key={step} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex w-full items-center">
                    <span
                      className="grid size-7 shrink-0 place-items-center rounded-full font-display text-[11px] font-bold transition-colors"
                      style={{
                        backgroundColor: done ? tone.dot : "#e5e7eb",
                        color: done ? "#fff" : "#6b7280",
                        outline: active ? `4px solid ${tone.dot}33` : "none",
                      }}
                    >
                      {done ? (
                        <span className="grid size-3 place-items-center">
                          <IconCheck />
                        </span>
                      ) : (
                        i + 1
                      )}
                    </span>
                    {i < PIPELINE.length - 1 ? (
                      <span
                        className="ml-1 h-0.5 flex-1 rounded-full"
                        style={{ backgroundColor: i < currentIdx ? tone.dot : "#e5e7eb" }}
                      />
                    ) : null}
                  </div>
                  <span className="font-body text-[10px] font-medium uppercase tracking-[0.8px] text-[#11191f]">
                    {PIPELINE_LABEL[step]}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        {nextStep ? (
          <div className="mt-4">
            <Button size="sm" onClick={() => handleMarkAs(nextStep)}>
              Mark as {PIPELINE_LABEL[nextStep]}
            </Button>
          </div>
        ) : null}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-[2px] border border-[#e5e7eb] bg-[#fafafa] p-4">
          <p className="mb-2 font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
            Customer
          </p>
          <p className="font-body text-[14px] font-semibold text-[#11191f]">{order.customer.name}</p>
          <p className="font-body text-[12px] text-[#6b7280]">{order.customer.email}</p>
          <p className="font-body text-[12px] text-[#6b7280]">{order.customer.phone}</p>
        </div>
        <div className="rounded-[2px] border border-[#e5e7eb] bg-[#fafafa] p-4">
          <p className="mb-2 font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
            Shipping address
          </p>
          <p className="font-body text-[13px] text-[#11191f]">{order.address}</p>
        </div>
      </section>

      <section>
        <p className="mb-2 font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
          Items
        </p>
        <div className="overflow-hidden rounded-[2px] border border-[#e5e7eb] bg-white">
          <table className="min-w-full">
            <thead className="bg-[#fafafa]">
              <tr>
                <th className="px-3 py-2 text-left font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                  Product
                </th>
                <th className="px-3 py-2 text-left font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                  Variant
                </th>
                <th className="px-3 py-2 text-right font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                  Qty
                </th>
                <th className="px-3 py-2 text-right font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                  Price
                </th>
                <th className="px-3 py-2 text-right font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it, i) => (
                <tr key={i} className="border-t border-[#f3f4f6]">
                  <td className="px-3 py-2 font-body text-[13px] text-[#11191f]">{it.product}</td>
                  <td className="px-3 py-2 font-body text-[12px] text-[#6b7280]">
                    {it.color} · {it.size}
                  </td>
                  <td className="px-3 py-2 text-right font-body text-[13px] text-[#11191f]">{it.qty}</td>
                  <td className="px-3 py-2 text-right font-body text-[13px] text-[#11191f]">
                    {formatCurrency(it.price)}
                  </td>
                  <td className="px-3 py-2 text-right font-body text-[13px] font-semibold text-[#11191f]">
                    {formatCurrency(it.price * it.qty)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-[#fafafa]">
              <tr>
                <td colSpan={4} className="px-3 py-2 text-right font-body text-[12px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                  Total
                </td>
                <td className="px-3 py-2 text-right font-display text-[15px] font-bold text-[#11191f]">
                  {formatCurrency(order.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section>
        <p className="mb-2 font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
          Activity log
        </p>
        <ul className="flex flex-col gap-2">
          {order.history.map((h, i) => (
            <li key={i} className="flex items-start gap-3 rounded-[2px] border border-[#e5e7eb] bg-white p-3">
              <span className="mt-1 size-2 rounded-full bg-[#1d4ed8]" />
              <div className="flex-1">
                <p className="font-body text-[13px] text-[#11191f]">
                  Status moved {h.from ? `from ${h.from} ` : ""}to <strong>{h.to}</strong>
                </p>
                <p className="font-body text-[11px] text-[#6b7280]">
                  {h.at} · {h.by}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/admin/shared/Button";
import DataTable from "@/components/admin/shared/DataTable";
import Drawer from "@/components/admin/shared/Drawer";
import Modal from "@/components/admin/shared/Modal";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import { Chip, SearchInput } from "@/components/admin/shared/Form";
import { IconCheck } from "@/components/admin/shared/Icons";
import { formatCurrency, STATUS_TONE } from "@/lib/mockAdmin";
import { repairCall } from "@/lib/repairAuthedApi";
import { useCommerceSettings } from "@/lib/useCommerceSettings";
import {
  ORDER_FILTER_CHIPS,
  DISPLAY_PIPELINE,
  PIPELINE_LABEL,
  chipCount,
  totalOrderCount,
  displayToRawStatus,
  rawToDisplayStatus,
  statusLabel,
  mapAdminOrderRow,
  mapDetailItems,
  mapDetailHistory,
  resolveShippingMethod,
  resolvePaymentLabel,
} from "@/lib/adminOrders";

const PAGE_SIZE = 25;

// Raw statuses an admin can still CANCEL from (canTransition in helpers.ts).
const CANCELLABLE_RAW = new Set(["pending", "processing", "dispatched"]);

export default function OrderManager() {
  const [rows, setRows] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const [filter, setFilter] = useState("all"); // display key | "all"
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  // Commerce settings resolve the shipping-method key (standard/express/pickup)
  // + payment-method key into the customer-facing names/ETAs shown in the drawer.
  const settings = useCommerceSettings();

  const debounceRef = useRef(null);
  const mountedRef = useRef(false);

  const buildInput = useCallback(
    (offset) => {
      const input = { limit: PAGE_SIZE, offset };
      if (filter !== "all") input.status = displayToRawStatus(filter);
      if (query.trim()) input.search = query.trim();
      return input;
    },
    [filter, query]
  );

  const fetchOrders = useCallback(
    async ({ reset = true, offset = 0 } = {}) => {
      if (reset) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const data = await repairCall("myAppAdminListOrders", buildInput(reset ? 0 : offset), {
          isQuery: true,
        });
        const mapped = (data?.items || []).map(mapAdminOrderRow);
        setRows((prev) => (reset ? mapped : [...prev, ...mapped]));
        setTotal(data?.total ?? mapped.length);
        setStatusCounts(data?.statusCounts || {});
      } catch (err) {
        setError(err?.message || "Failed to load orders");
        if (reset) setRows([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [buildInput]
  );

  // Initial load immediately; debounce subsequent filter/search changes.
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      fetchOrders({ reset: true });
      return undefined;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchOrders({ reset: true }), 250);
    return () => clearTimeout(debounceRef.current);
  }, [filter, query, fetchOrders]);

  const chips = useMemo(
    () => ORDER_FILTER_CHIPS.map((c) => ({ ...c, count: chipCount(statusCounts, c.key) })),
    [statusCounts]
  );
  const allCount = useMemo(() => totalOrderCount(statusCounts), [statusCounts]);
  const hasMore = rows.length < total;

  // --- Detail drawer state (items + history loaded on demand) ---
  const [detailItems, setDetailItems] = useState([]);
  const [detailHistory, setDetailHistory] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadDetail = useCallback(async (orderId) => {
    setDetailLoading(true);
    try {
      const d = await repairCall("myAppGetOrderDetail", { orderId: Number(orderId) }, { isQuery: true });
      setDetailItems(mapDetailItems(d?.items));
      setDetailHistory(mapDetailHistory(d?.history));
    } catch {
      setDetailItems([]);
      setDetailHistory([]);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  function openOrder(row) {
    setSelected(row);
    setActionError(null);
    setDetailItems([]);
    setDetailHistory([]);
    loadDetail(row.id);
  }

  async function applyStatus(rawNext, note) {
    if (!selected || busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await repairCall(
        "myAppAdminUpdateOrderStatus",
        { orderId: Number(selected.id), status: rawNext, ...(note ? { note } : {}) },
        { isQuery: false }
      );
      const display = rawToDisplayStatus(rawNext);
      setSelected((s) => (s ? { ...s, status: display, rawStatus: rawNext } : s));
      await loadDetail(selected.id); // refresh activity log
      await fetchOrders({ reset: true }); // refresh rows + chip counts
    } catch (err) {
      setActionError(err?.message || "Couldn't update the order status. The transition may not be allowed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          All <span className="ml-1 text-[10px] opacity-70">{allCount}</span>
        </Chip>
        {chips.map((s) => (
          <Chip key={s.key} active={filter === s.key} onClick={() => setFilter(s.key)}>
            {s.label} <span className="ml-1 text-[10px] opacity-70">{s.count}</span>
          </Chip>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-[4px] border border-[#e5e7eb] bg-white p-4 md:flex-row md:items-end">
        <div className="flex-1">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search by order #, customer email, or phone..."
          />
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-[4px] border border-[#fecaca] bg-[#fef2f2] p-3 font-body text-[13px] text-[#991b1b]">
          {error}
        </div>
      ) : null}

      <DataTable
        columns={[
          {
            key: "orderNumber",
            label: "Order #",
            render: (o) => <span className="font-body font-semibold">{o.orderNumber}</span>,
          },
          {
            key: "customer",
            label: "Customer",
            render: (o) => (
              <div className="flex flex-col">
                <span className="font-body text-[13px] font-medium text-[#11191f]">
                  {o.customer.name}
                </span>
                <span className="font-body text-[11px] text-[#6b7280]">{o.customer.email || "—"}</span>
              </div>
            ),
          },
          {
            key: "items",
            label: "Items",
            render: (o) => `${o.totalQty} × ${o.itemCount}`,
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
            render: (o) => <StatusBadge status={o.status} label={statusLabel(o.status)} />,
          },
          { key: "placed", label: "Placed" },
        ]}
        rows={rows}
        onRowClick={openOrder}
        empty={
          loading
            ? "Loading orders…"
            : query || filter !== "all"
              ? "No orders match these filters."
              : "No orders have been placed yet."
        }
      />

      <div className="mt-4 flex items-center justify-between">
        <p className="font-body text-[12px] text-[#6b7280]">
          {loading ? "Loading…" : `Showing ${rows.length} of ${total} order${total === 1 ? "" : "s"}`}
        </p>
        {hasMore ? (
          <Button
            variant="secondary"
            onClick={() => fetchOrders({ reset: false, offset: rows.length })}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
        ) : null}
      </div>

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        width={680}
        title={selected ? `Order ${selected.orderNumber}` : ""}
        subtitle={selected ? `Placed ${selected.placed}` : ""}
        footer={
          selected ? (
            <>
              <Button variant="secondary" onClick={() => setSelected(null)}>
                Close
              </Button>
              <Button
                variant="dangerSolid"
                onClick={() => applyStatus("cancelled")}
                disabled={busy || !CANCELLABLE_RAW.has(selected.rawStatus)}
              >
                Cancel order
              </Button>
            </>
          ) : null
        }
      >
        {selected ? (
          <OrderDetail
            order={selected}
            items={detailItems}
            history={detailHistory}
            detailLoading={detailLoading}
            actionError={actionError}
            busy={busy}
            settings={settings}
            onApplyStatus={applyStatus}
          />
        ) : null}
      </Drawer>
    </>
  );
}

function OrderDetail({ order, items, history, detailLoading, actionError, busy, settings, onApplyStatus }) {
  const [confirmNext, setConfirmNext] = useState(null);

  const shipping = resolveShippingMethod(settings, order.shippingMethodKey);
  const paymentLabel = resolvePaymentLabel(settings, order.paymentMethod);

  const currentIdx = DISPLAY_PIPELINE.indexOf(order.status);
  const isTerminal =
    order.status === "cancelled" || order.status === "returned" || order.status === "failed_delivery";
  const nextDisplay =
    !isTerminal && currentIdx >= 0 && currentIdx < DISPLAY_PIPELINE.length - 1
      ? DISPLAY_PIPELINE[currentIdx + 1]
      : null;

  function handleMarkAs(displayNext) {
    const raw = displayToRawStatus(displayNext);
    if (displayNext === "delivered") {
      setConfirmNext(raw);
    } else {
      onApplyStatus(raw);
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
                onApplyStatus(confirmNext);
                setConfirmNext(null);
              }}
            >
              Yes, mark as delivered
            </Button>
          </>
        }
      >
        <p className="font-body text-[14px] text-[#11191f]">
          Are you sure you want to mark order <strong>{order.orderNumber}</strong> as delivered?
        </p>
        <p className="mt-2 font-body text-[12px] text-[#6b7280]">
          This confirms the customer has received their order.
        </p>
      </Modal>

      {actionError ? (
        <div className="rounded-[4px] border border-[#fecaca] bg-[#fef2f2] p-3 font-body text-[13px] text-[#991b1b]">
          {actionError}
        </div>
      ) : null}

      <section>
        <p className="mb-3 font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
          Pipeline
        </p>
        {isTerminal ? (
          <div
            className="rounded-[2px] border p-4"
            style={{
              borderColor: order.status === "failed_delivery" ? "#fed7aa" : "#fecaca",
              backgroundColor: order.status === "failed_delivery" ? "#fff7ed" : "#fef2f2",
            }}
          >
            <StatusBadge status={order.status} label={statusLabel(order.status)} />
            <p
              className="mt-2 font-body text-[12px]"
              style={{ color: order.status === "failed_delivery" ? "#9a3412" : "#991b1b" }}
            >
              {order.status === "failed_delivery"
                ? "Delivery failed. You can re-dispatch the order to try again."
                : "This order is terminal — no further status transitions from the admin."}
            </p>
            {order.status === "failed_delivery" ? (
              <div className="mt-3">
                <Button size="sm" onClick={() => onApplyStatus("dispatched")} disabled={busy}>
                  Re-dispatch
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <ol className="flex items-center justify-between gap-2">
            {DISPLAY_PIPELINE.map((step, i) => {
              const done = i <= currentIdx;
              const active = i === currentIdx;
              const tone = STATUS_TONE[step] || STATUS_TONE.processing;
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
                    {i < DISPLAY_PIPELINE.length - 1 ? (
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
        {nextDisplay ? (
          <div className="mt-4">
            <Button size="sm" onClick={() => handleMarkAs(nextDisplay)} disabled={busy}>
              Mark as {PIPELINE_LABEL[nextDisplay]}
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
          <p className="font-body text-[12px] text-[#6b7280]">{order.customer.email || "—"}</p>
          <p className="font-body text-[12px] text-[#6b7280]">{order.customer.phone || "—"}</p>
        </div>
        <div className="rounded-[2px] border border-[#e5e7eb] bg-[#fafafa] p-4">
          <p className="mb-2 font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
            Shipping address
          </p>
          <p className="font-body text-[13px] text-[#11191f]">{order.address}</p>
        </div>
      </section>

      {/* Delivery & payment — shipping method (Standard / Express / Pickup) +
          its ETA/fee, payment method/status, and the money breakdown. */}
      <section>
        <p className="mb-2 font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
          Delivery &amp; Payment
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-[2px] border border-[#e5e7eb] bg-[#fafafa] p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                Delivery method
              </span>
              <span className="font-body text-[13px] font-semibold text-[#11191f]">{shipping.name}</span>
            </div>
            {shipping.eta ? (
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="font-body text-[12px] text-[#6b7280]">Estimated</span>
                <span className="font-body text-[12px] text-[#11191f]">{shipping.eta}</span>
              </div>
            ) : null}
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="font-body text-[12px] text-[#6b7280]">Shipping fee</span>
              <span className="font-body text-[12px] text-[#11191f]">
                {order.shippingAmount > 0 ? formatCurrency(order.shippingAmount) : "Free"}
              </span>
            </div>
          </div>
          <div className="rounded-[2px] border border-[#e5e7eb] bg-[#fafafa] p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                Payment method
              </span>
              <span className="font-body text-[13px] font-semibold text-[#11191f]">{paymentLabel}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="font-body text-[12px] text-[#6b7280]">Payment status</span>
              <StatusBadge status={order.payment} label={order.payment} dot={false} size="sm" />
            </div>
          </div>
        </div>

        {/* Money breakdown */}
        <div className="mt-4 rounded-[2px] border border-[#e5e7eb] bg-white p-4">
          <BreakdownRow label="Subtotal" value={formatCurrency(order.subtotal)} />
          {order.productDiscount > 0 ? (
            <BreakdownRow label="Product discount" value={`− ${formatCurrency(order.productDiscount)}`} muted />
          ) : null}
          {order.promoDiscount > 0 ? (
            <BreakdownRow label="Promo discount" value={`− ${formatCurrency(order.promoDiscount)}`} muted />
          ) : null}
          <BreakdownRow
            label={`Shipping${shipping.name && shipping.name !== "—" ? ` (${shipping.name})` : ""}`}
            value={order.shippingAmount > 0 ? formatCurrency(order.shippingAmount) : "Free"}
          />
          {order.taxAmount > 0 ? (
            <BreakdownRow label="Tax" value={formatCurrency(order.taxAmount)} />
          ) : null}
          <div className="mt-2 flex items-center justify-between border-t border-[#f3f4f6] pt-2">
            <span className="font-body text-[13px] font-medium text-[#11191f]">Total</span>
            <span className="font-display text-[15px] font-bold text-[#11191f]">{formatCurrency(order.total)}</span>
          </div>
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
              {detailLoading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center font-body text-[13px] text-[#6b7280]">
                    Loading items…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center font-body text-[13px] text-[#6b7280]">
                    No items found for this order.
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.id} className="border-t border-[#f3f4f6]">
                    <td className="px-3 py-2 font-body text-[13px] text-[#11191f]">{it.product}</td>
                    <td className="px-3 py-2 font-body text-[12px] text-[#6b7280]">
                      {[it.color, it.size].filter(Boolean).join(" · ")}
                    </td>
                    <td className="px-3 py-2 text-right font-body text-[13px] text-[#11191f]">{it.qty}</td>
                    <td className="px-3 py-2 text-right font-body text-[13px] text-[#11191f]">
                      {formatCurrency(it.price)}
                    </td>
                    <td className="px-3 py-2 text-right font-body text-[13px] font-semibold text-[#11191f]">
                      {formatCurrency(it.lineTotal)}
                    </td>
                  </tr>
                ))
              )}
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
        {detailLoading ? (
          <p className="font-body text-[13px] text-[#6b7280]">Loading activity…</p>
        ) : history.length === 0 ? (
          <p className="font-body text-[13px] text-[#6b7280]">No activity recorded yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {[...history].reverse().map((h) => (
              <li key={h.id} className="flex items-start gap-3 rounded-[2px] border border-[#e5e7eb] bg-white p-3">
                <span className="mt-1 size-2 rounded-full bg-[#1d4ed8]" />
                <div className="flex-1">
                  <p className="font-body text-[13px] text-[#11191f]">
                    {h.note || (
                      <>
                        Status moved to <strong>{statusLabel(h.to)}</strong>
                      </>
                    )}
                  </p>
                  <p className="font-body text-[11px] text-[#6b7280]">{h.at}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function BreakdownRow({ label, value, muted = false }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="font-body text-[12px] text-[#6b7280]">{label}</span>
      <span className={`font-body text-[12px] ${muted ? "text-[#16a34a]" : "text-[#11191f]"}`}>{value}</span>
    </div>
  );
}

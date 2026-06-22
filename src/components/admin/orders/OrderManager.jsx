"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/admin/shared/Button";
import DataTable from "@/components/admin/shared/DataTable";
import Drawer from "@/components/admin/shared/Drawer";
import Modal from "@/components/admin/shared/Modal";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import { Chip, SearchInput, Field, Select, NumberInput, TextArea } from "@/components/admin/shared/Form";
import { IconCheck } from "@/components/admin/shared/Icons";
import { formatCurrency, STATUS_TONE } from "@/lib/mockAdmin";
import { repairCall } from "@/lib/repairAuthedApi";
import { toOptions, formatThunderFee } from "@/lib/thunderDelivery";
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

  // `deliveryUserId` is only meaningful on the Prepared → With Delivery
  // (dispatched → out_for_delivery) handoff: a numeric id assigns + emails that
  // delivery account, `null`/undefined leaves the order unassigned (admin keeps
  // it). It's passed through to the resolver's optional `deliveryUserId`.
  async function applyStatus(rawNext, note, deliveryUserId) {
    if (!selected || busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await repairCall(
        "myAppAdminUpdateOrderStatus",
        {
          orderId: Number(selected.id),
          status: rawNext,
          ...(note ? { note } : {}),
          ...(deliveryUserId != null ? { deliveryUserId: Number(deliveryUserId) } : {}),
        },
        { isQuery: false }
      );
      const display = rawToDisplayStatus(rawNext);
      setSelected((s) =>
        s
          ? {
              ...s,
              status: display,
              rawStatus: rawNext,
              ...(deliveryUserId != null ? { deliveryUserId: Number(deliveryUserId) } : {}),
            }
          : s
      );
      await loadDetail(selected.id); // refresh activity log
      await fetchOrders({ reset: true }); // refresh rows + chip counts
    } catch (err) {
      setActionError(err?.message || "Couldn't update the order status. The transition may not be allowed.");
    } finally {
      setBusy(false);
    }
  }

  // Hand the order to the EXTERNAL Thunder courier (creates the Thunder order
  // and flips status to With Delivery in one resolver call). Returns true on
  // success so the modal can close; a Thunder-side rejection throws with the
  // courier's own message, which we surface inline.
  async function dispatchToThunder(payload) {
    if (!selected || busy) return false;
    setBusy(true);
    setActionError(null);
    try {
      const res = await repairCall(
        "myAppAdminDispatchToThunder",
        { orderId: Number(selected.id), ...payload },
        { isQuery: false }
      );
      setSelected((s) =>
        s
          ? {
              ...s,
              status: "handed_to_delivery",
              rawStatus: "out_for_delivery",
              deliveryChannel: "thunder",
              thunderOrderId: res?.thunderOrderId ?? s.thunderOrderId ?? null,
              thunderLastError: null,
            }
          : s
      );
      await loadDetail(selected.id);
      await fetchOrders({ reset: true });
      return true;
    } catch (err) {
      setActionError(err?.message || "Couldn't hand the order to Thunder. Please retry or contact Thunder.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  // Pull the latest status from Thunder for an already-dispatched order (the
  // manual backstop to the inbound webhook).
  async function syncThunder() {
    if (!selected || busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await repairCall("myAppAdminSyncThunderOrder", { orderId: Number(selected.id) }, { isQuery: false });
      await loadDetail(selected.id);
      await fetchOrders({ reset: true });
    } catch (err) {
      setActionError(err?.message || "Couldn't refresh from Thunder.");
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
            onDispatchThunder={dispatchToThunder}
            onSyncThunder={syncThunder}
          />
        ) : null}
      </Drawer>
    </>
  );
}

function OrderDetail({
  order,
  items,
  history,
  detailLoading,
  actionError,
  busy,
  settings,
  onApplyStatus,
  onDispatchThunder,
  onSyncThunder,
}) {
  const [confirmNext, setConfirmNext] = useState(null);

  // Prepared → With Delivery handoff: choose a delivery CHANNEL —
  // "internal" (assign one of our delivery accounts) or "thunder" (push the
  // order to the external Thunder courier). `assignSelection` is the chosen
  // internal delivery user id, or null = "don't assign".
  const [assignOpen, setAssignOpen] = useState(false);
  const [channel, setChannel] = useState("internal");
  const [deliveryUsers, setDeliveryUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [assignSelection, setAssignSelection] = useState(null);

  // Thunder handoff fields.
  const [thunderAreas, setThunderAreas] = useState([]);
  const [thunderSubAreas, setThunderSubAreas] = useState([]);
  const [thunderOrderTypes, setThunderOrderTypes] = useState([]);
  const [thunderRefLoading, setThunderRefLoading] = useState(false);
  const [thunderRefError, setThunderRefError] = useState(null);
  const [areaId, setAreaId] = useState("");
  const [subAreaId, setSubAreaId] = useState("");
  const [orderTypeId, setOrderTypeId] = useState("");
  const [codAmount, setCodAmount] = useState("");
  const [thunderNote, setThunderNote] = useState("");
  const [productNote, setProductNote] = useState("");

  // Load active delivery accounts when the handoff modal opens.
  useEffect(() => {
    if (!assignOpen) return undefined;
    let active = true;
    repairCall("myAppAdminListUsers", { role: "delivery", isActive: true, limit: 200 }, { isQuery: true })
      .then((data) => {
        if (active) setDeliveryUsers(Array.isArray(data?.users) ? data.users : []);
      })
      .catch((err) => {
        if (active) setUsersError(err?.message || "Couldn't load delivery accounts.");
      })
      .finally(() => {
        if (active) setLoadingUsers(false);
      });
    return () => {
      active = false;
    };
  }, [assignOpen]);

  // Load Thunder reference data (areas / sub-areas / order types) — invoked
  // from the channel selector (not an effect) so the synchronous loading
  // setState doesn't trip the set-state-in-effect rule. Cached server-side.
  async function loadThunderRef() {
    setThunderRefLoading(true);
    setThunderRefError(null);
    try {
      const [areas, types, subs] = await Promise.all([
        repairCall("myAppAdminGetThunderAreas", {}, { isQuery: true }),
        repairCall("myAppAdminGetThunderOrderTypes", {}, { isQuery: true }).catch(() => null),
        repairCall("myAppAdminGetThunderSubAreas", {}, { isQuery: true }).catch(() => null),
      ]);
      setThunderAreas(toOptions(areas));
      setThunderOrderTypes(toOptions(types));
      setThunderSubAreas(toOptions(subs));
    } catch (err) {
      setThunderRefError(
        err?.message || "Couldn't load Thunder areas. Check the delivery integration is configured."
      );
    } finally {
      setThunderRefLoading(false);
    }
  }

  function selectChannel(next) {
    setChannel(next);
    setThunderRefError(null);
    if (next === "thunder") {
      // Cash to collect defaults to the FULL order total (which already
      // includes the delivery charge + tax) — Thunder collects this from the
      // customer. The admin can still edit it (e.g. set 0 for a prepaid order).
      if (codAmount === "") {
        setCodAmount(String(order.total ?? ""));
      }
      if (!thunderAreas.length && !thunderRefLoading) loadThunderRef();
    }
  }

  function confirmAssign() {
    setAssignOpen(false);
    // null selection → no deliveryUserId sent → order stays unassigned.
    onApplyStatus("out_for_delivery", undefined, assignSelection);
  }

  async function confirmThunder() {
    if (!areaId) {
      setThunderRefError("Please choose a delivery area.");
      return;
    }
    const ok = await onDispatchThunder({
      areaId,
      ...(subAreaId ? { subAreaId } : {}),
      ...(orderTypeId ? { orderTypeId } : {}),
      ...(codAmount !== "" ? { codAmount: Number(codAmount) } : {}),
      ...(thunderNote ? { note: thunderNote } : {}),
      ...(productNote ? { productNote } : {}),
    });
    if (ok) setAssignOpen(false);
  }

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
    } else if (displayNext === "handed_to_delivery") {
      // Open the delivery-handoff modal instead of transitioning immediately.
      setChannel("internal");
      setAssignSelection(order.deliveryUserId ?? null);
      setUsersError(null);
      setThunderRefError(null);
      setLoadingUsers(true);
      setAssignOpen(true);
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

      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Hand to delivery"
        width={480}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssignOpen(false)} disabled={busy}>
              Cancel
            </Button>
            {channel === "thunder" ? (
              <Button onClick={confirmThunder} disabled={busy || thunderRefLoading || !areaId}>
                {busy ? "Sending…" : "Create Thunder order"}
              </Button>
            ) : (
              <Button onClick={confirmAssign} disabled={busy || loadingUsers}>
                {assignSelection != null ? "Assign & hand over" : "Hand over anyway"}
              </Button>
            )}
          </>
        }
      >
        <p className="font-body text-[13px] text-[#11191f]">
          Move order <strong>{order.orderNumber}</strong> to <strong>With Delivery</strong>. The customer is
          emailed that their order has been dispatched.
        </p>

        {/* Channel selector — internal account vs external Thunder courier. */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => selectChannel("internal")}
            className="rounded-[3px] border p-3 text-left"
            style={{
              borderColor: channel === "internal" ? "#1d4ed8" : "#e5e7eb",
              backgroundColor: channel === "internal" ? "#eff6ff" : "#ffffff",
            }}
          >
            <span className="block font-body text-[13px] font-semibold text-[#11191f]">Internal account</span>
            <span className="block font-body text-[11px] text-[#6b7280]">Our own delivery staff</span>
          </button>
          <button
            type="button"
            onClick={() => selectChannel("thunder")}
            className="rounded-[3px] border p-3 text-left"
            style={{
              borderColor: channel === "thunder" ? "#1d4ed8" : "#e5e7eb",
              backgroundColor: channel === "thunder" ? "#eff6ff" : "#ffffff",
            }}
          >
            <span className="block font-body text-[13px] font-semibold text-[#11191f]">Thunder courier</span>
            <span className="block font-body text-[11px] text-[#6b7280]">External delivery company</span>
          </button>
        </div>

        {channel === "internal" ? (
          <div className="mt-4">
            <p className="font-body text-[12px] text-[#6b7280]">
              Optionally assign a delivery account — they&apos;ll be emailed the order and address and can update
              its status. Or hand it over without assigning and manage delivery yourself.
            </p>

            {usersError ? (
              <div className="mt-3 rounded-[4px] border border-[#fecaca] bg-[#fef2f2] p-2 font-body text-[12px] text-[#991b1b]">
                {usersError}
              </div>
            ) : null}

            <div className="mt-4 flex flex-col gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-[2px] border border-[#e5e7eb] p-3">
                <input
                  type="radio"
                  name="deliveryAccount"
                  checked={assignSelection == null}
                  onChange={() => setAssignSelection(null)}
                />
                <span className="font-body text-[13px] text-[#11191f]">Don&apos;t assign — I&apos;ll handle delivery</span>
              </label>

              {loadingUsers ? (
                <p className="font-body text-[12px] text-[#6b7280]">Loading delivery accounts…</p>
              ) : deliveryUsers.length === 0 ? (
                <p className="font-body text-[12px] text-[#6b7280]">No active delivery accounts found.</p>
              ) : (
                deliveryUsers.map((u) => (
                  <label
                    key={u.id}
                    className="flex cursor-pointer items-center gap-2 rounded-[2px] border border-[#e5e7eb] p-3"
                  >
                    <input
                      type="radio"
                      name="deliveryAccount"
                      checked={Number(assignSelection) === Number(u.id)}
                      onChange={() => setAssignSelection(u.id)}
                    />
                    <span className="flex flex-col">
                      <span className="font-body text-[13px] text-[#11191f]">{u.email}</span>
                      {u.phone ? <span className="font-body text-[11px] text-[#6b7280]">{u.phone}</span> : null}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <p className="font-body text-[12px] text-[#6b7280]">
              Creates the order in Thunder and moves it to With Delivery. Thunder&apos;s drivers fulfil it and push
              status updates back automatically.
            </p>

            {thunderRefError ? (
              <div className="mt-3 rounded-[4px] border border-[#fecaca] bg-[#fef2f2] p-2 font-body text-[12px] text-[#991b1b]">
                {thunderRefError}
              </div>
            ) : null}

            {/* Address comes from the customer's saved shipping address — the
                admin never re-types it; only the Thunder area is chosen. */}
            <div className="mt-3 rounded-[3px] border border-[#e5e7eb] bg-white p-3">
              <p className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                Delivers to (customer&apos;s address)
              </p>
              <p className="mt-1 font-body text-[13px] text-[#11191f]">{order.customer?.name || "—"}</p>
              <p className="font-body text-[12px] text-[#6b7280]">{order.address}</p>
              {order.customer?.phone ? (
                <p className="font-body text-[12px] text-[#6b7280]">{order.customer.phone}</p>
              ) : null}
            </div>

            {thunderRefLoading ? (
              <p className="mt-3 font-body text-[12px] text-[#6b7280]">Loading Thunder areas…</p>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                <Field label="Delivery area" required>
                  <Select
                    options={thunderAreas}
                    value={areaId}
                    onChange={(v) => setAreaId(v)}
                    placeholder="Select an area…"
                  />
                </Field>

                {thunderSubAreas.length ? (
                  <Field label="Sub-area (optional)">
                    <Select
                      options={thunderSubAreas}
                      value={subAreaId}
                      onChange={(v) => setSubAreaId(v)}
                      placeholder="None"
                    />
                  </Field>
                ) : null}

                {thunderOrderTypes.length ? (
                  <Field label="Order type">
                    <Select
                      options={thunderOrderTypes}
                      value={orderTypeId}
                      onChange={(v) => setOrderTypeId(v)}
                      placeholder="Default"
                    />
                  </Field>
                ) : null}

                <Field
                  label="Cash to collect (COD)"
                  hint="Order total incl. delivery — Thunder collects this from the customer. Set 0 if already paid."
                >
                  <NumberInput value={codAmount} min="0" step="0.01" onChange={(e) => setCodAmount(e.target.value)} />
                </Field>

                <Field label="Note for the courier (optional)">
                  <TextArea value={thunderNote} rows={2} onChange={(e) => setThunderNote(e.target.value)} />
                </Field>
                <Field label="Product note (optional)">
                  <TextArea value={productNote} rows={2} onChange={(e) => setProductNote(e.target.value)} />
                </Field>
              </div>
            )}
          </div>
        )}
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

      {order.deliveryChannel === "thunder" ? (
        <section className="rounded-[2px] border border-[#e5e7eb] bg-[#fafafa] p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
              Thunder courier
            </p>
            <Button size="sm" variant="secondary" onClick={onSyncThunder} disabled={busy}>
              Refresh from Thunder
            </Button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <p className="font-body text-[11px] text-[#6b7280]">Thunder order #</p>
              <p className="font-body text-[13px] font-medium text-[#11191f]">{order.thunderOrderId || "—"}</p>
            </div>
            <div>
              <p className="font-body text-[11px] text-[#6b7280]">Thunder status</p>
              <p className="font-body text-[13px] font-medium text-[#11191f]">{order.thunderStatus || "—"}</p>
            </div>
            {/* Thunder's delivery fee is set by Thunder and reported back — it's
                only shown once Thunder provides it (the admin never enters it). */}
            {order.thunderDeliveryFee != null ? (
              <div>
                <p className="font-body text-[11px] text-[#6b7280]">Thunder delivery fee</p>
                <p className="font-body text-[13px] font-medium text-[#11191f]">
                  {formatThunderFee(order.thunderDeliveryFee)}
                </p>
              </div>
            ) : null}
          </div>
          {order.thunderLastError ? (
            <div className="mt-3 rounded-[4px] border border-[#fecaca] bg-[#fef2f2] p-2 font-body text-[12px] text-[#991b1b]">
              Last Thunder error: {order.thunderLastError}
            </div>
          ) : null}
        </section>
      ) : null}

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

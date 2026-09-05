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
import { useSearchParams } from "next/navigation";
import { useCommerceSettings } from "@/lib/useCommerceSettings";
import {
  ORDER_FILTER_CHIPS,
  pipelineFor,
  pipelineLabel,
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

// repairCall throws with a message shaped like "repairClientApi <op>: <server
// message>". Strip the prefix so the admin sees the server's own reason (e.g.
// "That user is not a delivery account") rather than the transport's internal
// name. Mirrors cleanErr() in the other admin managers.
function cleanErr(e, fallback) {
  const m = (e?.message || "").replace(/^repairClientApi \S+:\s*/, "");
  return m || fallback;
}

const PAGE_SIZE = 25;

// Raw statuses an admin can still CANCEL from. This MUST mirror the
// `cancelled` entries in ADMIN_ALLOWED (helpers.ts), which are:
//   pending → cancelled, processing → cancelled, dispatched → cancelled,
//   failed_delivery → cancelled
//
// `failed_delivery` was missing here, and it is the one that mattered: a failed
// delivery only has two exits, re-dispatch or cancel, and cancelling is the ONLY
// one that restocks the items. With it absent from this set the Cancel button
// stayed disabled on exactly those orders, so an order the courier could not
// deliver could never be closed out and its stock never returned to the shelf —
// it just sat in failed_delivery forever. Verified against the backend before
// fixing: failed_delivery → cancelled succeeds and restocks (variant 5 → 7).
const CANCELLABLE_RAW = new Set(["pending", "processing", "dispatched", "failed_delivery"]);

// Mirrors the orders.payment_status ENUM (and PAYMENT_STATUSES in orders.ts).
// Keep the two in lockstep — the resolver rejects anything outside this set.
const PAYMENT_STATUSES = ["pending", "paid", "refunded", "failed"];
const PAYMENT_STATUS_LABEL = {
  pending: "Pending",
  paid: "Paid",
  refunded: "Refunded",
  failed: "Failed",
};

export default function OrderManager() {
  const [rows, setRows] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const [filter, setFilter] = useState("all"); // display key | "all"
  // Seeded from `?q=` so the TopBar global search can hand off a term and land
  // on a pre-filtered list. Read during the useState initializer (not a mount
  // effect) — an effect here would be a `set-state-in-effect` lint error and
  // would flash the unfiltered list for one frame first.
  const [query, setQuery] = useState(useSearchParams().get("q") || "");
  const [selected, setSelected] = useState(null);

  // Commerce settings resolve the shipping-method key (standard/express/pickup)
  // + payment-method key into the customer-facing names/ETAs shown in the drawer.
  const settings = useCommerceSettings();

  const debounceRef = useRef(null);
  const mountedRef = useRef(false);
  // Monotonic request token. Filter chips and the search box both refetch, and
  // without this the SLOWER of two in-flight requests wins whenever it lands
  // second — click "Delivered" then "Cancelled" quickly and the table can end up
  // showing delivered orders under the Cancelled chip, with the counts and the
  // "Showing N of M" line disagreeing with the rows. Same guard as SearchOverlay.
  const reqSeq = useRef(0);

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
      const seq = ++reqSeq.current;
      if (reset) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const data = await repairCall("myAppAdminListOrders", buildInput(reset ? 0 : offset), {
          isQuery: true,
        });
        // A newer request was issued while this one was in flight — drop it
        // rather than overwrite fresher rows with stale ones.
        if (seq !== reqSeq.current) return;
        const mapped = (data?.items || []).map(mapAdminOrderRow);
        setRows((prev) => (reset ? mapped : [...prev, ...mapped]));
        setTotal(data?.total ?? mapped.length);
        setStatusCounts(data?.statusCounts || {});
      } catch (err) {
        if (seq !== reqSeq.current) return;
        setError(cleanErr(err, "Failed to load orders"));
        if (reset) setRows([]);
      } finally {
        // Only the newest request may clear the spinners, or a superseded
        // response would blank them while the real fetch is still running.
        if (seq === reqSeq.current) {
          setLoading(false);
          setLoadingMore(false);
        }
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
  // (dispatched → out_for_delivery) handoff.
  //
  // THREE distinct values, and the difference matters:
  //   undefined → key omitted, the resolver leaves the assignment untouched
  //   null      → key sent as null, the resolver UNASSIGNS the order
  //   number    → assigns + emails that delivery account
  //
  // This used to collapse null into undefined (`deliveryUserId != null`), so
  // picking "Don't assign — I'll handle delivery" on an order that was ALREADY
  // assigned silently kept the old assignee: the modal reported success, the
  // drawer still showed them, and that account kept the order on its dispatch
  // dashboard. Unassignment was simply unreachable from the console.
  //
  // `paymentStatus` rides the same call — the resolver tolerates a same-status
  // "transition" as long as delivery or payment is actually changing.
  async function applyStatus(rawNext, opts = {}) {
    if (!selected || busy) return;
    const { reason, note, deliveryUserId, paymentStatus } = opts;
    setBusy(true);
    setActionError(null);
    try {
      await repairCall(
        "myAppAdminUpdateOrderStatus",
        {
          orderId: Number(selected.id),
          status: rawNext,
          // `reason` is emailed to the customer; `note` never is.
          ...(reason ? { reason } : {}),
          ...(note ? { note } : {}),
          ...(deliveryUserId !== undefined
            ? { deliveryUserId: deliveryUserId === null ? null : Number(deliveryUserId) }
            : {}),
          ...(paymentStatus ? { paymentStatus } : {}),
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
              ...(deliveryUserId !== undefined
                ? { deliveryUserId: deliveryUserId === null ? null : Number(deliveryUserId) }
                : {}),
              ...(paymentStatus ? { payment: paymentStatus } : {}),
            }
          : s
      );
      await loadDetail(selected.id); // refresh activity log
      await fetchOrders({ reset: true }); // refresh rows + chip counts
    } catch (err) {
      setActionError(cleanErr(err, "Couldn't update the order status. The transition may not be allowed."));
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
      // Surface the exact create_order request we sent Thunder + their raw
      // response in the browser console (the backend also pino-logs both). The
      // request body carries NO auth creds (those are injected server-side).
      console.log("[Thunder create_order] request →", res?.thunderRequest);
      console.log("[Thunder create_order] response ←", res?.thunderResponse);
      setSelected((s) =>
        s
          ? {
              ...s,
              status: "handed_to_delivery",
              rawStatus: "out_for_delivery",
              deliveryChannel: "thunder",
              thunderOrderId: res?.thunderOrderId ?? s.thunderOrderId ?? null,
              thunderArea: res?.area ?? s.thunderArea ?? null,
              thunderLastError: null,
            }
          : s
      );
      await loadDetail(selected.id);
      await fetchOrders({ reset: true });
      return true;
    } catch (err) {
      setActionError(cleanErr(err, "Couldn't hand the order to Thunder. Please retry or contact Thunder."));
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
      const res = await repairCall(
        "myAppAdminSyncThunderOrder",
        { orderId: Number(selected.id) },
        { isQuery: false }
      );
      // Merge the freshly-polled Thunder status into the open drawer. fetchOrders
      // refreshes the LIST rows, but the drawer renders `selected` (the row
      // captured when it opened), so without this the "Thunder status" field
      // stays "—" even though the sync succeeded. If Thunder's status also
      // advanced our order, reflect the new main status too.
      setSelected((s) =>
        s
          ? {
              ...s,
              ...(res?.thunderStatus ? { thunderStatus: res.thunderStatus } : {}),
              ...(res?.applied && res?.newStatus
                ? { status: rawToDisplayStatus(res.newStatus), rawStatus: res.newStatus }
                : {}),
            }
          : s
      );
      await loadDetail(selected.id);
      await fetchOrders({ reset: true });
    } catch (err) {
      setActionError(cleanErr(err, "Couldn't refresh from Thunder."));
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
        title={selected ? `Order ${selected?.orderNumber}` : ""}
        subtitle={selected ? `Placed ${selected?.placed}` : ""}
        footer={
          selected ? (
            <>
              <Button variant="secondary" onClick={() => setSelected(null)}>
                Close
              </Button>
              <Button
                variant="dangerSolid"
                onClick={() => applyStatus("cancelled")}
                disabled={busy || !CANCELLABLE_RAW.has(selected?.rawStatus)}
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
  // Thunder handoff assignment — separate from the internal `assignSelection`.
  // A Thunder dispatch MUST be routed to a Thunder-connected delivery account.
  const [thunderAssignSelection, setThunderAssignSelection] = useState(null);

  // Thunder handoff fields. The delivery area + sub-area are NOT chosen here —
  // they're auto-derived server-side from the customer's saved shipping address.
  const [thunderOrderTypes, setThunderOrderTypes] = useState([]);
  const [thunderRefLoading, setThunderRefLoading] = useState(false);
  const [thunderRefLoaded, setThunderRefLoaded] = useState(false);
  const [thunderRefError, setThunderRefError] = useState(null);
  const [orderTypeId, setOrderTypeId] = useState("");
  const [codAmount, setCodAmount] = useState("");
  // A single free-text note sent to Thunder (we no longer split it into a
  // separate courier note vs. product note).
  const [thunderNote, setThunderNote] = useState("");

  // Cash to collect only applies to Cash-on-Delivery orders. A prepaid (online)
  // order has nothing for Thunder to collect, so the COD field is hidden and the
  // backend sends cost = 0 / paid = true.
  const isCod = String(order.paymentMethod || "").toLowerCase() === "cod";

  // Load active delivery accounts when the handoff modal opens.
  useEffect(() => {
    if (!assignOpen) return undefined;
    let active = true;
    repairCall("myAppAdminListUsers", { role: "delivery", isActive: true, limit: 200 }, { isQuery: true })
      .then((data) => {
        if (active) setDeliveryUsers(Array.isArray(data?.users) ? data.users : []);
      })
      .catch((err) => {
        if (active) setUsersError(cleanErr(err, "Couldn't load delivery accounts."));
      })
      .finally(() => {
        if (active) setLoadingUsers(false);
      });
    return () => {
      active = false;
    };
  }, [assignOpen]);

  // Load Thunder order types — invoked from the channel selector (not an effect)
  // so the synchronous loading setState doesn't trip the set-state-in-effect
  // rule. Cached server-side. The delivery area/sub-area are NOT loaded here:
  // they're auto-derived on the backend from the customer's shipping address.
  //
  // Order types are OPTIONAL — dispatch defaults to THUNDER_DEFAULT_ORDER_TYPE_ID
  // server-side. Some Thunder deployments don't expose the order_types endpoint
  // (it 404s), so a failure here is SWALLOWED: we just don't show the dropdown
  // and never block the handoff. `thunderRefLoaded` gates re-fetching so a 404
  // isn't re-requested every time the admin re-opens the Thunder tab.
  async function loadThunderRef() {
    setThunderRefLoading(true);
    try {
      const types = await repairCall("myAppAdminGetThunderOrderTypes", {}, { isQuery: true });
      setThunderOrderTypes(toOptions(types));
    } catch {
      // Order types unavailable on this Thunder instance — proceed without them.
      setThunderOrderTypes([]);
    } finally {
      setThunderRefLoaded(true);
      setThunderRefLoading(false);
    }
  }

  function selectChannel(next) {
    setChannel(next);
    setThunderRefError(null);
    if (next === "thunder") {
      // For a COD order, prefill cash-to-collect with the FULL order total
      // (already includes delivery + tax). Prepaid orders collect nothing.
      if (isCod && codAmount === "") {
        setCodAmount(String(order.total ?? ""));
      }
      if (!thunderRefLoaded && !thunderRefLoading) loadThunderRef();
    }
  }

  function confirmAssign() {
    setAssignOpen(false);
    // null selection → no deliveryUserId sent → order stays unassigned.
    // `assignSelection` is null for "Don't assign — I'll handle delivery".
    // Passed through explicitly (not dropped) so that choice actually clears an
    // existing assignment — see the three-value contract on applyStatus.
    onApplyStatus("out_for_delivery", { deliveryUserId: assignSelection });
  }

  async function confirmThunder() {
    // A Thunder-connected delivery account is required (the backend enforces it too).
    if (thunderAssignSelection == null) return;
    // The delivery area is auto-derived server-side from the customer's saved
    // shipping address — no area/sub-area is sent from here.
    const ok = await onDispatchThunder({
      deliveryUserId: thunderAssignSelection,
      ...(orderTypeId ? { orderTypeId } : {}),
      ...(codAmount !== "" ? { codAmount: Number(codAmount) } : {}),
      ...(thunderNote ? { note: thunderNote } : {}),
    });
    if (ok) setAssignOpen(false);
  }

  const shipping = resolveShippingMethod(settings, order.shippingMethodKey);
  const paymentLabel = resolvePaymentLabel(settings, order.paymentMethod);

  // Split the fetched delivery accounts by Thunder connection. Thunder-connected
  // accounts are assignable ONLY through a Thunder dispatch; the internal
  // hand-over list shows only regular (non-Thunder) delivery accounts.
  const internalDeliveryUsers = deliveryUsers.filter((u) => !u.thunder_connected);
  const thunderDeliveryUsers = deliveryUsers.filter((u) => u.thunder_connected);

  // Pickup orders run a shorter pipeline (no "With Delivery" leg) — see pipelineFor.
  const isPickup = String(order.shippingMethodKey || "").toLowerCase() === "pickup";
  const pipeline = pipelineFor(order.shippingMethodKey);
  const currentIdx = pipeline.indexOf(order.status);
  const isTerminal =
    order.status === "cancelled" || order.status === "returned" || order.status === "failed_delivery";
  const nextDisplay =
    !isTerminal && currentIdx >= 0 && currentIdx < pipeline.length - 1
      ? pipeline[currentIdx + 1]
      : null;

  function handleMarkAs(displayNext) {
    const raw = displayToRawStatus(displayNext);
    if (displayNext === "delivered") {
      setConfirmNext(raw);
    } else if (displayNext === "handed_to_delivery") {
      // Open the delivery-handoff modal instead of transitioning immediately.
      setChannel("internal");
      setAssignSelection(order.deliveryUserId ?? null);
      setThunderAssignSelection(null);
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
        title={isPickup ? "Confirm pickup" : "Confirm delivery"}
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
              {isPickup ? "Yes, mark as picked up" : "Yes, mark as delivered"}
            </Button>
          </>
        }
      >
        <p className="font-body text-[14px] text-[#11191f]">
          Are you sure you want to mark order <strong>{order.orderNumber}</strong> as{" "}
          {isPickup ? "picked up" : "delivered"}?
        </p>
        <p className="mt-2 font-body text-[12px] text-[#6b7280]">
          {isPickup
            ? "This confirms the customer has collected their order in store."
            : "This confirms the customer has received their order."}
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
              <Button
                onClick={confirmThunder}
                disabled={busy || thunderRefLoading || loadingUsers || thunderAssignSelection == null}
              >
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
              ) : internalDeliveryUsers.length === 0 ? (
                <p className="font-body text-[12px] text-[#6b7280]">No internal delivery accounts found. (Thunder-connected accounts appear under the Thunder courier tab.)</p>
              ) : (
                internalDeliveryUsers.map((u) => (
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

            {/* Required: assign to a Thunder-CONNECTED delivery account. Only
                accounts flagged "Connect to Thunder" on the Users page can take a
                Thunder handoff (the backend enforces this too). */}
            <div className="mt-4">
              <p className="font-body text-[12px] font-semibold text-[#11191f]">Assign to Thunder-connected account</p>
              <p className="mt-0.5 font-body text-[11px] text-[#6b7280]">
                Only delivery accounts connected to Thunder can take a Thunder handoff. Toggle &quot;Connect to Thunder&quot; on a
                delivery account on the Users page.
              </p>

              {usersError ? (
                <div className="mt-2 rounded-[4px] border border-[#fecaca] bg-[#fef2f2] p-2 font-body text-[12px] text-[#991b1b]">
                  {usersError}
                </div>
              ) : loadingUsers ? (
                <p className="mt-2 font-body text-[12px] text-[#6b7280]">Loading accounts…</p>
              ) : thunderDeliveryUsers.length === 0 ? (
                <div className="mt-2 rounded-[4px] border border-[#fed7aa] bg-[#fff7ed] p-2 font-body text-[12px] text-[#9a3412]">
                  No Thunder-connected delivery accounts. Connect one on the Users page before dispatching to Thunder.
                </div>
              ) : (
                <div className="mt-2 flex flex-col gap-2">
                  {thunderDeliveryUsers.map((u) => (
                    <label
                      key={u.id}
                      className="flex cursor-pointer items-center gap-2 rounded-[2px] border border-[#e5e7eb] p-3"
                    >
                      <input
                        type="radio"
                        name="thunderAccount"
                        checked={Number(thunderAssignSelection) === Number(u.id)}
                        onChange={() => setThunderAssignSelection(u.id)}
                      />
                      <span className="flex flex-col">
                        <span className="font-body text-[13px] text-[#11191f]">{u.email}</span>
                        {u.phone ? <span className="font-body text-[11px] text-[#6b7280]">{u.phone}</span> : null}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {thunderRefError ? (
              <div className="mt-3 rounded-[4px] border border-[#fecaca] bg-[#fef2f2] p-2 font-body text-[12px] text-[#991b1b]">
                {thunderRefError}
              </div>
            ) : null}

            {/* Address comes from the customer's saved shipping address — the
                admin never re-types it, and the Thunder delivery area is
                auto-detected from it server-side (no manual area picker). */}
            <div className="mt-3 rounded-[3px] border border-[#e5e7eb] bg-white p-3">
              <p className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                Delivers to (customer&apos;s address)
              </p>
              <p className="mt-1 font-body text-[13px] text-[#11191f]">{order.customer?.name || "—"}</p>
              <p className="font-body text-[12px] text-[#6b7280]">{order.address}</p>
              {order.customer?.phone ? (
                <p className="font-body text-[12px] text-[#6b7280]">{order.customer.phone}</p>
              ) : null}
              <p className="mt-2 font-body text-[11px] text-[#6b7280]">
                The Thunder delivery area is detected automatically from this address.
              </p>
            </div>

            {thunderRefLoading ? (
              <p className="mt-3 font-body text-[12px] text-[#6b7280]">Loading delivery options…</p>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
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

                {isCod ? (
                  <Field
                    label="Cash to collect (COD)"
                    hint="Order total incl. delivery — Thunder collects this from the customer."
                  >
                    <NumberInput value={codAmount} min="0" step="0.01" onChange={(e) => setCodAmount(e.target.value)} />
                  </Field>
                ) : (
                  <p className="rounded-[3px] border border-[#e5e7eb] bg-[#f0fdf4] p-2 font-body text-[12px] text-[#166534]">
                    Paid online — no cash to collect.
                  </p>
                )}

                <Field
                  label="Note for Thunder (optional)"
                  hint="Sent to Thunder as the order note. Express orders are tagged for the courier automatically."
                >
                  <TextArea value={thunderNote} rows={3} onChange={(e) => setThunderNote(e.target.value)} />
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
                ? "Delivery failed. Re-dispatch to try again, or cancel the order (Cancel order, below) to close it out and return the items to stock."
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
            {pipeline.map((step, i) => {
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
                    {i < pipeline.length - 1 ? (
                      <span
                        className="ml-1 h-0.5 flex-1 rounded-full"
                        style={{ backgroundColor: i < currentIdx ? tone.dot : "#e5e7eb" }}
                      />
                    ) : null}
                  </div>
                  <span className="font-body text-[10px] font-medium uppercase tracking-[0.8px] text-[#11191f]">
                    {pipelineLabel(step, isPickup)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        {nextDisplay ? (
          <div className="mt-4">
            <Button size="sm" onClick={() => handleMarkAs(nextDisplay)} disabled={busy}>
              Mark as {pipelineLabel(nextDisplay, isPickup)}
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
            {order.thunderArea ? (
              <div>
                <p className="font-body text-[11px] text-[#6b7280]">Delivery area (auto)</p>
                <p className="font-body text-[13px] font-medium text-[#11191f]">{order.thunderArea}</p>
              </div>
            ) : null}
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
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-body text-[14px] font-semibold text-[#11191f]">{order.customer.name}</p>
            {order.welcomeDiscount > 0 ? (
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 font-body text-[10px] font-semibold uppercase tracking-[0.5px]"
                style={{ backgroundColor: "#f0fdf4", color: "#166534" }}
              >
                New customer · first order
              </span>
            ) : null}
          </div>
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

            {/* Payment status was DISPLAY-ONLY, and nothing anywhere could
                change it. `myAppCheckout` writes "pending" on every order (no
                real processor settles the demo gateway), the delivery resolver
                never touches the column, and no frontend call site sent
                `paymentStatus` — so every order in the store read "pending"
                forever. That is wrong in the case the store most depends on:
                Cash on Delivery. The driver collects the cash, and there was no
                way to record that it was collected — the admin's Payment column,
                the payment filter, and the refunded-count report all stayed
                stuck at the checkout-time value.

                The resolver already accepted and validated `paymentStatus`; the
                control simply did not exist. Deliberately MANUAL rather than
                auto-flipping COD to paid on delivery: whether the money actually
                arrived is a business fact the system can't observe. Prepaid
                orders are left alone for the same reason — with a demo gateway,
                "pending" is the honest value. */}
            <div className="mt-3 border-t border-[#e5e7eb] pt-3">
              <span className="font-body text-[11px] text-[#6b7280]">Mark payment as</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PAYMENT_STATUSES.map((ps) => (
                  <Button
                    key={ps}
                    size="sm"
                    variant={order.payment === ps ? "primary" : "secondary"}
                    disabled={busy || order.payment === ps}
                    onClick={() =>
                      onApplyStatus(order.rawStatus, { paymentStatus: ps })
                    }
                  >
                    {PAYMENT_STATUS_LABEL[ps]}
                  </Button>
                ))}
              </div>
              {isCod && order.payment !== "paid" ? (
                <p className="mt-2 font-body text-[11px] text-[#9a3412]">
                  Cash on Delivery — mark as Paid once the driver has handed over the cash.
                </p>
              ) : null}
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
          {order.welcomeDiscount > 0 ? (
            <BreakdownRow label="Welcome discount (10% · first order)" value={`− ${formatCurrency(order.welcomeDiscount)}`} muted />
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

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/admin/shared/Button";
import DataTable from "@/components/admin/shared/DataTable";
import PagedFooter from "@/components/admin/shared/PagedFooter";
import usePagedList from "@/components/admin/shared/usePagedList";
import Drawer from "@/components/admin/shared/Drawer";
import Modal from "@/components/admin/shared/Modal";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import { Chip, SearchInput } from "@/components/admin/shared/Form";
import { IconTrash } from "@/components/admin/shared/Icons";
import { repairCall } from "@/lib/repairAuthedApi";

// Admin Stock Alerts — "notify me when available" subscriptions.
// WIRED TO BACKEND (myAppAdminListStockAlerts / UpdateStockAlertStatus /
// NotifyStockAlerts / DeleteStockAlert). Subscriptions are created customer-side
// by myAppRequestStockAlert (the product page's "Notify When Available" button)
// and are keyed PER VARIANT (product + color + size). Follows the UserManager
// pattern: status + search live in state and drive a debounced server refetch;
// rows render straight from the resolver (no client-side filtering).
//
// Restocking is the reason this page exists, and it is a BULK action: one
// variant coming back into stock can have hundreds of people waiting. Selecting
// rows (or "notify everyone waiting for this variant" from the drawer) goes
// through myAppAdminNotifyStockAlerts, which claims the rows under a lock and
// QUEUES the emails for the drain worker. Notifying one at a time still works
// from the drawer — it is just no longer the only option.

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "notified", label: "Notified" },
  { value: "dismissed", label: "Dismissed" },
];

function statusLabel(s) {
  return STATUSES.find((x) => x.value === s)?.label ?? s;
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA");
}

// Customer rows carry email (+ phone) but no display name, so derive initials
// from the email local-part — same approach as UserManager.
function initials(email) {
  if (!email) return "?";
  const local = email.split("@")[0];
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

function variantLabel(a) {
  return [a?.color?.name, a?.size?.name].filter(Boolean).join(" · ");
}

// Backend `counts` is a raw grouped query → [{ status, cnt }] with cnt possibly
// a string. Coerce and sum for the "All" chip. Global (filter-independent).
/** Rows per page. The list loads more on demand. */
const PAGE_SIZE = 50;

function countsFromArray(arr) {
  const c = { all: 0, pending: 0, notified: 0, dismissed: 0 };
  (Array.isArray(arr) ? arr : []).forEach((r) => {
    const n = Number(r.cnt) || 0;
    if (r.status in c) c[r.status] = n;
    c.all += n;
  });
  return c;
}

export default function StockAlertManager() {
  const [counts, setCounts] = useState({ all: 0, pending: 0, notified: 0, dismissed: 0 });
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  // Debounced copy of `query`. The paged list refetches whenever its fetcher
  // identity changes, so debouncing here is what stops a request per keystroke.
  const [appliedQuery, setAppliedQuery] = useState("");
  const [viewing, setViewing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  // Set when a notify would email people about something that is still out of
  // stock. Holds everything needed to re-run the same call with force: true.
  const [confirmForce, setConfirmForce] = useState(null);
  const [notice, setNotice] = useState(null);
  // usePagedList owns `error` for LOAD failures and clears it at the start of
  // every load. A MUTATION failure needs its own slot, or the refresh that
  // follows a failed write erases the message before the admin can read it.
  const [actionError, setActionError] = useState(null);

  const debounceRef = useRef(null);
  const mountedRef = useRef(false);

  // Debounce the search box into `appliedQuery`.
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      setAppliedQuery(query);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setAppliedQuery(query), 250);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const fetchPage = useCallback(
    async ({ limit, offset }) => {
      const input = { limit, offset };
      if (statusFilter && statusFilter !== "all") input.status = statusFilter;
      if (appliedQuery) input.search = appliedQuery;
      const data = await repairCall("myAppAdminListStockAlerts", input, { isQuery: true });
      // `counts` is an UNFILTERED per-status breakdown, so it stays correct
      // regardless of which page we're on. The server only computes it on the
      // FIRST page (it is a full-table scan) and sends null afterwards, meaning
      // "keep what you have" — treating that null as an empty array would blank
      // every chip to 0 the moment the admin clicked "Load more".
      if (data?.counts != null) setCounts(countsFromArray(data.counts));
      return { items: Array.isArray(data?.items) ? data.items : [], total: data?.total };
    },
    [statusFilter, appliedQuery],
  );

  const list = usePagedList({ pageSize: PAGE_SIZE, fetchPage });
  const { items: alerts, loading, error } = list;

  // Only a pending row can be notified, so only pending rows are selectable.
  const selectablePending = useMemo(
    () => alerts.filter((a) => a.status === "pending"),
    [alerts],
  );
  const selected = useMemo(
    () => selectablePending.filter((a) => selectedIds.has(a.id)),
    [selectablePending, selectedIds],
  );
  const selectedOutOfStock = useMemo(
    () => selected.filter((a) => !a.in_stock_now),
    [selected],
  );

  // `selectedIds` may retain ids that have scrolled out of the current filter
  // or been notified by someone else. They are intersected against the visible
  // pending rows above rather than pruned in an effect, so a stale id simply
  // never appears in `selected` — no cascading render, and nothing can be acted
  // on that isn't on screen.

  function toggleOne(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds(
      selected.length === selectablePending.length
        ? new Set()
        : new Set(selectablePending.map((a) => a.id)),
    );
  }

  async function updateStatus(id, status, force = false) {
    setBusyId(id);
    setActionError(null);
    setNotice(null);
    try {
      const payload = { id: Number(id), status };
      if (force) payload.force = true;
      await repairCall("myAppAdminUpdateStockAlertStatus", payload, { isQuery: false });
      setViewing((v) => (v && v.id === id ? { ...v, status } : v));
      await list.refresh();
    } catch (err) {
      setActionError(err?.message || "Failed to update the alert");
    } finally {
      setBusyId(null);
    }
  }

  // One entry point for every notify: a selection of rows, or every customer
  // waiting on a variant. `force` re-runs the same call past the out-of-stock
  // refusal, and is only ever set from the explicit confirmation modal.
  async function runNotify({ alertIds, productVariantId, force = false }) {
    setBulkBusy(true);
    setActionError(null);
    setNotice(null);
    try {
      const payload = { force };
      if (alertIds?.length) payload.alertIds = alertIds.map(Number);
      if (productVariantId != null) payload.productVariantId = Number(productVariantId);
      const res = await repairCall("myAppAdminNotifyStockAlerts", payload, { isQuery: false });
      setNotice(res?.message || `${res?.notified ?? 0} notified`);
      setSelectedIds(new Set());
      setViewing(null);
      await list.refresh();
    } catch (err) {
      setActionError(err?.message || "Failed to notify");
    } finally {
      setBulkBusy(false);
      setConfirmForce(null);
    }
  }

  // Ask before emailing "it's back in stock" about something that isn't. The
  // server enforces this too — this modal exists so the admin finds out before
  // the click rather than after a refusal.
  function requestNotify({ alertIds, productVariantId, outOfStockCount, targetLabel }) {
    if (outOfStockCount > 0) {
      setConfirmForce({ alertIds, productVariantId, outOfStockCount, targetLabel });
      return;
    }
    runNotify({ alertIds, productVariantId });
  }

  // Notifying ONE customer from the drawer. It cannot reuse the bulk path: that
  // resolver only ever claims rows that are `pending`, so a DISMISSED alert —
  // the admin correcting themselves, which is precisely when you notify one
  // person on their own — would silently match nothing. It stays on
  // myAppAdminUpdateStockAlertStatus and gets its own route into the same
  // confirmation modal.
  //
  // Before this existed, the single path could never send `force`. An
  // out-of-stock row refused with "...Restock it first, or confirm to send
  // anyway" and there was nothing anywhere to confirm with — the message named
  // an affordance the console didn't have.
  function requestSingleNotify(alert) {
    if (!alert?.in_stock_now) {
      setConfirmForce({
        single: { id: alert.id },
        outOfStockCount: 1,
        targetLabel: alert.customer?.email ?? "this customer",
      });
      return;
    }
    updateStatus(alert.id, "notified");
  }

  // The modal's one confirm button, for both shapes it can be opened with.
  function confirmSend() {
    const c = confirmForce;
    if (!c) return;
    if (c.single) {
      setConfirmForce(null);
      updateStatus(c.single.id, "notified", true);
      return;
    }
    runNotify({ alertIds: c.alertIds, productVariantId: c.productVariantId, force: true });
  }

  async function remove(id) {
    setConfirmDelete(null);
    setActionError(null);
    try {
      await repairCall("myAppAdminDeleteStockAlert", { id: Number(id) }, { isQuery: false });
      setViewing((v) => (v && v.id === id ? null : v));
      await list.refresh();
    } catch (err) {
      setActionError(err?.message || "Failed to delete the alert");
    }
  }

  const allPendingSelected =
    selectablePending.length > 0 && selected.length === selectablePending.length;

  // Only PENDING requests can be notified, so only they get a checkbox. When a
  // page has none — every request already handled, or the Notified/Dismissed
  // filter is active — the whole select column is dropped rather than rendered
  // disabled. A visible control that does nothing when clicked and says nothing
  // about why reads as a broken page, which is exactly how it was reported.
  const selectColumn = {
    key: "select",
    width: 44,
    label: (
      <input
        type="checkbox"
        aria-label="Select all pending requests on this page"
        className="size-4 cursor-pointer accent-[#11191f]"
        checked={allPendingSelected}
        onChange={toggleAll}
      />
    ),
    render: (a) =>
      a.status === "pending" ? (
        <input
          type="checkbox"
          aria-label={`Select request from ${a.customer?.email ?? "customer"}`}
          className="size-4 cursor-pointer accent-[#11191f]"
          checked={selectedIds.has(a.id)}
          // Without this the click bubbles to the row and opens the drawer on
          // top of the checkbox the admin just ticked.
          onClick={(e) => e.stopPropagation()}
          onChange={() => toggleOne(a.id)}
        />
      ) : (
        // A mixed page still needs the cell so the columns line up; the reason
        // this row has no checkbox is its status, which is already on the row.
        <span className="sr-only">Already {statusLabel(a.status).toLowerCase()}</span>
      ),
  };

  return (
    <>
      {(actionError || error) && (
        <div className="mb-4 rounded-[4px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3">
          <p className="font-body text-[13px] text-[#dc2626]">{actionError || error}</p>
        </div>
      )}
      {notice && (
        <div className="mb-4 rounded-[4px] border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3">
          <p className="font-body text-[13px] text-[#166534]">{notice}</p>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Chip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
          All <span className="ml-1 text-[10px] opacity-70">{counts.all}</span>
        </Chip>
        {STATUSES.map((s) => (
          <Chip
            key={s.value}
            active={statusFilter === s.value}
            onClick={() => setStatusFilter(s.value)}
          >
            {s.label} <span className="ml-1 text-[10px] opacity-70">{counts[s.value] || 0}</span>
          </Chip>
        ))}
      </div>

      <div className="mb-4 rounded-[4px] border border-[#e5e7eb] bg-white p-4">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by customer email or product..."
        />
        {appliedQuery ? (
          // The chips above are whole-table counts and don't move when a search
          // narrows the list. Saying so is cheaper than two numbers silently
          // disagreeing next to each other.
          <p className="mt-2 font-body text-[11px] text-[#6b7280]">
            Showing matches for &ldquo;{appliedQuery}&rdquo;. The counts above are for all requests.
          </p>
        ) : null}
      </div>

      {selected.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[4px] border border-[#11191f] bg-[#11191f] px-4 py-3">
          <p className="font-body text-[13px] font-medium text-white">
            {selected.length} selected
            {selectedOutOfStock.length > 0 ? (
              <span className="ml-2 font-normal text-[#fca5a5]">
                · {selectedOutOfStock.length} still out of stock
              </span>
            ) : null}
          </p>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={bulkBusy}
              onClick={() =>
                requestNotify({
                  alertIds: selected.map((a) => a.id),
                  outOfStockCount: selectedOutOfStock.length,
                  targetLabel: `${selected.length} selected request${selected.length === 1 ? "" : "s"}`,
                })
              }
            >
              {bulkBusy ? "Working..." : `Notify ${selected.length}`}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* The checkboxes are only meaningful if you know what they do. Say it
          once, where they appear, and only while nothing is selected yet — the
          selection bar above replaces this the moment it becomes redundant. */}
      {!loading && selected.length === 0 && selectablePending.length > 0 ? (
        <p className="mb-2 font-body text-[12px] text-[#6b7280]">
          Tick the pending requests you want to notify — or open one and use
          &ldquo;Notify everyone waiting for this variant&rdquo;.
        </p>
      ) : null}

      {loading ? (
        <div className="grid place-items-center rounded-[4px] border border-[#e5e7eb] bg-white px-6 py-16">
          <div className="flex items-center gap-3">
            <div className="size-5 animate-spin rounded-full border-2 border-[#e5e7eb] border-t-[#11191f]" />
            <p className="font-body text-[13px] text-[#6b7280]">Loading stock alerts...</p>
          </div>
        </div>
      ) : (
        <DataTable
          columns={[
            ...(selectablePending.length > 0 ? [selectColumn] : []),
            {
              key: "customer",
              label: "Customer",
              render: (a) => (
                <div className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#11191f] font-display text-[11px] font-bold uppercase text-white">
                    {initials(a.customer?.email)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-body text-[13px] font-medium text-[#11191f]">
                      {a.customer?.email ?? "Unknown"}
                    </p>
                    {a.customer?.phone && (
                      <p className="font-body text-[11px] text-[#6b7280]">{a.customer.phone}</p>
                    )}
                    {/* The Status column is dropped on phones to reclaim its
                        width, so the badge rides along here instead of sitting
                        off-screen behind a sideways scroll. */}
                    <span className="mt-1 inline-flex sm:hidden">
                      <StatusBadge status={a.status} label={statusLabel(a.status)} />
                    </span>
                  </div>
                </div>
              ),
            },
            {
              key: "product",
              label: "Product / Variant",
              render: (a) => (
                <div className="min-w-0">
                  <p className="truncate font-body text-[13px] font-medium text-[#11191f]">
                    {a.product?.name ?? "—"}
                  </p>
                  <p className="font-body text-[11px] text-[#6b7280]">
                    {variantLabel(a) || "—"}
                  </p>
                </div>
              ),
            },
            {
              key: "created_at",
              label: "Requested",
              width: 120,
              className: "hidden md:table-cell",
              render: (a) => formatDate(a.created_at),
            },
            {
              key: "status",
              label: "Status",
              width: 110,
              className: "hidden sm:table-cell",
              render: (a) => (
                <div className="flex flex-col items-start gap-1">
                  <StatusBadge status={a.status} label={statusLabel(a.status)} />
                  {a.status === "pending" && a.in_stock_now ? (
                    <span className="font-body text-[10px] font-medium uppercase tracking-[0.5px] text-[#166534]">
                      In stock
                    </span>
                  ) : null}
                </div>
              ),
            },
            {
              key: "actions",
              label: "",
              align: "right",
              width: 56,
              render: (a) => (
                <button
                  type="button"
                  aria-label={`Delete request from ${a.customer?.email ?? "customer"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(a);
                  }}
                  className="grid size-8 place-items-center rounded-[2px] text-[#dc2626] hover:bg-[#fef2f2]"
                >
                  <span className="grid size-4 place-items-center">
                    <IconTrash />
                  </span>
                </button>
              ),
            },
          ]}
          rows={alerts}
          onRowClick={(a) => setViewing(a)}
          empty={
            <div className="flex flex-col items-center gap-2">
              <p className="font-body text-[13px] text-[#6b7280]">No requests found</p>
              {query || statusFilter !== "all" ? (
                // #6b7280, not #9ca3af — the lighter grey measured 2.54:1
                // against white, well under the 4.5:1 AA threshold.
                <p className="font-body text-[11px] text-[#6b7280]">
                  Try clearing the search or filter.
                </p>
              ) : null}
            </div>
          }
        />
      )}

      {!loading && alerts.length > 0 ? (
        <PagedFooter
          shown={alerts.length}
          total={list.total}
          hasMore={list.hasMore}
          loading={loading}
          loadingMore={list.loadingMore}
          onLoadMore={list.loadMore}
          noun="request"
        />
      ) : null}

      <AlertDrawer
        alert={viewing}
        busy={(busyId != null && viewing != null && busyId === viewing.id) || bulkBusy}
        onClose={() => setViewing(null)}
        onUpdateStatus={updateStatus}
        onNotifyCustomer={requestSingleNotify}
        onNotifyVariant={(a) =>
          requestNotify({
            productVariantId: a.product_variant_id,
            outOfStockCount: a.in_stock_now ? 0 : 1,
            targetLabel: `everyone waiting for ${a.product?.name ?? "this variant"}`,
          })
        }
        onRequestDelete={(a) => {
          setViewing(null);
          setConfirmDelete(a);
        }}
      />

      <Modal
        open={!!confirmForce}
        onClose={() => setConfirmForce(null)}
        title="Still out of stock"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmForce(null)}>
              Cancel
            </Button>
            <Button
              variant="dangerSolid"
              disabled={bulkBusy || busyId != null}
              onClick={confirmSend}
            >
              {bulkBusy ? "Sending..." : "Send anyway"}
            </Button>
          </>
        }
      >
        <p className="font-body text-[13px] text-[#11191f]">
          {confirmForce?.outOfStockCount === 1
            ? "This variant is still showing zero stock."
            : `${confirmForce?.outOfStockCount} of these requests are for variants still showing zero stock.`}{" "}
          Notifying sends a &ldquo;back in stock&rdquo; email, so the customer will arrive to find
          nothing to buy. Restock first unless you know it lands imminently.
        </p>
      </Modal>

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete request"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button variant="dangerSolid" onClick={() => remove(confirmDelete?.id)}>
              Delete
            </Button>
          </>
        }
      >
        <p className="font-body text-[13px] text-[#11191f]">
          Permanently delete the stock alert from{" "}
          <strong>{confirmDelete?.customer?.email ?? "this customer"}</strong> for{" "}
          <strong>
            {[confirmDelete?.product?.name, confirmDelete?.color?.name, confirmDelete?.size?.name]
              .filter(Boolean)
              .join(" · ") || "this variant"}
          </strong>
          ? This cannot be undone.
        </p>
      </Modal>
    </>
  );
}

function AlertDrawer({ alert, busy, onClose, onUpdateStatus, onNotifyCustomer, onNotifyVariant, onRequestDelete }) {
  const open = !!alert;
  const line = alert ? variantLabel(alert) : "";

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={alert?.product?.name ?? ""}
      subtitle={line}
      width={480}
      footer={
        <Button variant="dangerSolid" onClick={() => onRequestDelete(alert)}>
          Delete
        </Button>
      }
    >
      {open && alert ? (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <StatusBadge status={alert.status} label={statusLabel(alert.status)} />
            <span className="font-body text-[12px] text-[#6b7280]">
              Requested {formatDate(alert.created_at)}
            </span>
          </div>

          {/* Stock state is shown for every status, and only claims what is
              true. The old copy said "marking as notified emails the customer"
              on rows that were already notified, where no such action exists. */}
          {alert.in_stock_now ? (
            <div className="rounded-[4px] border border-[#bbf7d0] bg-[#f0fdf4] p-3">
              <p className="font-body text-[12px] text-[#166534]">
                This variant is back in stock.
                {alert.status === "pending"
                  ? " Notifying emails the customer that it is available."
                  : ""}
              </p>
            </div>
          ) : (
            <div className="rounded-[4px] border border-[#fed7aa] bg-[#fff7ed] p-3">
              <p className="font-body text-[12px] text-[#9a3412]">
                This variant is still out of stock.
                {alert.status === "pending"
                  ? " Notifying now would tell the customer it is available."
                  : ""}
              </p>
            </div>
          )}

          <div className="rounded-[4px] border border-[#e5e7eb] bg-[#fafafa] p-4">
            <p className="mb-0.5 font-body text-[11px] uppercase tracking-[1px] text-[#6b7280]">
              Customer
            </p>
            <p className="font-body text-[13px] font-medium text-[#11191f]">
              {alert.customer?.email ?? "Unknown"}
            </p>
            {alert.customer?.phone && (
              <p className="font-body text-[12px] text-[#6b7280]">{alert.customer.phone}</p>
            )}
          </div>

          <div className="rounded-[4px] border border-[#e5e7eb] bg-[#fafafa] p-4">
            <p className="mb-0.5 font-body text-[11px] uppercase tracking-[1px] text-[#6b7280]">
              Requested Variant
            </p>
            <p className="font-body text-[13px] font-medium text-[#11191f]">
              {alert.product?.name ?? "—"}
            </p>
            <p className="font-body text-[12px] text-[#6b7280]">{line || "—"}</p>
            {alert.notified_at ? (
              <p className="mt-2 font-body text-[12px] text-[#6b7280]">
                Notified {formatDate(alert.notified_at)}
              </p>
            ) : null}
          </div>

          {alert.status === "pending" ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={busy} onClick={() => onNotifyCustomer(alert)}>
                  {busy ? "Working..." : "Notify this customer"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => onUpdateStatus(alert.id, "dismissed")}
                >
                  Dismiss
                </Button>
              </div>
              {/* The restock case: one click covers everyone waiting on this
                  exact variant, instead of reopening this drawer per person. */}
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => onNotifyVariant(alert)}>
                Notify everyone waiting for this variant
              </Button>
            </div>
          ) : null}

          {alert.status === "notified" ? (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => onUpdateStatus(alert.id, "dismissed")}
              >
                Dismiss
              </Button>
            </div>
          ) : null}

          {alert.status === "dismissed" ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={busy} onClick={() => onNotifyCustomer(alert)}>
                {busy ? "Working..." : "Notify this customer"}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </Drawer>
  );
}

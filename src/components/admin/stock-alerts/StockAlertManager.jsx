"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Button from "@/components/admin/shared/Button";
import DataTable from "@/components/admin/shared/DataTable";
import Drawer from "@/components/admin/shared/Drawer";
import Modal from "@/components/admin/shared/Modal";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import { Chip, SearchInput } from "@/components/admin/shared/Form";
import { IconTrash } from "@/components/admin/shared/Icons";
import { repairCall } from "@/lib/repairAuthedApi";

// Admin Stock Alerts — "notify me when available" subscriptions.
// WIRED TO BACKEND (myAppAdminListStockAlerts / UpdateStockAlertStatus /
// DeleteStockAlert). Subscriptions are created customer-side by
// myAppRequestStockAlert (the product page's "Notify When Available" button)
// and are keyed PER VARIANT (product + color + size). Follows the UserManager
// pattern: status + search live in state and drive a debounced server refetch;
// rows render straight from the resolver (no client-side filtering).

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

// Backend `counts` is a raw grouped query → [{ status, cnt }] with cnt possibly
// a string. Coerce and sum for the "All" chip. Global (filter-independent).
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
  const [alerts, setAlerts] = useState([]);
  const [counts, setCounts] = useState({ all: 0, pending: 0, notified: 0, dismissed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const debounceRef = useRef(null);
  const mountedRef = useRef(false);

  const fetchAlerts = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const input = {};
      if (filters.status && filters.status !== "all") input.status = filters.status;
      if (filters.search) input.search = filters.search;
      const data = await repairCall("myAppAdminListStockAlerts", input, { isQuery: true });
      setAlerts(Array.isArray(data?.items) ? data.items : []);
      setCounts(countsFromArray(data?.counts));
    } catch (err) {
      setError(err?.message || "Failed to load stock alerts");
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      fetchAlerts({ status: statusFilter, search: query });
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchAlerts({ status: statusFilter, search: query });
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [statusFilter, query, fetchAlerts]);

  async function updateStatus(id, status) {
    setBusyId(id);
    setError(null);
    try {
      await repairCall(
        "myAppAdminUpdateStockAlertStatus",
        { id: Number(id), status },
        { isQuery: false }
      );
      setViewing((v) => (v && v.id === id ? { ...v, status } : v));
      await fetchAlerts({ status: statusFilter, search: query });
    } catch (err) {
      setError(err?.message || "Failed to update the alert");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id) {
    setConfirmDelete(null);
    setError(null);
    try {
      await repairCall("myAppAdminDeleteStockAlert", { id: Number(id) }, { isQuery: false });
      setViewing((v) => (v && v.id === id ? null : v));
      await fetchAlerts({ status: statusFilter, search: query });
    } catch (err) {
      setError(err?.message || "Failed to delete the alert");
    }
  }

  return (
    <>
      {error && (
        <div className="mb-4 rounded-[4px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3">
          <p className="font-body text-[13px] text-[#dc2626]">{error}</p>
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
      </div>

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
                    {[a.color?.name, a.size?.name].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
              ),
            },
            {
              key: "created_at",
              label: "Requested",
              width: 120,
              render: (a) => formatDate(a.created_at),
            },
            {
              key: "status",
              label: "Status",
              width: 110,
              render: (a) => <StatusBadge status={a.status} label={statusLabel(a.status)} />,
            },
            {
              key: "actions",
              label: "",
              align: "right",
              width: 56,
              render: (a) => (
                <button
                  type="button"
                  aria-label="Delete request"
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
                <p className="font-body text-[11px] text-[#9ca3af]">
                  Try clearing the search or filter.
                </p>
              ) : null}
            </div>
          }
        />
      )}

      <AlertDrawer
        alert={viewing}
        busy={busyId != null && viewing != null && busyId === viewing.id}
        onClose={() => setViewing(null)}
        onUpdateStatus={updateStatus}
        onRequestDelete={(a) => {
          setViewing(null);
          setConfirmDelete(a);
        }}
      />

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

function AlertDrawer({ alert, busy, onClose, onUpdateStatus, onRequestDelete }) {
  const open = !!alert;
  const variantLine = alert
    ? [alert.color?.name, alert.size?.name].filter(Boolean).join(" · ")
    : "";

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={alert?.product?.name ?? ""}
      subtitle={variantLine}
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

          {alert.in_stock_now ? (
            <div className="rounded-[4px] border border-[#bbf7d0] bg-[#f0fdf4] p-3">
              <p className="font-body text-[12px] text-[#166534]">
                This variant is back in stock — marking as notified emails the customer.
              </p>
            </div>
          ) : null}

          <div className="rounded-[4px] border border-[#e5e7eb] bg-[#fafafa] p-4">
            <p className="mb-0.5 font-body text-[11px] uppercase tracking-[1px] text-[#9ca3af]">
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
            <p className="mb-0.5 font-body text-[11px] uppercase tracking-[1px] text-[#9ca3af]">
              Requested Variant
            </p>
            <p className="font-body text-[13px] font-medium text-[#11191f]">
              {alert.product?.name ?? "—"}
            </p>
            <p className="font-body text-[12px] text-[#6b7280]">{variantLine || "—"}</p>
          </div>

          {alert.status === "pending" ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={busy} onClick={() => onUpdateStatus(alert.id, "notified")}>
                {busy ? "Working..." : "Mark as Notified"}
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
        </div>
      ) : null}
    </Drawer>
  );
}

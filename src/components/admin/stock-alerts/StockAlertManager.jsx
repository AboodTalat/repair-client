"use client";

import { useMemo, useState } from "react";
import Button from "@/components/admin/shared/Button";
import DataTable from "@/components/admin/shared/DataTable";
import Drawer from "@/components/admin/shared/Drawer";
import Modal from "@/components/admin/shared/Modal";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import { Chip, SearchInput } from "@/components/admin/shared/Form";
import { IconTrash } from "@/components/admin/shared/Icons";
import { STOCK_ALERTS } from "@/lib/mockAdmin";

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "notified", label: "Notified" },
  { value: "dismissed", label: "Dismissed" },
];

export default function StockAlertManager() {
  const [alerts, setAlerts] = useState(STOCK_ALERTS);
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = useMemo(
    () =>
      alerts.filter((a) => {
        if (statusFilter !== "all" && a.status !== statusFilter) return false;
        if (query) {
          const q = query.toLowerCase();
          if (
            !a.customer.name.toLowerCase().includes(q) &&
            !a.customer.email.toLowerCase().includes(q) &&
            !a.product.toLowerCase().includes(q)
          )
            return false;
        }
        return true;
      }),
    [alerts, statusFilter, query]
  );

  const counts = useMemo(() => {
    const c = { all: alerts.length, pending: 0, notified: 0, dismissed: 0 };
    alerts.forEach((a) => {
      c[a.status] = (c[a.status] || 0) + 1;
    });
    return c;
  }, [alerts]);

  function updateStatus(id, status) {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    setViewing((v) => (v?.id === id ? { ...v, status } : v));
  }

  function remove(id) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    setConfirmDelete(null);
    setViewing((v) => (v?.id === id ? null : v));
  }

  return (
    <>
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
            {s.label}{" "}
            <span className="ml-1 text-[10px] opacity-70">{counts[s.value] || 0}</span>
          </Chip>
        ))}
      </div>

      <div className="mb-4 rounded-[4px] border border-[#e5e7eb] bg-white p-4">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by customer or product..."
        />
      </div>

      <DataTable
        columns={[
          {
            key: "customer",
            label: "Customer",
            render: (a) => (
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#11191f] font-display text-[11px] font-bold uppercase text-white">
                  {a.customer.name
                    .split(" ")
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-body text-[13px] font-medium text-[#11191f]">
                    {a.customer.name}
                  </p>
                  <p className="font-body text-[11px] text-[#6b7280]">{a.customer.email}</p>
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
                  {a.product}
                </p>
                <p className="font-body text-[11px] text-[#6b7280]">
                  {a.color} · {a.size}
                </p>
              </div>
            ),
          },
          {
            key: "requestedAt",
            label: "Requested",
            width: 120,
          },
          {
            key: "status",
            label: "Status",
            width: 110,
            render: (a) => (
              <StatusBadge
                status={a.status}
                label={STATUSES.find((s) => s.value === a.status)?.label ?? a.status}
              />
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
        rows={filtered}
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

      <AlertDrawer
        alert={viewing}
        onClose={() => setViewing(null)}
        onUpdateStatus={updateStatus}
        onRequestDelete={(id) => {
          setViewing(null);
          setConfirmDelete(alerts.find((a) => a.id === id) ?? null);
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
          <strong>{confirmDelete?.customer?.name}</strong> for{" "}
          <strong>
            {confirmDelete?.product} · {confirmDelete?.color} · {confirmDelete?.size}
          </strong>
          ? This cannot be undone.
        </p>
      </Modal>
    </>
  );
}

function AlertDrawer({ alert, onClose, onUpdateStatus, onRequestDelete }) {
  const open = !!alert;
  const statusLabel =
    STATUSES.find((s) => s.value === alert?.status)?.label ?? alert?.status;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={alert?.product ?? ""}
      subtitle={alert ? `${alert?.color} · ${alert?.size}` : ""}
      width={480}
      footer={
        <Button variant="dangerSolid" onClick={() => onRequestDelete(alert?.id)}>
          Delete
        </Button>
      }
    >
      {open && alert ? (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <StatusBadge status={alert.status} label={statusLabel} />
            <span className="font-body text-[12px] text-[#6b7280]">
              Requested {alert.requestedAt}
            </span>
          </div>

          <div className="rounded-[4px] border border-[#e5e7eb] bg-[#fafafa] p-4">
            <p className="mb-0.5 font-body text-[11px] uppercase tracking-[1px] text-[#9ca3af]">
              Customer
            </p>
            <p className="font-body text-[13px] font-medium text-[#11191f]">
              {alert.customer.name}
            </p>
            <p className="font-body text-[12px] text-[#6b7280]">{alert.customer.email}</p>
          </div>

          <div className="rounded-[4px] border border-[#e5e7eb] bg-[#fafafa] p-4">
            <p className="mb-0.5 font-body text-[11px] uppercase tracking-[1px] text-[#9ca3af]">
              Requested Variant
            </p>
            <p className="font-body text-[13px] font-medium text-[#11191f]">{alert.product}</p>
            <p className="font-body text-[12px] text-[#6b7280]">
              {alert.color} · Size {alert.size}
            </p>
          </div>

          {alert.status === "pending" ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => onUpdateStatus(alert.id, "notified")}>
                Mark as Notified
              </Button>
              <Button
                size="sm"
                variant="secondary"
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

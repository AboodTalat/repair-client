"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Button, { IconButton } from "@/components/admin/shared/Button";
import { Chip, SearchInput } from "@/components/admin/shared/Form";
import DataTable from "@/components/admin/shared/DataTable";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import Modal from "@/components/admin/shared/Modal";
import { IconDownload, IconTrash, IconSend } from "@/components/admin/shared/Icons";
import { repairCall } from "@/lib/repairAuthedApi";

// Admin Newsletter Subscribers — WIRED TO BACKEND.
//   Q  myAppAdminListNewsletterSubscribers  ({ status?, search?, limit? })
//   M  myAppAdminUpdateNewsletterSubscriberStatus ({ id, status })
//   M  myAppAdminDeleteNewsletterSubscriber ({ id })
// Subscribers are created public-side by myAppSubscribeNewsletter (the footer
// "Stay in the loop" form). Follows the StockAlertManager pattern: status +
// search live in state and drive a debounced server refetch; rows render
// straight from the resolver (no client-side filtering). Status counts come
// from the resolver's global `statusCounts` array.

// We pull a generous page so the table + CSV export reflect the whole list
// without a pagination UI; the resolver caps at 500, so a larger list is
// flagged as truncated below the table.
const PAGE_LIMIT = 500;

const STATUS_FILTERS = [
  { key: "all",          label: "All" },
  { key: "active",       label: "Active" },
  { key: "unsubscribed", label: "Unsubscribed" },
];

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-CA");
}

// Resolver returns statusCounts as a raw grouped query → [{ status, cnt }] with
// cnt possibly a string. Coerce, sum for the "All" chip. Global (filter-independent).
function countsFromStatus(arr) {
  const c = { all: 0, active: 0, unsubscribed: 0 };
  (Array.isArray(arr) ? arr : []).forEach((r) => {
    const n = Number(r.cnt) || 0;
    if (r.status in c) c[r.status] = n;
    c.all += n;
  });
  return c;
}

function csvCell(v) {
  const s = String(v ?? "");
  return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows) {
  const header = "email,signedUp,status,source";
  const body = rows
    .map((r) => [r.email, formatDate(r.created_at), r.status, r.source].map(csvCell).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

function downloadCsv(rows) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function SubscribersManager() {
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({ all: 0, active: 0, unsubscribed: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const debounceRef = useRef(null);
  const mountedRef = useRef(false);

  const fetchSubscribers = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const input = { limit: PAGE_LIMIT };
      if (filters.status && filters.status !== "all") input.status = filters.status;
      if (filters.search) input.search = filters.search;
      const data = await repairCall("myAppAdminListNewsletterSubscribers", input, { isQuery: true });
      setRows(Array.isArray(data?.items) ? data.items : []);
      setCounts(countsFromStatus(data?.statusCounts));
      setTotal(Number(data?.total) || 0);
    } catch (err) {
      setError(err?.message || "Failed to load subscribers");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      fetchSubscribers({ status: statusFilter, search });
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSubscribers({ status: statusFilter, search });
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [statusFilter, search, fetchSubscribers]);

  async function toggleStatus(row) {
    const next = row.status === "active" ? "unsubscribed" : "active";
    setBusyId(row.id);
    setError(null);
    try {
      await repairCall(
        "myAppAdminUpdateNewsletterSubscriberStatus",
        { id: Number(row.id), status: next },
        { isQuery: false }
      );
      await fetchSubscribers({ status: statusFilter, search });
    } catch (err) {
      setError(err?.message || "Failed to update the subscriber");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    setError(null);
    try {
      await repairCall("myAppAdminDeleteNewsletterSubscriber", { id: Number(id) }, { isQuery: false });
      await fetchSubscribers({ status: statusFilter, search });
    } catch (err) {
      setError(err?.message || "Failed to delete the subscriber");
    }
  }

  const columns = [
    { key: "email", label: "Email", render: (row) => (
        <span className="font-body text-[13px] text-[#11191f]">{row.email}</span>
      )},
    { key: "signedUp", label: "Signed up", width: 120, render: (row) => (
        <span className="font-body text-[12px] text-[#6b7280]">{formatDate(row.created_at)}</span>
      )},
    { key: "source", label: "Source", width: 110, render: (row) => (
        <span className="font-body text-[12px] capitalize text-[#11191f]">{row.source}</span>
      )},
    { key: "status", label: "Status", width: 120, render: (row) => (
        <StatusBadge status={row.status} />
      )},
    { key: "actions", label: "", width: "160px", align: "right", render: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="secondary"
            disabled={busyId === row.id}
            onClick={(e) => { e.stopPropagation(); toggleStatus(row); }}
          >
            {busyId === row.id
              ? "Working…"
              : row.status === "active"
                ? "Unsubscribe"
                : "Re-subscribe"}
          </Button>
          <IconButton
            label="Delete"
            onClick={(e) => { e.stopPropagation(); setPendingDelete(row); }}
          >
            <IconTrash />
          </IconButton>
        </div>
      )},
  ];

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="rounded-[4px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3">
          <p className="font-body text-[13px] text-[#dc2626]">{error}</p>
        </div>
      )}

      {/* Status chips */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => (
          <Chip
            key={f.key}
            active={statusFilter === f.key}
            onClick={() => setStatusFilter(f.key)}
          >
            {f.label} ({counts[f.key] ?? 0})
          </Chip>
        ))}
      </div>

      {/* Search + export + compose */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="sm:max-w-sm sm:flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by email…"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<IconDownload />}
            disabled={rows.length === 0}
            onClick={() => downloadCsv(rows)}
          >
            Export CSV
          </Button>
          <Link
            href="/r3pr-console/broadcast"
            className="inline-flex h-8 items-center gap-2 rounded-[2px] bg-[#11191f] px-3 font-display text-[12px] font-semibold uppercase tracking-[1px] text-white hover:bg-[#1c2630]"
          >
            <span className="grid size-4 place-items-center">
              <IconSend />
            </span>
            Compose broadcast
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center rounded-[4px] border border-[#e5e7eb] bg-white px-6 py-16">
          <div className="flex items-center gap-3">
            <div className="size-5 animate-spin rounded-full border-2 border-[#e5e7eb] border-t-[#11191f]" />
            <p className="font-body text-[13px] text-[#6b7280]">Loading subscribers…</p>
          </div>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            empty={
              <p className="font-body text-[13px] text-[#6b7280]">
                No subscribers match this filter.
              </p>
            }
          />
          {total > rows.length && (
            <p className="font-body text-[12px] text-[#9ca3af]">
              Showing the first {rows.length} of {total} subscribers. Narrow the search to find a
              specific subscriber.
            </p>
          )}
        </>
      )}

      <Modal
        open={!!pendingDelete}
        title="Delete subscriber"
        onClose={() => setPendingDelete(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDelete(null)}>Cancel</Button>
            <Button variant="dangerSolid" onClick={confirmDelete}>Delete</Button>
          </>
        }
      >
        <p className="font-body text-[13px] text-[#11191f]">
          {pendingDelete
            ? `${pendingDelete.email} will be permanently removed from the list.`
            : ""}
        </p>
      </Modal>
    </div>
  );
}

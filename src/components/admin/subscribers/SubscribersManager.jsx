"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Button, { IconButton } from "@/components/admin/shared/Button";
import { Chip, SearchInput } from "@/components/admin/shared/Form";
import DataTable from "@/components/admin/shared/DataTable";
import PagedFooter from "@/components/admin/shared/PagedFooter";
import usePagedList from "@/components/admin/shared/usePagedList";
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

/** Rows per page; the list loads more on demand (server caps a page at 500). */
const PAGE_LIMIT = 50;

// Export page size. The resolver caps a page at 500, so the export walks the
// list in 500-row requests rather than asking for everything at once.
const EXPORT_PAGE = 500;
// A hard stop so a runaway list can't spin forever. If it ever bites, the file
// SAYS so (see exportCsv) rather than looking complete.
const EXPORT_MAX = 50000;

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

// Same formula-injection guard as `downloadCsv` in lib/adminReports.js — see the
// long note there. This list is the highest-risk of the lot: the addresses come
// straight from the PUBLIC newsletter box, with no account required.
function csvCell(v) {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
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

// Fetch EVERY row matching the current filters, for the export.
//
// This used to be `downloadCsv(rows)` over whatever the table had loaded —
// PAGE_LIMIT is 50 and the list grows only when the admin presses "Load more",
// so a 121-subscriber list exported 50 rows into a file named
// `newsletter-subscribers-<date>.csv`, with nothing on screen or in the file
// saying it was a slice. Measured: first page 50, server total 121. A partial
// export is worse than a failed one — the admin mails the 50 and believes the
// list is done. Same rule the digital-orders admin reads follow: never derive
// a whole-list artefact from a paged view.
async function fetchAllForExport({ statusFilter, appliedSearch }) {
  const all = [];
  let offset = 0;
  for (;;) {
    const input = { limit: EXPORT_PAGE, offset };
    if (statusFilter && statusFilter !== "all") input.status = statusFilter;
    if (appliedSearch) input.search = appliedSearch;
    const data = await repairCall("myAppAdminListNewsletterSubscribers", input, { isQuery: true });
    const batch = Array.isArray(data?.items) ? data.items : [];
    all.push(...batch);
    offset += batch.length;
    const total = Number(data?.total);
    // Stop on a short page (the end) or once we've matched the reported total.
    if (batch.length < EXPORT_PAGE) break;
    if (Number.isFinite(total) && offset >= total) break;
    if (offset >= EXPORT_MAX) return { rows: all, capped: true };
  }
  return { rows: all, capped: false };
}

export default function SubscribersManager() {
  const [counts, setCounts] = useState({ all: 0, active: 0, unsubscribed: 0 });
  // Debounced copy of the search box — the paged list refetches when its
  // fetcher identity changes, so this is what avoids a request per keystroke.
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [exporting, setExporting] = useState(false);

  const debounceRef = useRef(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      setAppliedSearch(search);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setAppliedSearch(search), 250);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const fetchPage = useCallback(
    async ({ limit, offset }) => {
      const input = { limit, offset };
      if (statusFilter && statusFilter !== "all") input.status = statusFilter;
      if (appliedSearch) input.search = appliedSearch;
      const data = await repairCall("myAppAdminListNewsletterSubscribers", input, { isQuery: true });
      // statusCounts is an UNFILTERED whole-table breakdown — correct on any page.
      setCounts(countsFromStatus(data?.statusCounts));
      return { items: Array.isArray(data?.items) ? data.items : [], total: data?.total };
    },
    [statusFilter, appliedSearch],
  );

  const list = usePagedList({ pageSize: PAGE_LIMIT, fetchPage });
  const { items: rows, total, loading, error, setItems: setRows } = list;
  // usePagedList owns `error` for LOAD failures and clears it at the start of
  // every load. A MUTATION failure needs its own slot, or the refresh that
  // follows a failed write erases the message before the admin can read it.
  const [actionError, setActionError] = useState(null);

  async function toggleStatus(row) {
    const next = row.status === "active" ? "unsubscribed" : "active";
    setBusyId(row.id);
    setActionError(null);
    try {
      await repairCall(
        "myAppAdminUpdateNewsletterSubscriberStatus",
        { id: Number(row.id), status: next },
        { isQuery: false }
      );
      await list.refresh();
    } catch (err) {
      setActionError(err?.message || "Failed to update the subscriber");
    } finally {
      setBusyId(null);
    }
  }

  async function exportCsv() {
    if (exporting) return;
    setExporting(true);
    setActionError(null);
    try {
      const { rows: allRows, capped } = await fetchAllForExport({ statusFilter, appliedSearch });
      if (allRows.length === 0) {
        setActionError("Nothing to export for this filter.");
        return;
      }
      downloadCsv(allRows);
      if (capped) {
        setActionError(
          `Exported the first ${allRows.length.toLocaleString()} subscribers — the list is larger than the ${EXPORT_MAX.toLocaleString()}-row export limit.`
        );
      }
    } catch (err) {
      // Say the export failed. Falling back to the loaded page here would hand
      // over a silently partial file, which is the bug this replaced.
      setActionError(err?.message || "Failed to export the subscriber list");
    } finally {
      setExporting(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    setActionError(null);
    try {
      await repairCall("myAppAdminDeleteNewsletterSubscriber", { id: Number(id) }, { isQuery: false });
      await list.refresh();
    } catch (err) {
      setActionError(err?.message || "Failed to delete the subscriber");
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
      {(actionError || error) && (
        <div className="rounded-[4px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3">
          <p className="font-body text-[13px] text-[#dc2626]">{actionError || error}</p>
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
            disabled={rows.length === 0 || exporting}
            onClick={exportCsv}
          >
            {exporting ? "Preparing…" : "Export CSV"}
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
          <PagedFooter
            shown={rows.length}
            total={total}
            hasMore={list.hasMore}
            loading={loading}
            loadingMore={list.loadingMore}
            onLoadMore={list.loadMore}
            noun="subscriber"
          />
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
            ? `${pendingDelete?.email} will be permanently removed from the list.`
            : ""}
        </p>
      </Modal>
    </div>
  );
}

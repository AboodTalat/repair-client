"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Button, { IconButton } from "@/components/admin/shared/Button";
import { Chip, SearchInput } from "@/components/admin/shared/Form";
import DataTable from "@/components/admin/shared/DataTable";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import Modal from "@/components/admin/shared/Modal";
import { IconDownload, IconTrash, IconSend } from "@/components/admin/shared/Icons";
import { NEWSLETTER_SUBSCRIBERS } from "@/lib/mockAdmin";

const STATUS_FILTERS = [
  { key: "all",          label: "All" },
  { key: "active",       label: "Active" },
  { key: "unsubscribed", label: "Unsubscribed" },
];

function toCsv(rows) {
  const header = "email,signedUp,status,source";
  const body = rows
    .map((r) => [r.email, r.signedUp, r.status, r.source].map(csvCell).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

function csvCell(v) {
  const s = String(v ?? "");
  return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(rows) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `newsletter-subscribers-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function SubscribersManager() {
  const [rows, setRows] = useState(NEWSLETTER_SUBSCRIBERS);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  const counts = useMemo(() => ({
    all: rows.length,
    active: rows.filter((r) => r.status === "active").length,
    unsubscribed: rows.filter((r) => r.status === "unsubscribed").length,
  }), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (q && !r.email.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, statusFilter, search]);

  function confirmDelete() {
    if (!pendingDelete) return;
    setRows((arr) => arr.filter((r) => r.id !== pendingDelete.id));
    setPendingDelete(null);
  }

  function toggleStatus(row) {
    setRows((arr) =>
      arr.map((r) =>
        r.id === row.id
          ? { ...r, status: r.status === "active" ? "unsubscribed" : "active" }
          : r
      )
    );
  }

  const columns = [
    { key: "email", label: "Email", render: (row) => (
        <span className="font-body text-[13px] text-[#11191f]">{row.email}</span>
      )},
    { key: "signedUp", label: "Signed up", render: (row) => (
        <span className="font-body text-[12px] text-[#6b7280]">{row.signedUp}</span>
      )},
    { key: "source", label: "Source", render: (row) => (
        <span className="font-body text-[12px] capitalize text-[#11191f]">{row.source}</span>
      )},
    { key: "status", label: "Status", render: (row) => (
        <StatusBadge status={row.status} />
      )},
    { key: "actions", label: "", width: "140px", align: "right", render: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => { e.stopPropagation(); toggleStatus(row); }}
          >
            {row.status === "active" ? "Unsubscribe" : "Re-subscribe"}
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
      {/* Status chips */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => (
          <Chip
            key={f.key}
            active={statusFilter === f.key}
            onClick={() => setStatusFilter(f.key)}
          >
            {f.label} ({counts[f.key]})
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
            onClick={() => downloadCsv(filtered)}
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

      <DataTable
        columns={columns}
        rows={filtered}
        empty={
          <p className="font-body text-[13px] text-[#6b7280]">
            No subscribers match this filter.
          </p>
        }
      />

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

"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/admin/shared/Button";
import DataTable from "@/components/admin/shared/DataTable";
import { TextInput, DateInput } from "@/components/admin/shared/Form";
import {
  IconSearch,
  IconCalendar,
  IconDownload,
  IconChart,
  IconFilter,
  IconLogout,
  IconCheck,
} from "@/components/admin/shared/Icons";
import { fetchAuditLog, AUDIT_ACTION_KINDS, formatAuditTime } from "@/lib/finance";

// Accountant Audit log — WIRED TO BACKEND (myAppFinanceAuditLog). The resolver
// is scoped to LEDGER-relevant actions only (finance.* + auth.signin/signout) —
// it does NOT surface every admin mutation. kind + date filter server-side;
// text search client-side. Read-only — there are no mutation actions here.

const KIND_ICON = {
  view: IconChart,
  export: IconDownload,
  filter: IconFilter,
  signin: IconCheck,
  signout: IconLogout,
};

// No "Filter changes" chip: filter edits happen client-side (no server round-
// trip), so there is no `finance.filter` producer and the chip would always be
// empty. The backend only emits view / export / signin / signout events.
const KIND_FILTERS = [
  { key: "all", label: "All actions" },
  { key: "view", label: "Views" },
  { key: "export", label: "Exports" },
  { key: "signin", label: "Sign-ins" },
  { key: "signout", label: "Sign-outs" },
];

function Initials({ name }) {
  const initials = String(name || "?")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#11191f] font-display text-[11px] font-bold text-white">
      {initials}
    </span>
  );
}

function KindBadge({ kind }) {
  const tone = AUDIT_ACTION_KINDS[kind];
  const Icon = KIND_ICON[kind];
  if (!tone) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-body text-[11px] font-medium" style={{ backgroundColor: tone.bg, color: tone.fg }}>
      {Icon ? <span className="grid size-3 place-items-center"><Icon /></span> : null}
      {tone.label}
    </span>
  );
}

export default function AuditLog() {
  const [kind, setKind] = useState("all");
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAuditLog({ from, to, kind });
        if (!cancelled) {
          setRows(data.items);
          setTotal(data.total);
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || "Couldn't load the audit log.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [from, to, kind, nonce]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.detail || "").toLowerCase().includes(q) ||
        (r.target || "").toLowerCase().includes(q) ||
        (r.actor?.name || "").toLowerCase().includes(q) ||
        (r.actor?.email || "").toLowerCase().includes(q) ||
        (r.ip || "").includes(q)
    );
  }, [rows, query]);

  // Per-kind counts of the loaded window (the resolver returns total, not a
  // per-kind breakdown — these reflect the most recent events in view).
  const counts = useMemo(() => {
    const c = { view: 0, export: 0, filter: 0, signin: 0, signout: 0 };
    for (const r of rows) if (r.kind in c) c[r.kind] += 1;
    return c;
  }, [rows]);

  return (
    <>
      {/* Summary tiles */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile label="Total events" value={total} accent="#11191f" />
        <SummaryTile label="Views" value={counts.view} accent="#1d4ed8" />
        <SummaryTile label="Exports" value={counts.export} accent="#3f6212" />
        <SummaryTile label="Sessions" value={counts.signin + counts.signout} accent="#6b7280" />
      </div>

      {/* Filter bar */}
      <div className="mb-5 flex flex-col gap-3 rounded-[4px] border border-[#e5e7eb] bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="relative w-full md:max-w-[360px]">
            <span className="pointer-events-none absolute left-3 top-1/2 grid size-4 -translate-y-1/2 place-items-center text-[#9ca3af]"><IconSearch /></span>
            <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by user, target, IP, or detail…" className="pl-9" />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">From</span>
              <DateInput value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">To</span>
              <DateInput value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
            </label>
            {from || to ? (
              <button type="button" onClick={() => { setFrom(""); setTo(""); }} className="h-10 rounded-[2px] border border-[#e5e7eb] bg-white px-3 font-body text-[12px] font-medium text-[#6b7280] hover:bg-[#f3f4f6]">
                Clear
              </button>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {KIND_FILTERS.map((o) => {
              const active = kind === o.key;
              return (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setKind(o.key)}
                  className="rounded-[2px] border px-3 py-1 font-body text-[12px] font-medium transition-colors"
                  style={active ? { borderColor: "#1d4ed8", backgroundColor: "#eff6ff", color: "#1d4ed8" } : { borderColor: "#e5e7eb", backgroundColor: "#fff", color: "#6b7280" }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
          <p className="font-body text-[11px] text-[#9ca3af]">
            {filtered.length} of {total} event{total === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center rounded-[4px] border border-[#e5e7eb] bg-white px-6 py-20">
          <span className="size-7 animate-spin rounded-full border-2 border-[#e5e7eb] border-t-[#1d4ed8]" />
        </div>
      ) : error ? (
        <div className="grid place-items-center rounded-[4px] border border-[#fecaca] bg-[#fef2f2] px-6 py-16">
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="max-w-md font-body text-[13px] text-[#991b1b]">{error}</p>
            <Button variant="secondary" size="sm" onClick={() => setNonce((n) => n + 1)}>Retry</Button>
          </div>
        </div>
      ) : (
        <DataTable
          rows={filtered}
          empty={
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="font-body text-[13px] text-[#6b7280]">No audit events match these filters.</p>
              <button type="button" onClick={() => { setKind("all"); setQuery(""); setFrom(""); setTo(""); }} className="font-body text-[12px] font-medium text-[#1d4ed8] hover:underline">
                Reset filters
              </button>
            </div>
          }
          columns={[
            {
              key: "actor",
              label: "Actor",
              render: (r) => (
                <div className="flex min-w-0 items-center gap-3">
                  <Initials name={r.actor?.name} />
                  <div className="min-w-0">
                    <p className="truncate font-body text-[13px] text-[#11191f]">{r.actor?.name}</p>
                    <p className="truncate font-body text-[11px] text-[#6b7280]">{r.actor?.email}</p>
                  </div>
                </div>
              ),
            },
            { key: "action", label: "Action", render: (r) => <KindBadge kind={r.kind} /> },
            {
              key: "detail",
              label: "Detail",
              render: (r) => (
                <div className="min-w-0">
                  <p className="truncate font-body text-[13px] text-[#11191f]">{r.detail}</p>
                  <p className="truncate font-body text-[11px] text-[#6b7280]">{r.target}</p>
                </div>
              ),
            },
            {
              key: "when",
              label: "When",
              render: (r) => {
                const { date, time } = formatAuditTime(r.occurredAt);
                return (
                  <div className="min-w-0">
                    <p className="font-body text-[12px] text-[#11191f]">{date}</p>
                    <p className="flex items-center gap-1.5 font-body text-[11px] text-[#6b7280]">
                      <span className="grid size-3 place-items-center text-[#9ca3af]"><IconCalendar /></span>
                      {time}
                    </p>
                  </div>
                );
              },
            },
            { key: "ip", label: "IP", align: "right", render: (r) => <span className="font-body text-[11px] tabular-nums text-[#6b7280]">{r.ip || "—"}</span> },
          ]}
        />
      )}

      <p className="mt-6 font-body text-[11px] text-[#9ca3af]">
        Read-only — audit records cannot be edited or deleted from this surface.
      </p>
    </>
  );
}

function SummaryTile({ label, value, accent }) {
  return (
    <div className="relative overflow-hidden rounded-[4px] border border-[#e5e7eb] bg-white p-4">
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: accent }} />
      <p className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">{label}</p>
      <p className="mt-1.5 font-display text-[24px] font-bold leading-none text-[#11191f]">{value}</p>
    </div>
  );
}

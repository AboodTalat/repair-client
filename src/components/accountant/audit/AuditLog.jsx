"use client";

import { useMemo, useState } from "react";
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
import {
  AUDIT_LOG,
  AUDIT_ACTION_KINDS,
  formatAuditTime,
} from "@/lib/mockFinance";

const KIND_ICON = {
  view:    IconChart,
  export:  IconDownload,
  filter:  IconFilter,
  signin:  IconCheck,
  signout: IconLogout,
};

const KIND_FILTERS = [
  { key: "all",     label: "All actions" },
  { key: "view",    label: "Views"       },
  { key: "export",  label: "Exports"     },
  { key: "filter",  label: "Filter changes" },
  { key: "signin",  label: "Sign-ins"    },
  { key: "signout", label: "Sign-outs"   },
];

function Initials({ name }) {
  const initials = name
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
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-body text-[11px] font-medium"
      style={{ backgroundColor: tone.bg, color: tone.fg }}
    >
      {Icon ? (
        <span className="grid size-3 place-items-center">
          <Icon />
        </span>
      ) : null}
      {tone.label}
    </span>
  );
}

export default function AuditLog() {
  const [kind,  setKind]  = useState("all");
  const [query, setQuery] = useState("");
  const [from,  setFrom]  = useState("");
  const [to,    setTo]    = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const fromTs = from ? new Date(from + "T00:00:00Z").getTime() : null;
    const toTs   = to   ? new Date(to   + "T23:59:59Z").getTime() : null;

    return AUDIT_LOG.filter((row) => {
      if (kind !== "all" && row.kind !== kind) return false;
      if (fromTs || toTs) {
        const ts = new Date(row.occurredAt).getTime();
        if (fromTs && ts < fromTs) return false;
        if (toTs   && ts > toTs)   return false;
      }
      if (!q) return true;
      return (
        row.detail.toLowerCase().includes(q) ||
        row.target.toLowerCase().includes(q) ||
        row.actor.name.toLowerCase().includes(q) ||
        row.actor.email.toLowerCase().includes(q) ||
        (row.ip || "").includes(q)
      );
    });
  }, [kind, query, from, to]);

  const counts = useMemo(() => {
    const c = { view: 0, export: 0, filter: 0, signin: 0, signout: 0 };
    for (const r of AUDIT_LOG) c[r.kind] = (c[r.kind] || 0) + 1;
    return c;
  }, []);

  return (
    <>
      {/* Summary tiles */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryTile label="Total events" value={AUDIT_LOG.length} accent="#11191f" />
        <SummaryTile label="Views"        value={counts.view}      accent="#1d4ed8" />
        <SummaryTile label="Exports"      value={counts.export}    accent="#3f6212" />
        <SummaryTile label="Filter edits" value={counts.filter}    accent="#92400e" />
        <SummaryTile label="Sessions"     value={counts.signin + counts.signout} accent="#6b7280" />
      </div>

      {/* Filter bar */}
      <div className="mb-5 flex flex-col gap-3 rounded-[4px] border border-[#e5e7eb] bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="relative w-full md:max-w-[360px]">
            <span className="pointer-events-none absolute left-3 top-1/2 grid size-4 -translate-y-1/2 place-items-center text-[#9ca3af]">
              <IconSearch />
            </span>
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by user, target, IP, or detail…"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">From</span>
              <DateInput value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">To</span>
              <DateInput value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
            {(from || to) ? (
              <button
                type="button"
                onClick={() => { setFrom(""); setTo(""); }}
                className="h-10 rounded-[2px] border border-[#e5e7eb] bg-white px-3 font-body text-[12px] font-medium text-[#6b7280] hover:bg-[#f3f4f6]"
              >
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
                  style={
                    active
                      ? { borderColor: "#1d4ed8", backgroundColor: "#eff6ff", color: "#1d4ed8" }
                      : { borderColor: "#e5e7eb", backgroundColor: "#fff", color: "#6b7280" }
                  }
                >
                  {o.label}
                </button>
              );
            })}
          </div>
          <p className="font-body text-[11px] text-[#9ca3af]">
            {filtered.length} of {AUDIT_LOG.length} event{AUDIT_LOG.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {/* Table */}
      <DataTable
        rows={filtered}
        empty={
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="font-body text-[13px] text-[#6b7280]">No audit events match these filters.</p>
            <button
              type="button"
              onClick={() => { setKind("all"); setQuery(""); setFrom(""); setTo(""); }}
              className="font-body text-[12px] font-medium text-[#1d4ed8] hover:underline"
            >
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
                <Initials name={r.actor.name} />
                <div className="min-w-0">
                  <p className="truncate font-body text-[13px] text-[#11191f]">{r.actor.name}</p>
                  <p className="truncate font-body text-[11px] text-[#6b7280]">{r.actor.email}</p>
                </div>
              </div>
            ),
          },
          {
            key: "action",
            label: "Action",
            render: (r) => <KindBadge kind={r.kind} />,
          },
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
                    <span className="grid size-3 place-items-center text-[#9ca3af]">
                      <IconCalendar />
                    </span>
                    {time}
                  </p>
                </div>
              );
            },
          },
          {
            key: "ip",
            label: "IP",
            align: "right",
            render: (r) => (
              <span className="font-body text-[11px] tabular-nums text-[#6b7280]">
                {r.ip || "—"}
              </span>
            ),
          },
        ]}
      />

      <p className="mt-6 font-body text-[11px] text-[#9ca3af]">
        Read-only — audit records cannot be edited or deleted from this surface. Wire to <code className="rounded bg-[#f3f4f6] px-1">myAppFinanceAuditLog({"{ from, to }"})</code> when the resolver lands.
      </p>
    </>
  );
}

function SummaryTile({ label, value, accent }) {
  return (
    <div className="relative overflow-hidden rounded-[4px] border border-[#e5e7eb] bg-white p-4">
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ backgroundColor: accent }}
      />
      <p className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
        {label}
      </p>
      <p className="mt-1.5 font-display text-[24px] font-bold leading-none text-[#11191f]">
        {value}
      </p>
    </div>
  );
}

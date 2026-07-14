"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/admin/shared/Button";
import DataTable from "@/components/admin/shared/DataTable";
import { TextInput } from "@/components/admin/shared/Form";
import { IconDownload, IconSearch, IconCalendar } from "@/components/admin/shared/Icons";
import { fetchExports, downloadExport, EXPORT_STATUS_TONE, formatBytes } from "@/lib/finance";

// Accountant Export history — WIRED TO BACKEND (myAppFinanceListExports +
// myAppFinanceDownloadExport). Format/status filter server-side; text search
// client-side. NOTE: the server export pipeline (queued → generated →
// downloadable) needs a generation worker that isn't built yet, so until then
// this list is typically empty and Download only works on a `ready` row.

const FORMAT_FILTERS = [
  { key: "all", label: "All formats" },
  { key: "PDF", label: "PDF" },
  { key: "CSV", label: "CSV" },
];

const STATUS_FILTERS = [
  { key: "all", label: "All statuses" },
  { key: "ready", label: "Ready" },
  { key: "generating", label: "Generating" },
  { key: "expired", label: "Expired" },
];

function formatRelative(iso) {
  if (!iso) return "—";
  const now = Date.now();
  const d = new Date(iso).getTime();
  const min = Math.round((now - d) / 60000);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 14) return `${day}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ChipRow({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className="rounded-[2px] border px-3 py-1 font-body text-[12px] font-medium transition-colors"
            style={active ? { borderColor: "#1d4ed8", backgroundColor: "#eff6ff", color: "#1d4ed8" } : { borderColor: "#e5e7eb", backgroundColor: "#fff", color: "#6b7280" }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function ExportHistory() {
  const [format, setFormat] = useState("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({ ready: 0, generating: 0, expired: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nonce, setNonce] = useState(0);
  const [downloadMsg, setDownloadMsg] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchExports({ format, status });
        if (!cancelled) {
          setRows(data.items);
          setCounts(data.countByStatus);
          setTotal(data.total);
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || "Couldn't load export history.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [format, status, nonce]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.fileName || "").toLowerCase().includes(q) ||
        (r.report || "").toLowerCase().includes(q) ||
        (r.generatedBy?.name || "").toLowerCase().includes(q) ||
        (r.generatedBy?.email || "").toLowerCase().includes(q)
    );
  }, [rows, query]);

  async function handleDownload(row) {
    setDownloadMsg(null);
    try {
      const res = await downloadExport(row.id);
      if (res?.file_path) {
        window.open(res.file_path, "_blank", "noopener,noreferrer");
      } else {
        setDownloadMsg("This export has no stored file yet.");
      }
    } catch (err) {
      setDownloadMsg(err?.message?.replace(/^repairClientApi \S+: /, "") || "Couldn't download this export.");
    }
  }

  return (
    <>
      {/* Summary tiles */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile label="Total exports" value={total} accent="#1d4ed8" />
        <SummaryTile label="Ready to download" value={counts.ready} accent="#16a34a" />
        <SummaryTile label="Generating" value={counts.generating} accent="#0ea5e9" />
        <SummaryTile label="Expired" value={counts.expired} accent="#9ca3af" />
      </div>

      {/* Filter bar */}
      <div className="mb-5 flex flex-col gap-3 rounded-[4px] border border-[#e5e7eb] bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-[360px]">
            <span className="pointer-events-none absolute left-3 top-1/2 grid size-4 -translate-y-1/2 place-items-center text-[#9ca3af]"><IconSearch /></span>
            <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by file name, report, or person…" className="pl-9" />
          </div>
          <p className="font-body text-[11px] text-[#9ca3af]">
            {filtered.length} of {total} export{total === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ChipRow options={FORMAT_FILTERS} value={format} onChange={setFormat} />
          <span className="h-5 w-px bg-[#e5e7eb]" />
          <ChipRow options={STATUS_FILTERS} value={status} onChange={setStatus} />
        </div>
      </div>

      {downloadMsg ? (
        <div className="mb-4 rounded-[2px] border border-[#fde68a] bg-[#fffbeb] px-4 py-2 font-body text-[12px] text-[#92400e]">
          {downloadMsg}
        </div>
      ) : null}

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
              <p className="font-body text-[13px] text-[#6b7280]">
                {total === 0 ? "No exports yet." : "No exports match these filters."}
              </p>
              {total === 0 ? (
                <p className="max-w-sm font-body text-[12px] text-[#9ca3af]">
                  Use “Export CSV” on the Overview to download data now. Archived, downloadable exports appear here once the export pipeline is enabled.
                </p>
              ) : (
                <button type="button" onClick={() => { setFormat("all"); setStatus("all"); setQuery(""); }} className="font-body text-[12px] font-medium text-[#1d4ed8] hover:underline">
                  Reset filters
                </button>
              )}
            </div>
          }
          columns={[
            {
              key: "file",
              label: "File",
              render: (r) => (
                <div className="flex min-w-0 items-center gap-3">
                  <FormatTile format={r.format} />
                  <div className="min-w-0">
                    <p className="truncate font-body text-[13px] font-medium text-[#11191f]">{r.fileName}</p>
                    <p className="truncate font-body text-[11px] text-[#6b7280]">{r.report}</p>
                  </div>
                </div>
              ),
            },
            {
              key: "range",
              label: "Date range",
              render: (r) => (
                <span className="inline-flex items-center gap-1.5 font-body text-[12px] text-[#6b7280]">
                  <span className="grid size-3.5 place-items-center text-[#9ca3af]"><IconCalendar /></span>
                  {r.range}
                </span>
              ),
            },
            {
              key: "generatedBy",
              label: "Generated by",
              render: (r) => (
                <div className="min-w-0">
                  <p className="truncate font-body text-[13px] text-[#11191f]">{r.generatedBy?.name}</p>
                  <p className="truncate font-body text-[11px] text-[#6b7280]">{r.generatedBy?.email}</p>
                </div>
              ),
            },
            { key: "generatedAt", label: "When", render: (r) => <span className="font-body text-[12px] text-[#6b7280]" title={r.generatedAt}>{formatRelative(r.generatedAt)}</span> },
            { key: "size", label: "Size", align: "right", render: (r) => <span className="font-body text-[12px] tabular-nums text-[#6b7280]">{formatBytes(r.sizeKb)}</span> },
            {
              key: "status",
              label: "Status",
              render: (r) => {
                const tone = EXPORT_STATUS_TONE[r.status] || { bg: "#f3f4f6", fg: "#6b7280", label: r.status };
                return <span className="inline-block rounded-full px-2 py-0.5 font-body text-[11px] font-medium" style={{ backgroundColor: tone.bg, color: tone.fg }}>{tone.label}</span>;
              },
            },
            {
              key: "action",
              label: "",
              align: "right",
              width: "120px",
              render: (r) =>
                r.status === "ready" ? (
                  <Button variant="secondary" size="sm" icon={<IconDownload />} onClick={() => handleDownload(r)}>Download</Button>
                ) : (
                  <span className="font-body text-[11px] text-[#9ca3af]">—</span>
                ),
            },
          ]}
        />
      )}
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

function FormatTile({ format }) {
  const isPdf = format === "PDF";
  const bg = isPdf ? "#fee2e2" : "#dcfce7";
  const fg = isPdf ? "#991b1b" : "#166534";
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-[3px] font-display text-[10px] font-bold tracking-[0.5px]" style={{ backgroundColor: bg, color: fg }}>
      {format}
    </span>
  );
}

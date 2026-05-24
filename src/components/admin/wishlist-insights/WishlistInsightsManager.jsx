"use client";

import { useMemo, useState } from "react";
import Button from "@/components/admin/shared/Button";
import { Chip, SearchInput, TextInput, TextArea } from "@/components/admin/shared/Form";
import DataTable from "@/components/admin/shared/DataTable";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import Modal from "@/components/admin/shared/Modal";
import KpiCard from "@/components/admin/shared/KpiCard";
import { IconSend } from "@/components/admin/shared/Icons";
import { WISHLIST_INSIGHTS, formatNumber } from "@/lib/mockAdmin";

const STOCK_FILTERS = [
  { key: "all",    label: "All" },
  { key: "in",     label: "In stock" },
  { key: "out",    label: "Out of stock" },
  { key: "low",    label: "Low-stock variants" },
];

export default function WishlistInsightsManager() {
  const [rows] = useState(WISHLIST_INSIGHTS);
  const [stockFilter, setStockFilter] = useState("all");
  const [search, setSearch] = useState("");
  // notifyTarget = single product. notifyAllOpen = bulk-to-all modal.
  const [notifyTarget, setNotifyTarget] = useState(null);
  const [notifyAllOpen, setNotifyAllOpen] = useState(false);
  const [bulkSubject, setBulkSubject] = useState("");
  const [bulkBody, setBulkBody] = useState("");
  const [bulkError, setBulkError] = useState("");
  const [sentToast, setSentToast] = useState("");

  const totals = useMemo(() => ({
    totalWishlistedItems: rows.reduce((acc, r) => acc + r.wishlistCount, 0),
    totalAddedThisWeek: rows.reduce((acc, r) => acc + r.addedLast7Days, 0),
    outOfStockCount: rows.filter((r) => !r.inStock).length,
    lowStockCount: rows.filter((r) => r.variantsLow > 0).length,
  }), [rows]);

  // Deduplicate per-customer for the bulk modal — production this would be
  // server-side. The mock approximates "unique wishlist holders" by taking
  // 80% of the sum (customers usually wishlist multiple items).
  const uniqueHolders = Math.round(totals.totalWishlistedItems * 0.8);

  const counts = useMemo(() => ({
    all: rows.length,
    in:  rows.filter((r) => r.inStock).length,
    out: rows.filter((r) => !r.inStock).length,
    low: rows.filter((r) => r.variantsLow > 0).length,
  }), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (stockFilter === "in"  && !r.inStock) return false;
        if (stockFilter === "out" && r.inStock)  return false;
        if (stockFilter === "low" && r.variantsLow === 0) return false;
        if (q && !r.product.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => b.wishlistCount - a.wishlistCount);
  }, [rows, stockFilter, search]);

  function showToast(msg) {
    setSentToast(msg);
    setTimeout(() => setSentToast(""), 3500);
  }

  function confirmNotifyOne() {
    if (!notifyTarget) return;
    showToast(
      `Email queued to ${formatNumber(notifyTarget.wishlistCount)} wishlist holders for ${notifyTarget.product}.`
    );
    setNotifyTarget(null);
  }

  function openBulk() {
    setBulkSubject("");
    setBulkBody("");
    setBulkError("");
    setNotifyAllOpen(true);
  }

  function sendBulk() {
    if (!bulkSubject.trim()) {
      setBulkError("Add a subject line.");
      return;
    }
    if (!bulkBody.trim()) {
      setBulkError("Add a message body.");
      return;
    }
    showToast(
      `Broadcast queued to ${formatNumber(uniqueHolders)} unique wishlist holders.`
    );
    setNotifyAllOpen(false);
  }

  const columns = [
    { key: "rank", label: "#", width: "48px", render: (row) => (
        <span className="font-display text-[12px] font-bold text-[#11191f]">{row._rank}</span>
      )},
    { key: "product", label: "Product", render: (row) => (
        <span className="font-body text-[13px] font-semibold text-[#11191f]">{row.product}</span>
      )},
    { key: "wishlistCount", label: "Wishlisted", align: "right", render: (row) => (
        <span className="font-display text-[13px] font-bold text-[#11191f]">
          {formatNumber(row.wishlistCount)}
        </span>
      )},
    { key: "addedLast7Days", label: "+7d", align: "right", render: (row) => (
        <span className="font-body text-[12px] text-[#16a34a]">+{formatNumber(row.addedLast7Days)}</span>
      )},
    { key: "stock", label: "Stock", render: (row) => (
        row.inStock
          ? <StatusBadge status={row.variantsLow > 0 ? "pending" : "active"} label={row.variantsLow > 0 ? `Low (${row.variantsLow})` : "In stock"} />
          : <StatusBadge status="cancelled" label="Out of stock" />
      )},
    { key: "actions", label: "", width: "220px", align: "right", render: (row) => (
        <Button
          size="sm"
          variant={row.inStock ? "secondary" : "primary"}
          onClick={(e) => { e.stopPropagation(); setNotifyTarget(row); }}
        >
          {row.inStock ? "Notify holders" : "Notify on restock"}
        </Button>
      )},
  ];

  const ranked = filtered.map((r, i) => ({ ...r, _rank: i + 1 }));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Total wishlisted" value={formatNumber(totals.totalWishlistedItems)} period="Across all products" />
        <KpiCard label="Added last 7 days" value={`+${formatNumber(totals.totalAddedThisWeek)}`} period="Demand trending" />
        <KpiCard label="Out of stock" value={formatNumber(totals.outOfStockCount)} period="Wishlisted but unbuyable" />
        <KpiCard label="Low-stock variants" value={formatNumber(totals.lowStockCount)} period="Wishlisted + thin inventory" />
      </div>

      {/* Bulk-notify CTA (#3) */}
      <div className="flex flex-col items-start gap-3 rounded-[4px] border border-[#e5e7eb] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-display text-[14px] font-bold uppercase tracking-[1px] text-[#11191f]">
            Notify all wishlist holders
          </p>
          <p className="mt-0.5 font-body text-[12px] text-[#6b7280]">
            Send one broadcast to every customer who has at least one product wishlisted (≈ {formatNumber(uniqueHolders)} unique holders).
          </p>
        </div>
        <Button icon={<IconSend />} onClick={openBulk}>
          Notify all
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STOCK_FILTERS.map((f) => (
          <Chip key={f.key} active={stockFilter === f.key} onClick={() => setStockFilter(f.key)}>
            {f.label} ({counts[f.key]})
          </Chip>
        ))}
      </div>

      <div className="sm:max-w-sm">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by product…" />
      </div>

      <DataTable
        columns={columns}
        rows={ranked}
        empty={<p className="font-body text-[13px] text-[#6b7280]">No matches.</p>}
      />

      {/* Per-product notify modal */}
      <Modal
        open={!!notifyTarget}
        title="Send restock / promo email"
        onClose={() => setNotifyTarget(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setNotifyTarget(null)}>Cancel</Button>
            <Button onClick={confirmNotifyOne}>Send notification</Button>
          </>
        }
      >
        {notifyTarget ? (
          <div className="flex flex-col gap-2">
            <p className="font-body text-[13px] text-[#11191f]">
              Notify <strong>{formatNumber(notifyTarget.wishlistCount)} customers</strong> who have <strong>{notifyTarget.product}</strong> in their wishlist.
            </p>
            <p className="font-body text-[12px] text-[#6b7280]">
              The email will be queued through the standard broadcast pipeline. Recipients can unsubscribe.
            </p>
          </div>
        ) : null}
      </Modal>

      {/* Bulk notify-all modal (#3) */}
      <Modal
        open={notifyAllOpen}
        title="Broadcast to all wishlist holders"
        width={600}
        onClose={() => setNotifyAllOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setNotifyAllOpen(false)}>Cancel</Button>
            <Button icon={<IconSend />} onClick={sendBulk}>Send to all</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="rounded-[2px] border border-[#dbeafe] bg-[#eff6ff] p-3">
            <p className="font-body text-[12px] text-[#1e3a8a]">
              This will reach <strong>{formatNumber(uniqueHolders)}</strong> unique customers who have at least one product wishlisted across the store.
            </p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
              Subject
            </span>
            <TextInput
              value={bulkSubject}
              onChange={(e) => { setBulkSubject(e.target.value); setBulkError(""); }}
              placeholder="A few of your saved items are back in stock"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
              Message
            </span>
            <TextArea
              rows={6}
              value={bulkBody}
              onChange={(e) => { setBulkBody(e.target.value); setBulkError(""); }}
              placeholder="Hi {{first_name}}, the items you saved are moving fast — here's a fresh look at what's still in stock…"
            />
            <span className="font-body text-[11px] text-[#6b7280]">
              You can use <code>{"{{first_name}}"}</code> — it&apos;s replaced per recipient when sent.
            </span>
          </label>

          {bulkError ? (
            <p className="font-body text-[11px] text-[#dc2626]">{bulkError}</p>
          ) : null}
        </div>
      </Modal>

      {sentToast ? (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-[4px] bg-[#11191f] px-4 py-3 font-body text-[13px] text-white shadow-lg">
          {sentToast}
        </div>
      ) : null}
    </div>
  );
}

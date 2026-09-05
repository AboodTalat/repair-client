"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/admin/shared/Button";
import { Chip, SearchInput, TextInput, TextArea } from "@/components/admin/shared/Form";
import DataTable from "@/components/admin/shared/DataTable";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import Modal from "@/components/admin/shared/Modal";
import Drawer from "@/components/admin/shared/Drawer";
import KpiCard from "@/components/admin/shared/KpiCard";
import { IconSend } from "@/components/admin/shared/Icons";
import { repairCall } from "@/lib/repairAuthedApi";

// Admin Wishlist Insights — WIRED TO BACKEND (myAppAdminListWishlistInsights /
// myAppAdminNotifyWishlistHolders). The list resolver returns the full set of
// wishlisted products (counts + recent adds + stock state) plus the real
// distinct-holder count; this component does search / stock-filter / chip-counts
// client-side over that list so the KPIs and the chips are derived from ONE row
// list and can't drift. Both Notify flows post real broadcast emails — the
// per-product modal and the bulk "Notify all" modal both compose a subject +
// message (the {{first_name}} merge tag is substituted per recipient server-side).

const STOCK_FILTERS = [
  { key: "all", label: "All" },
  { key: "in", label: "In stock" },
  { key: "out", label: "Out of stock" },
  { key: "low", label: "Low-stock variants" },
];

const numberFmt = new Intl.NumberFormat("en-US");
function formatNumber(n) {
  return numberFmt.format(Number(n) || 0);
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-CA");
}

// Merge tags the admin can drop into the subject / message. ONLY list tokens
// the backend actually substitutes (wishlistRestockEmail replaces {{first_name}}
// per recipient) — an unsupported token would otherwise reach customers as
// literal "{{…}}" text. Extend here AND in the email template together.
const MERGE_TAGS = [{ token: "{{first_name}}", label: "First name", hint: "Recipient's first name" }];

// Insert `token` into a controlled input/textarea at the caret (replacing any
// selection), then restore focus + caret after React commits the new value.
// `ref` points at the native element (React 19 forwards the ref through the
// Form components' {...props} spread). Falls back to appending if the element
// isn't available yet.
function insertToken(ref, current, setValue, token, onChange) {
  const el = ref.current;
  if (!el) {
    setValue(`${current}${token}`);
    onChange?.();
    return;
  }
  const start = el.selectionStart ?? current.length;
  const end = el.selectionEnd ?? current.length;
  const next = current.slice(0, start) + token + current.slice(end);
  setValue(next);
  onChange?.();
  const caret = start + token.length;
  requestAnimationFrame(() => {
    el.focus();
    try {
      el.setSelectionRange(caret, caret);
    } catch {
      /* element type may not support selection range — ignore */
    }
  });
}

// Clickable merge-tag palette shown under a field; clicking a tag inserts it.
function MergeTagRow({ onInsert }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="font-body text-[11px] text-[#6b7280]">Insert:</span>
      {MERGE_TAGS.map((t) => (
        <button
          key={t.token}
          type="button"
          title={`${t.hint} — inserts ${t.token}`}
          onClick={() => onInsert(t.token)}
          className="inline-flex h-6 items-center gap-1 rounded-full border border-[#dbeafe] bg-[#eff6ff] px-2 font-body text-[11px] font-medium text-[#1e3a8a] transition-colors hover:bg-[#dbeafe]"
        >
          + {t.label}
        </button>
      ))}
      <span className="font-body text-[11px] text-[#9ca3af]">replaced per recipient when sent</span>
    </div>
  );
}

// Map a server insight item → the display row shape this component renders.
function mapRow(it) {
  return {
    id: Number(it.product_id),
    productId: Number(it.product_id),
    product: it.name ?? "Untitled product",
    wishlistCount: Number(it.wishlist_count) || 0,
    addedLast7Days: Number(it.added_last_7_days) || 0,
    inStock: !!it.in_stock,
    variantsLow: Number(it.low_stock_variants) || 0,
  };
}

export default function WishlistInsightsManager() {
  const [rows, setRows] = useState([]);
  const [uniqueHolders, setUniqueHolders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  // The resolver caps the list and returns { truncated, cap }. Nothing read
  // them, so its own comment ("we now tell the ADMIN as well as the log") was
  // untrue from where the admin sits — and every KPI and chip on this page is
  // derived client-side from `rows`, so a truncated list silently undercounts
  // all four of them.
  const [truncation, setTruncation] = useState(null);

  const [stockFilter, setStockFilter] = useState("all");
  const [search, setSearch] = useState("");

  // notifyTarget = single product compose modal. notifyAllOpen = bulk modal.
  const [notifyTarget, setNotifyTarget] = useState(null);
  const [oneSubject, setOneSubject] = useState("");
  const [oneBody, setOneBody] = useState("");
  const [oneError, setOneError] = useState("");

  const [notifyAllOpen, setNotifyAllOpen] = useState(false);
  const [bulkSubject, setBulkSubject] = useState("");
  const [bulkBody, setBulkBody] = useState("");
  const [bulkError, setBulkError] = useState("");

  const [sending, setSending] = useState(false);
  const [sentToast, setSentToast] = useState("");

  // Per-product holders drawer (who wishlisted this product — email + phone).
  const [holdersTarget, setHoldersTarget] = useState(null);
  const [holders, setHolders] = useState([]);
  const [holdersTotal, setHoldersTotal] = useState(0);
  const [holdersLoading, setHoldersLoading] = useState(false);
  const [holdersError, setHoldersError] = useState(null);

  const toastTimerRef = useRef(null);
  // Monotonic token so a slow holders response for product A can't overwrite a
  // newer request for product B (or a closed drawer).
  const holdersReqRef = useRef(0);

  // Native field refs for inserting merge tags at the caret (React 19 forwards
  // these through the Form components' {...props} spread).
  const oneSubjectRef = useRef(null);
  const oneBodyRef = useRef(null);
  const bulkSubjectRef = useRef(null);
  const bulkBodyRef = useRef(null);

  // Load once on mount. NOTE: rely on the `cancelled` flag alone — do NOT add a
  // `mountedRef`-style "run once" guard on top of it. Under React Strict Mode's
  // dev mount→unmount→mount, the first cleanup sets cancelled=true while a
  // run-once guard would block the second mount from re-fetching, so the only
  // in-flight request bails before clearing `loading` and the page hangs on
  // "Loading…" forever. The double read here is harmless (idempotent query).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await repairCall("myAppAdminListWishlistInsights", {}, { isQuery: true });
        if (cancelled) return;
        setRows(Array.isArray(data?.items) ? data.items.map(mapRow) : []);
        setUniqueHolders(Number(data?.uniqueHolders) || 0);
        setTruncation(data?.truncated ? { cap: Number(data?.cap) || 0 } : null);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err?.message || "Failed to load wishlist insights");
        setRows([]);
        setUniqueHolders(0);
        setTruncation(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Clean up any pending toast timer on unmount.
  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  // KPIs + chip counts are BOTH derived from `rows` so they stay consistent.
  const totals = {
    totalWishlistedItems: rows.reduce((acc, r) => acc + r.wishlistCount, 0),
    totalAddedThisWeek: rows.reduce((acc, r) => acc + r.addedLast7Days, 0),
    outOfStockCount: rows.filter((r) => !r.inStock).length,
    lowStockProducts: rows.filter((r) => r.variantsLow > 0).length,
  };

  const counts = {
    all: rows.length,
    in: rows.filter((r) => r.inStock).length,
    out: rows.filter((r) => !r.inStock).length,
    low: rows.filter((r) => r.variantsLow > 0).length,
  };

  const q = search.trim().toLowerCase();
  const filtered = rows
    .filter((r) => {
      if (stockFilter === "in" && !r.inStock) return false;
      if (stockFilter === "out" && r.inStock) return false;
      if (stockFilter === "low" && r.variantsLow === 0) return false;
      if (q && !r.product.toLowerCase().includes(q)) return false;
      return true;
    })
    .sort((a, b) => b.wishlistCount - a.wishlistCount);
  const ranked = filtered.map((r, i) => ({ ...r, _rank: i + 1 }));

  function showToast(msg) {
    setSentToast(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setSentToast(""), 3500);
  }

  function openNotifyOne(row) {
    setNotifyTarget(row);
    setOneSubject("");
    setOneBody("");
    setOneError("");
  }

  async function openHolders(row) {
    setHoldersTarget(row);
    setHolders([]);
    setHoldersTotal(0);
    setHoldersError(null);
    setHoldersLoading(true);
    const reqId = ++holdersReqRef.current;
    try {
      const data = await repairCall(
        "myAppAdminListWishlistProductHolders",
        { productId: row.productId, limit: 200 },
        { isQuery: true }
      );
      if (reqId !== holdersReqRef.current) return;
      setHolders(Array.isArray(data?.holders) ? data.holders : []);
      setHoldersTotal(Number(data?.total) || 0);
    } catch (err) {
      if (reqId !== holdersReqRef.current) return;
      setHoldersError(err?.message || "Failed to load wishlist holders");
    } finally {
      if (reqId === holdersReqRef.current) setHoldersLoading(false);
    }
  }

  function closeHolders() {
    // Invalidate any in-flight request so its late response is dropped.
    holdersReqRef.current += 1;
    setHoldersTarget(null);
  }

  async function confirmNotifyOne() {
    if (!notifyTarget || sending) return;
    if (!oneSubject.trim()) {
      setOneError("Add a subject line.");
      return;
    }
    if (!oneBody.trim()) {
      setOneError("Add a message body.");
      return;
    }
    setSending(true);
    setOneError("");
    try {
      const res = await repairCall(
        "myAppAdminNotifyWishlistHolders",
        {
          scope: "product",
          productId: notifyTarget.productId,
          subject: oneSubject.trim(),
          bodyHtml: oneBody,
        },
        { isQuery: false }
      );
      showToast(res?.message || `Notification queued for ${notifyTarget.product}.`);
      setNotifyTarget(null);
    } catch (err) {
      setOneError(err?.message || "Failed to send the notification.");
    } finally {
      setSending(false);
    }
  }

  function openBulk() {
    setBulkSubject("");
    setBulkBody("");
    setBulkError("");
    setNotifyAllOpen(true);
  }

  async function sendBulk() {
    if (sending) return;
    if (!bulkSubject.trim()) {
      setBulkError("Add a subject line.");
      return;
    }
    if (!bulkBody.trim()) {
      setBulkError("Add a message body.");
      return;
    }
    setSending(true);
    setBulkError("");
    try {
      const res = await repairCall(
        "myAppAdminNotifyWishlistHolders",
        { scope: "all", subject: bulkSubject.trim(), bodyHtml: bulkBody },
        { isQuery: false }
      );
      showToast(res?.message || "Broadcast queued to all wishlist holders.");
      setNotifyAllOpen(false);
    } catch (err) {
      setBulkError(err?.message || "Failed to send the broadcast.");
    } finally {
      setSending(false);
    }
  }

  const columns = [
    {
      key: "rank",
      label: "#",
      width: "48px",
      render: (row) => (
        <span className="font-display text-[12px] font-bold text-[#11191f]">{row._rank}</span>
      ),
    },
    {
      key: "product",
      label: "Product",
      render: (row) => (
        <span className="font-body text-[13px] font-semibold text-[#11191f]">{row.product}</span>
      ),
    },
    {
      key: "wishlistCount",
      label: "Wishlisted",
      align: "right",
      render: (row) => (
        <span className="font-display text-[13px] font-bold text-[#11191f]">
          {formatNumber(row.wishlistCount)}
        </span>
      ),
    },
    {
      key: "addedLast7Days",
      label: "+7d",
      align: "right",
      render: (row) => (
        <span className="font-body text-[12px] text-[#16a34a]">+{formatNumber(row.addedLast7Days)}</span>
      ),
    },
    {
      key: "stock",
      label: "Stock",
      render: (row) =>
        row.inStock ? (
          <StatusBadge
            status={row.variantsLow > 0 ? "pending" : "active"}
            label={row.variantsLow > 0 ? `Low (${row.variantsLow})` : "In stock"}
          />
        ) : (
          <StatusBadge status="cancelled" label="Out of stock" />
        ),
    },
    {
      key: "actions",
      label: "",
      width: "220px",
      align: "right",
      render: (row) => (
        <Button
          size="sm"
          variant={row.inStock ? "secondary" : "primary"}
          onClick={(e) => {
            e.stopPropagation();
            openNotifyOne(row);
          }}
        >
          {row.inStock ? "Notify holders" : "Notify on restock"}
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {loadError ? (
        <div className="rounded-[4px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 font-body text-[13px] text-[#dc2626]">
          {loadError}
        </div>
      ) : null}

      {truncation ? (
        <div className="rounded-[4px] border border-[#fde68a] bg-[#fffbeb] px-4 py-3 font-body text-[13px] text-[#92400e]">
          Showing the top {formatNumber(truncation?.cap)} wishlisted products — there are more. The counters below
          cover only what is listed here.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Total wishlisted" value={formatNumber(totals.totalWishlistedItems)} period="Across all products" />
        <KpiCard label="Added last 7 days" value={`+${formatNumber(totals.totalAddedThisWeek)}`} period="Demand trending" />
        <KpiCard label="Out of stock" value={formatNumber(totals.outOfStockCount)} period="Wishlisted but unbuyable" />
        <KpiCard label="Low-stock products" value={formatNumber(totals.lowStockProducts)} period="Wishlisted + thin inventory" />
      </div>

      {/* Bulk-notify CTA */}
      <div className="flex flex-col items-start gap-3 rounded-[4px] border border-[#e5e7eb] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-display text-[14px] font-bold uppercase tracking-[1px] text-[#11191f]">
            Notify all wishlist holders
          </p>
          <p className="mt-0.5 font-body text-[12px] text-[#6b7280]">
            Send one broadcast to every customer who has at least one product wishlisted ({formatNumber(uniqueHolders)} unique holder{uniqueHolders === 1 ? "" : "s"}).
          </p>
        </div>
        <Button icon={<IconSend />} onClick={openBulk} disabled={loading || uniqueHolders === 0}>
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
        onRowClick={(row) => openHolders(row)}
        empty={
          <p className="font-body text-[13px] text-[#6b7280]">
            {loading
              ? "Loading wishlist insights…"
              : rows.length === 0
                ? "No products have been wishlisted yet."
                : "No matches."}
          </p>
        }
      />

      {/* Per-product holders drawer (email + phone of who wishlisted it) */}
      <Drawer
        open={!!holdersTarget}
        onClose={closeHolders}
        title="Wishlist holders"
        subtitle={holdersTarget ? holdersTarget.product : undefined}
        width={520}
        footer={
          holdersTarget ? (
            <Button
              icon={<IconSend />}
              onClick={() => {
                const t = holdersTarget;
                closeHolders();
                openNotifyOne(t);
              }}
            >
              Notify these holders
            </Button>
          ) : null
        }
      >
        {holdersError ? (
          <div className="mb-4 rounded-[4px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 font-body text-[13px] text-[#dc2626]">
            {holdersError}
          </div>
        ) : null}

        {holdersLoading ? (
          <div className="flex items-center gap-3 px-1 py-6">
            <div className="size-5 animate-spin rounded-full border-2 border-[#e5e7eb] border-t-[#11191f]" />
            <p className="font-body text-[13px] text-[#6b7280]">Loading holders…</p>
          </div>
        ) : holders.length === 0 && !holdersError ? (
          <p className="font-body text-[13px] text-[#6b7280]">No holders to show.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="font-body text-[12px] text-[#6b7280]">
              Showing {formatNumber(holders.length)} of {formatNumber(holdersTotal)} customer{holdersTotal === 1 ? "" : "s"} who saved this product.
            </p>
            <ul className="flex flex-col divide-y divide-[#f3f4f6] rounded-[4px] border border-[#e5e7eb]">
              {holders.map((h) => (
                <li key={h.user_id} className="flex items-start justify-between gap-3 px-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-body text-[13px] font-medium text-[#11191f]">
                      {h.email || "—"}
                    </p>
                    <p className="font-body text-[12px] text-[#6b7280]">
                      {h.phone ? h.phone : "No phone on file"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-body text-[11px] text-[#9ca3af]">{formatDate(h.added_at)}</span>
                    {h.is_active ? null : (
                      <StatusBadge status="cancelled" label="Inactive" />
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {holdersTotal > holders.length ? (
              <p className="font-body text-[11px] text-[#9ca3af]">
                Showing the {formatNumber(holders.length)} most recent. Use “Notify these holders” to reach everyone.
              </p>
            ) : null}
          </div>
        )}
      </Drawer>

      {/* Per-product notify modal */}
      <Modal
        open={!!notifyTarget}
        title="Send restock / promo email"
        width={600}
        onClose={() => (sending ? null : setNotifyTarget(null))}
        footer={
          <>
            <Button variant="secondary" onClick={() => setNotifyTarget(null)} disabled={sending}>
              Cancel
            </Button>
            <Button icon={<IconSend />} onClick={confirmNotifyOne} disabled={sending}>
              {sending ? "Sending…" : "Send notification"}
            </Button>
          </>
        }
      >
        {notifyTarget ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-[2px] border border-[#dbeafe] bg-[#eff6ff] p-3">
              <p className="font-body text-[12px] text-[#1e3a8a]">
                Notify up to <strong>{formatNumber(notifyTarget?.wishlistCount)}</strong> customer{notifyTarget?.wishlistCount === 1 ? "" : "s"} who have <strong>{notifyTarget?.product}</strong> in their wishlist.
              </p>
              {/* This count is wishlist ROWS; the send skips deactivated
                  accounts, so the two legitimately differ. Say so here rather
                  than showing a number the result will quietly contradict —
                  the response reports what was actually queued. */}
              <p className="mt-1 font-body text-[11px] text-[#1e3a8a]/70">
                Deactivated accounts are skipped. Emails are queued and delivered in the background.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                Subject
              </span>
              <TextInput
                ref={oneSubjectRef}
                value={oneSubject}
                onChange={(e) => {
                  setOneSubject(e.target.value);
                  setOneError("");
                }}
                placeholder={`${notifyTarget?.product} is waiting for you`}
              />
              <MergeTagRow
                onInsert={(token) =>
                  insertToken(oneSubjectRef, oneSubject, setOneSubject, token, () => setOneError(""))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                Message
              </span>
              <TextArea
                ref={oneBodyRef}
                rows={6}
                value={oneBody}
                onChange={(e) => {
                  setOneBody(e.target.value);
                  setOneError("");
                }}
                placeholder="Hi {{first_name}}, the item you saved is back and selling fast…"
              />
              <MergeTagRow
                onInsert={(token) =>
                  insertToken(oneBodyRef, oneBody, setOneBody, token, () => setOneError(""))
                }
              />
            </div>

            {oneError ? <p className="font-body text-[11px] text-[#dc2626]">{oneError}</p> : null}
          </div>
        ) : null}
      </Modal>

      {/* Bulk notify-all modal */}
      <Modal
        open={notifyAllOpen}
        title="Broadcast to all wishlist holders"
        width={600}
        onClose={() => (sending ? null : setNotifyAllOpen(false))}
        footer={
          <>
            <Button variant="secondary" onClick={() => setNotifyAllOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button icon={<IconSend />} onClick={sendBulk} disabled={sending}>
              {sending ? "Sending…" : "Send to all"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="rounded-[2px] border border-[#dbeafe] bg-[#eff6ff] p-3">
            <p className="font-body text-[12px] text-[#1e3a8a]">
              This will reach up to <strong>{formatNumber(uniqueHolders)}</strong> unique customer{uniqueHolders === 1 ? "" : "s"} who have at least one product wishlisted across the store.
            </p>
            <p className="mt-1 font-body text-[11px] text-[#1e3a8a]/70">
              Deactivated accounts are skipped, and a single send is capped at 500 recipients — the result will say
              if any were left over. Emails are queued and delivered in the background.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
              Subject
            </span>
            <TextInput
              ref={bulkSubjectRef}
              value={bulkSubject}
              onChange={(e) => {
                setBulkSubject(e.target.value);
                setBulkError("");
              }}
              placeholder="A few of your saved items are back in stock"
            />
            <MergeTagRow
              onInsert={(token) =>
                insertToken(bulkSubjectRef, bulkSubject, setBulkSubject, token, () => setBulkError(""))
              }
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
              Message
            </span>
            <TextArea
              ref={bulkBodyRef}
              rows={6}
              value={bulkBody}
              onChange={(e) => {
                setBulkBody(e.target.value);
                setBulkError("");
              }}
              placeholder="Hi {{first_name}}, the items you saved are moving fast — here's a fresh look at what's still in stock…"
            />
            <MergeTagRow
              onInsert={(token) =>
                insertToken(bulkBodyRef, bulkBody, setBulkBody, token, () => setBulkError(""))
              }
            />
          </div>

          {bulkError ? <p className="font-body text-[11px] text-[#dc2626]">{bulkError}</p> : null}
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

"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  FAILED_DELIVERY_REASONS,
  deliveryStatusLabel,
  deliveryTone,
  fetchDeliveryOrder,
  formatJOD,
  paymentInfo,
  reasonLabel,
  updateDeliveryStatus,
} from "@/lib/delivery";
import Button from "@/components/admin/shared/Button";
import Modal from "@/components/admin/shared/Modal";
import {
  IconCheck,
  IconAlert,
  IconChevronRight,
  IconMail,
} from "@/components/admin/shared/Icons";

function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }) {
  const tone = deliveryTone(status);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-body text-[11px] font-semibold uppercase tracking-[0.6px]"
      style={{ backgroundColor: tone.bg, color: tone.fg }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: tone.dot }} />
      {deliveryStatusLabel(status)}
    </span>
  );
}

function PaymentBadge({ order }) {
  const p = paymentInfo(order);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-body text-[11px] font-semibold uppercase tracking-[0.6px]"
      style={{ backgroundColor: p.tone.bg, color: p.tone.fg }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: p.tone.dot }} />
      {p.label}
    </span>
  );
}

function Section({ title, eyebrow, children, actions }) {
  return (
    <section className="rounded-[4px] border border-[#e5e7eb] bg-white">
      <header className="flex items-center justify-between gap-3 border-b border-[#f3f4f6] px-5 py-3">
        <div className="flex flex-col leading-tight">
          {eyebrow ? (
            <span className="font-body text-[10px] font-medium uppercase tracking-[1.4px] text-[#6b7280]">
              {eyebrow}
            </span>
          ) : null}
          <h3 className="font-display text-[14px] font-bold uppercase tracking-[1.2px] text-[#11191f]">
            {title}
          </h3>
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function MetaRow({ label, value, mono }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-[#f3f4f6] py-2 last:border-b-0">
      <span className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
        {label}
      </span>
      <span className={"text-right font-body text-[13px] text-[#11191f] " + (mono ? "tabular-nums" : "")}>
        {value}
      </span>
    </div>
  );
}

export default function OrderDetailPage({ params }) {
  const { id } = use(params);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [failOpen, setFailOpen] = useState(false);
  const [confirmDeliveredOpen, setConfirmDeliveredOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [toast, setToast] = useState(null); // {kind, text}
  const [reloadNonce, setReloadNonce] = useState(0);

  // Fetch (and refetch on reloadNonce) the authoritative order. The async body
  // is declared INSIDE the effect — the documented lint-clean pattern — so the
  // synchronous setLoading flip doesn't trip react-hooks/set-state-in-effect. A
  // status transition bumps reloadNonce to pull fresh status + history.
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await fetchDeliveryOrder(id);
        if (!cancelled) setOrder(data);
      } catch (err) {
        if (!cancelled) {
          setOrder(null);
          setLoadError(err?.message || "Couldn't load this order.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [id, reloadNonce]);

  async function runTransition(status, opts, toastMsg) {
    setBusy(true);
    setActionError(null);
    try {
      await updateDeliveryStatus(id, status, opts);
      setToast({ kind: status === "failed_delivery" ? "failed" : "delivered", text: toastMsg });
      setReloadNonce((n) => n + 1); // refetch authoritative status + history
    } catch (err) {
      setActionError(err?.message || "Couldn't update the order. Try again.");
    } finally {
      setBusy(false);
      setConfirmDeliveredOpen(false);
      setFailOpen(false);
    }
  }

  if (loading) {
    return (
      <div className="grid place-items-center rounded-[4px] border border-[#e5e7eb] bg-white px-6 py-20">
        <span className="size-7 animate-spin rounded-full border-2 border-[#e5e7eb] border-t-[#11191f]" />
      </div>
    );
  }

  if (loadError || !order) {
    return (
      <div className="grid place-items-center rounded-[4px] border border-dashed border-[#e5e7eb] bg-white px-6 py-20">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="font-display text-[16px] font-bold uppercase tracking-[1px] text-[#11191f]">
            Order not found
          </span>
          <p className="max-w-sm font-body text-[13px] text-[#6b7280]">
            {loadError ||
              "This order isn’t assigned to you, or the id doesn’t match any record."}
          </p>
          <Link
            href="/r3pr-dispatch/dashboard"
            className="inline-flex h-10 items-center rounded-[2px] bg-[#11191f] px-4 font-display text-[12px] font-semibold uppercase tracking-[1.2px] text-white hover:bg-[#1c2630]"
          >
            Back to assigned orders
          </Link>
        </div>
      </div>
    );
  }

  const orderNo = order.order_number || `#${order.id}`;
  const canStart = order.status === "dispatched";
  const canFinish = order.status === "out_for_delivery";
  const isActive = canStart || canFinish;
  const failedEntry = (order.history || []).filter((h) => h.status === "failed_delivery").slice(-1)[0] || null;

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 font-body text-[11px] uppercase tracking-[1px] text-[#6b7280]">
        <Link href="/r3pr-dispatch/dashboard" className="hover:text-[#11191f]">
          Assigned orders
        </Link>
        <span className="grid size-3 place-items-center">
          <IconChevronRight />
        </span>
        <span className="text-[#11191f]">{orderNo}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <span className="font-body text-[11px] font-medium uppercase tracking-[1.4px] text-[#6b7280]">
            Order {orderNo}
          </span>
          <h1 className="font-display text-[24px] font-bold uppercase leading-none tracking-[1px] text-[#11191f] md:text-[28px]">
            {order.customer?.name}
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={order.status} />
            <PaymentBadge order={order} />
            {order.assigned_at ? (
              <span className="font-body text-[12px] text-[#6b7280]">
                Assigned {fmtDateTime(order.assigned_at)}
              </span>
            ) : null}
          </div>
        </div>

        {isActive ? (
          <div className="flex flex-wrap items-center gap-2">
            {canStart ? (
              <Button
                variant="primary"
                size="md"
                disabled={busy}
                onClick={() => runTransition("out_for_delivery", undefined, `${orderNo} started — out for delivery`)}
              >
                Start delivery
              </Button>
            ) : (
              <>
                <Button
                  variant="danger"
                  size="md"
                  disabled={busy}
                  icon={<span className="grid size-4 place-items-center"><IconAlert /></span>}
                  onClick={() => setFailOpen(true)}
                >
                  Failed Delivery
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  disabled={busy}
                  icon={<span className="grid size-4 place-items-center"><IconCheck /></span>}
                  onClick={() => setConfirmDeliveredOpen(true)}
                >
                  Mark Delivered
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-end gap-1 font-body text-[12px] text-[#6b7280]">
            {order.status === "delivered" ? <span>Delivered {fmtDateTime(order.delivered_at)}</span> : null}
            {order.status === "failed_delivery" ? <span>Failed {fmtDateTime(order.failed_at)}</span> : null}
            <span className="italic">Status is now terminal.</span>
          </div>
        )}
      </div>

      {actionError ? (
        <div className="rounded-[2px] border border-[#fecaca] bg-[#fef2f2] px-4 py-2 font-body text-[12px] text-[#991b1b]">
          {actionError}
        </div>
      ) : null}

      {/* 2-col grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-4 xl:col-span-2">
          {/* Customer */}
          <Section title="Customer" eyebrow="Recipient">
            <div className="flex flex-col gap-2">
              <span className="font-display text-[16px] font-bold uppercase tracking-[0.8px] text-[#11191f]">
                {order.customer?.name}
              </span>
              <div className="flex flex-wrap gap-2">
                {order.customer?.phone ? (
                  <a
                    href={`tel:${order.customer.phone}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-[2px] bg-[#11191f] px-3 font-display text-[11px] font-semibold uppercase tracking-[1.1px] text-white hover:bg-[#1c2630]"
                  >
                    <span className="grid size-3.5 place-items-center" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" strokeLinejoin="round" />
                      </svg>
                    </span>
                    Call customer
                  </a>
                ) : null}
                {order.customer?.email ? (
                  <a
                    href={`mailto:${order.customer.email}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-[2px] border border-[#e5e7eb] bg-white px-3 font-display text-[11px] font-semibold uppercase tracking-[1.1px] text-[#11191f] hover:bg-[#f3f4f6]"
                  >
                    <span className="grid size-3.5 place-items-center" aria-hidden="true">
                      <IconMail />
                    </span>
                    Email
                  </a>
                ) : null}
              </div>
              <div className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2">
                <MetaRow label="Phone" value={order.customer?.phone || "—"} mono />
                <MetaRow label="Email" value={order.customer?.email || "—"} />
              </div>
            </div>
          </Section>

          {/* Delivery address */}
          <Section title="Delivery Address" eyebrow={order.address_label || "Drop-off"}>
            <div className="flex flex-col gap-2">
              <p className="font-body text-[14px] text-[#11191f]">{order.address || "—"}</p>
              {order.address ? (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex h-9 w-fit items-center gap-1.5 rounded-[2px] border border-[#e5e7eb] bg-white px-3 font-display text-[11px] font-semibold uppercase tracking-[1.1px] text-[#11191f] hover:bg-[#f3f4f6]"
                >
                  <span className="grid size-3.5 place-items-center" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s7-7.58 7-13a7 7 0 1 0-14 0c0 5.42 7 13 7 13z" />
                      <circle cx="12" cy="9" r="2.5" />
                    </svg>
                  </span>
                  Open in Maps
                </a>
              ) : null}
            </div>
          </Section>

          {/* Items */}
          <Section title="Items" eyebrow={`${order.items.length} line${order.items.length === 1 ? "" : "s"}`}>
            <div className="flex flex-col divide-y divide-[#f3f4f6]">
              {order.items.map((it) => (
                <div key={it.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-[2px] border border-[#e5e7eb] font-body text-[10px] font-semibold uppercase tracking-[1px]"
                    style={{ color: "#11191f" }}
                  >
                    × {it.qty}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="font-body text-[13px] font-medium text-[#11191f]">{it.product}</span>
                    <span className="font-body text-[11px] uppercase tracking-[1px] text-[#6b7280]">
                      {it.color} · Size {it.size}
                    </span>
                  </div>
                  <span className="font-body text-[13px] tabular-nums text-[#11191f]">
                    {formatJOD(it.line_total)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-1 border-t border-[#f3f4f6] pt-3">
              <MetaRow label="Subtotal" value={formatJOD(order.subtotal)} mono />
              {order.shipping_amount > 0 ? <MetaRow label="Shipping" value={formatJOD(order.shipping_amount)} mono /> : null}
              {order.tax_amount > 0 ? <MetaRow label="Tax" value={formatJOD(order.tax_amount)} mono /> : null}
              <MetaRow
                label="Order total"
                value={<span className="font-display font-bold tracking-[0.5px]">{formatJOD(order.total)}</span>}
                mono
              />
              {order.is_cod && order.cod_amount > 0 ? (
                <div
                  className="mt-2 flex items-center justify-between rounded-[2px] px-3 py-2"
                  style={{ backgroundColor: "#fef3c7", color: "#92400e" }}
                >
                  <span className="font-body text-[11px] font-semibold uppercase tracking-[1px]">
                    Collect on delivery
                  </span>
                  <span className="font-display text-[14px] font-bold tabular-nums">
                    {formatJOD(order.cod_amount)}
                  </span>
                </div>
              ) : null}
            </div>
          </Section>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <Section title="Contact" eyebrow="Reach out">
            <div className="flex flex-col gap-1">
              <MetaRow label="Phone" value={order.customer?.phone || "—"} mono />
              <MetaRow label="Email" value={order.customer?.email || "—"} />
              <MetaRow label="Payment" value={order.payment_method_label || "—"} />
              <MetaRow label="Payment status" value={<PaymentBadge order={order} />} />
            </div>
          </Section>

          <Section title="Order info" eyebrow="Meta">
            <div className="flex flex-col gap-1">
              <MetaRow label="Placed" value={fmtDateTime(order.placed_at)} />
              {order.assigned_at ? <MetaRow label="Assigned" value={fmtDateTime(order.assigned_at)} /> : null}
              {order.delivered_at ? <MetaRow label="Delivered" value={fmtDateTime(order.delivered_at)} /> : null}
              {order.failed_at ? (
                <>
                  <MetaRow label="Failed" value={fmtDateTime(order.failed_at)} />
                  {failedEntry?.note ? <MetaRow label="Reason" value={failedEntry.note} /> : null}
                </>
              ) : null}
            </div>
          </Section>

          <Section title="Status history" eyebrow="Timeline">
            <ol className="flex flex-col gap-3">
              {[...order.history].reverse().map((h, idx) => {
                const tone = deliveryTone(h.status);
                return (
                  <li key={idx} className="flex gap-3">
                    <span className="mt-1 grid size-2 shrink-0 place-items-center rounded-full" style={{ backgroundColor: tone.dot }} />
                    <div className="flex min-w-0 flex-1 flex-col leading-tight">
                      <span className="font-body text-[12px] font-medium text-[#11191f]">
                        {deliveryStatusLabel(h.status)}
                        {h.note ? <span className="ml-1 text-[#6b7280]">· {h.note}</span> : null}
                      </span>
                      <span className="font-body text-[10px] uppercase tracking-[1px] text-[#6b7280]">
                        {fmtDateTime(h.at)} · {h.by}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Section>
        </div>
      </div>

      {/* Confirm delivered modal */}
      <Modal
        open={confirmDeliveredOpen}
        onClose={() => (busy ? null : setConfirmDeliveredOpen(false))}
        title="Confirm Delivery"
        footer={
          <>
            <Button variant="secondary" size="md" disabled={busy} onClick={() => setConfirmDeliveredOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={busy}
              onClick={() => runTransition("delivered", undefined, `${orderNo} marked as Delivered`)}
            >
              {busy ? "Saving…" : "Yes, mark Delivered"}
            </Button>
          </>
        }
      >
        <p className="font-body text-[13px] text-[#11191f]">
          Mark <span className="font-semibold">{orderNo}</span> as delivered to{" "}
          <span className="font-semibold">{order.customer?.name}</span>?
        </p>
        {order.is_cod && order.cod_amount > 0 ? (
          <p className="mt-3 rounded-[2px] px-3 py-2 font-body text-[12px]" style={{ backgroundColor: "#fef3c7", color: "#92400e" }}>
            Confirm you collected{" "}
            <span className="font-display font-bold">{formatJOD(order.cod_amount)}</span> in cash before marking as delivered.
          </p>
        ) : null}
      </Modal>

      {/* Failed-delivery reason modal */}
      <FailedDeliveryModal
        open={failOpen}
        busy={busy}
        onClose={() => (busy ? null : setFailOpen(false))}
        onSubmit={(reasonKey, note) =>
          runTransition(
            "failed_delivery",
            { reason: reasonLabel(reasonKey), note },
            `${orderNo} marked as Failed Delivery`
          )
        }
        orderNo={orderNo}
      />

      {toast ? <Toast kind={toast.kind} text={toast.text} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}

function FailedDeliveryModal({ open, busy, onClose, onSubmit, orderNo }) {
  const [reason, setReason] = useState("customer_unavailable");
  const [note, setNote] = useState("");

  function handleSubmit() {
    onSubmit(reason, note.trim());
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Failed Delivery"
      width={520}
      footer={
        <>
          <Button variant="secondary" size="md" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button variant="dangerSolid" size="md" disabled={busy} onClick={handleSubmit}>
            {busy ? "Saving…" : "Mark as Failed"}
          </Button>
        </>
      }
    >
      <p className="mb-3 font-body text-[13px] text-[#11191f]">
        Why couldn’t <span className="font-semibold">{orderNo}</span> be delivered?
      </p>
      <div className="flex flex-col gap-2">
        {FAILED_DELIVERY_REASONS.map((r) => {
          const selected = reason === r.key;
          return (
            <label
              key={r.key}
              className={
                "flex cursor-pointer items-center gap-3 rounded-[2px] border px-3 py-2.5 font-body text-[13px] transition-colors " +
                (selected ? "border-[#11191f] bg-[#f9fafb]" : "border-[#e5e7eb] bg-white hover:border-[#cbd5e1]")
              }
            >
              <input
                type="radio"
                name="failed-reason"
                value={r.key}
                checked={selected}
                onChange={() => setReason(r.key)}
                className="size-4 accent-[#11191f]"
              />
              <span className="text-[#11191f]">{r.label}</span>
            </label>
          );
        })}
      </div>
      <label className="mt-4 flex flex-col gap-1.5">
        <span className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
          Internal note (optional — not shown to the customer)
        </span>
        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ops-only context — e.g. 'left a voicemail, will retry tomorrow'."
          className="rounded-[2px] border border-[#e5e7eb] bg-white px-3 py-2 font-body text-[13px] text-[#11191f] outline-none placeholder:text-[#9ca3af] focus:border-[#11191f]"
        />
      </label>
    </Modal>
  );
}

function Toast({ kind, text, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  const bg = kind === "delivered" ? "#16a34a" : "#dc2626";
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-[72px] z-40 mx-auto w-fit max-w-[92vw] rounded-[2px] px-4 py-2 font-body text-[12px] font-semibold uppercase tracking-[1px] text-white shadow-lg"
      style={{ backgroundColor: bg }}
    >
      {text}
    </div>
  );
}

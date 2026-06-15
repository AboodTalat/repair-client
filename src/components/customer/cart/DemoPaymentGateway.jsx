"use client";

import { useEffect, useRef, useState } from "react";
import { formatJOD } from "@/lib/mockCart";

// ──────────────────────────────────────────────────────────────────────
// DemoPaymentGateway — a SIMULATED payment-authorization step.
//
// ⚠️  THIS IS A PLACEHOLDER. There is no real payment processor and nothing
//     is charged. It exists so the checkout flow (and the /checkout/failed
//     screen) is end-to-end exercisable while the real gateway is pending.
//
// Card details are NOT entered here — the customer adds a card via
// AddCardDrawer on the payment page (or uses a wallet / COD), so by the time
// this opens the payment instrument is already "on file". This screen just
// simulates the processor authorizing it.
//
// When a real gateway lands, replace this component with the processor's
// redirect / SDK. The contract the parent relies on is just the callbacks:
//   onApprove({ last4, brand })            → parent places the real order
//   onDecline({ last4, brand, reason })    → parent routes to /checkout/failed
//
// The parent MOUNTS this only while open (`{open && <... />}`) so each open
// starts fresh — no reset effect needed.
// ──────────────────────────────────────────────────────────────────────

const PROCESSING_MS = 1300;

function LockIcon({ className = "size-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden className={className}>
      <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function DemoPaymentGateway({
  amount,
  summary,
  last4 = null,
  brand,
  onApprove,
  onDecline,
  onClose,
}) {
  const [phase, setPhase] = useState("confirm"); // "confirm" | "processing"
  const timer = useRef(null);
  // Cleanup-only effect — never leaks the processing timer if the modal
  // unmounts mid-simulation (approve/decline navigate the parent away).
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const processing = phase === "processing";

  function settle(resolver) {
    if (processing) return;
    setPhase("processing");
    timer.current = setTimeout(() => {
      const r = resolver();
      if (r.approved) onApprove({ last4, brand });
      else onDecline({ last4, brand, reason: r.reason });
    }, PROCESSING_MS);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Demo payment gateway"
      className="fixed inset-0 z-50 grid place-items-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
    >
      <div className="flex w-full max-w-md flex-col gap-5 rounded-[10px] bg-white p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.45)]">
        {/* Sandbox banner — make it unmistakable this isn't real. */}
        <div
          className="flex items-start gap-2 rounded-[6px] px-3 py-2"
          style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a" }}
        >
          <span className="font-display text-[11px] font-bold uppercase leading-4 tracking-[0.5px]" style={{ color: "#b45309" }}>
            Sandbox
          </span>
          <span className="font-body text-[11px] leading-4" style={{ color: "#92400e" }}>
            Demo gateway — no real payment is processed.
          </span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#f3f4f6] pb-4">
          <div className="flex items-center gap-2 text-[#11191f]">
            <LockIcon className="size-4" />
            <span className="font-display text-[15px] font-bold leading-5">Secure Payment</span>
          </div>
          <span className="font-display text-[18px] font-bold leading-6 text-[#11191f]">{formatJOD(amount)}</span>
        </div>

        {processing ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="size-8 animate-spin rounded-full border-2 border-[#e5e7eb] border-t-[#11191f]" />
            <p className="font-body text-[14px] text-[#6b7280]">Authorizing payment…</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <span className="font-body text-[12px] font-medium text-[#6b7280]">Paying with</span>
              <span className="font-display text-[15px] font-semibold leading-5 text-[#11191f]">{summary}</span>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => settle(() => ({ approved: true }))}
                className="flex h-12 w-full items-center justify-center rounded-[4px] text-white"
                style={{ backgroundColor: "#11191f" }}
              >
                <span className="font-display text-[14px] font-bold uppercase leading-5 tracking-[0.6px]">
                  Pay {formatJOD(amount)}
                </span>
              </button>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="font-body text-[13px] font-medium text-[#6b7280] hover:text-[#11191f]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => settle(() => ({ approved: false, reason: "Payment was declined (simulated)." }))}
                  className="font-body text-[13px] font-medium text-[#b91c1c] underline"
                >
                  Simulate a declined payment
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

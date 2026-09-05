"use client";

import { useEffect, useState } from "react";
import useDelayedUnmount from "@/lib/useDelayedUnmount";

// ADD NEW CARD drawer — Figma mobile 79:3149.
//
// Layout (mobile):
//   - Backdrop scrim rgba(17,25,31,0.50).
//   - Floating white card, bottom-anchored, w:361 (clamped to viewport-32),
//     radius:8, padding:24, gap:16.
//   - Header row: "ADD NEW CARD" 12px Zalando Expanded Bold + 24x24 outlined
//     close square (rotated + icon).
//   - Form (gap:8): Card Number, Card Nameholder, [Expiry Date | CVV] row.
//     Each field is 40px tall, rounded-2, 1px #11191f border, px-3 py-2,
//     placeholder Zalando Expanded Medium 10px rgba(17,25,31,0.5).
//   - Footer: [CANCEL outlined | ADD CARD filled] row, each h:32, rounded-2,
//     10px Zalando Expanded Bold. ADD CARD is rgba(17,25,31,0.5) when the
//     form isn't valid yet, solid #11191f when ready.
//
// No explicit desktop frame in the Figma file — desktop reuses the same
// content inside the `.right-drawer` floating card pattern used by the rest
// of the shop drawers (387px wide, 32px margins, radius:8).

const EXIT_MS = 320;

export default function AddCardDrawer({ open, onClose, onSubmit }) {
  const { render, dataState } = useDelayedUnmount(open, EXIT_MS);

  // Escape to close.
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!render) return null;
  return <DrawerBody onClose={onClose} onSubmit={onSubmit} dataState={dataState} />;
}

function DrawerBody({ onClose, onSubmit, dataState }) {
  const [number, setNumber] = useState("");
  const [holder, setHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  const digits = number.replace(/\D/g, "");
  const expiryDigits = expiry.replace(/\D/g, "");
  const cvvDigits = cvv.replace(/\D/g, "");
  // Permissive validation — enable the button as soon as the fields have
  // plausible content. We don't enforce a literal "/" because the expiry
  // input auto-inserts one as the user types.
  const valid =
    digits.length >= 12 &&
    holder.trim().length > 0 &&
    expiryDigits.length >= 4 &&
    cvvDigits.length >= 3;

  // Auto-insert the slash between MM and YY/YYYY so the user can type
  // continuously ("0426" → "04/26"). Allows backspace to remove the slash
  // cleanly by re-deriving from digits each keystroke.
  function handleExpiryChange(raw) {
    const d = raw.replace(/\D/g, "").slice(0, 6);
    if (d.length <= 2) setExpiry(d);
    else setExpiry(`${d.slice(0, 2)}/${d.slice(2)}`);
  }

  function handleSubmit(e) {
    e?.preventDefault?.();
    if (!valid) return;
    onSubmit?.({
      brand: detectBrand(digits),
      last4: digits.slice(-4),
      expiry: expiry.trim(),
      holder: holder.trim(),
    });
    onClose?.();
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        data-state={dataState}
        className="drawer-backdrop fixed inset-0 z-40"
        style={{ backgroundColor: "rgba(17,25,31,0.50)" }}
      />

      {/* Mobile bottom card */}
      <aside
        role="dialog"
        aria-label="Add new card"
        data-state={dataState}
        className="bottom-card fixed left-0 right-0 mx-auto bottom-6 z-50 flex w-[361px] max-w-[calc(100vw-32px)] flex-col gap-4 bg-white shadow-xl md:hidden"
        style={{ borderRadius: 8, padding: 24 }}
      >
        <DrawerHeader onClose={onClose} />
        <CardForm
          number={number}
          setNumber={setNumber}
          holder={holder}
          setHolder={setHolder}
          expiry={expiry}
          setExpiry={handleExpiryChange}
          cvv={cvv}
          setCvv={setCvv}
          inputHeight={40}
          fontSize={10}
        />
        <FooterButtons
          valid={valid}
          onCancel={onClose}
          onSubmit={handleSubmit}
          height={32}
          fontSize={10}
        />
      </aside>

      {/* Desktop right drawer */}
      <aside
        role="dialog"
        aria-label="Add new card"
        data-state={dataState}
        className="right-drawer drawer-scroll fixed right-8 top-8 bottom-8 z-50 hidden w-[387px] flex-col gap-6 overflow-y-auto bg-white shadow-2xl md:flex"
        style={{ padding: 24, borderRadius: 8 }}
      >
        <DrawerHeader onClose={onClose} desktop />
        <CardForm
          number={number}
          setNumber={setNumber}
          holder={holder}
          setHolder={setHolder}
          expiry={expiry}
          setExpiry={handleExpiryChange}
          cvv={cvv}
          setCvv={setCvv}
          inputHeight={48}
          fontSize={13}
        />
        <div className="flex-1" />
        <FooterButtons
          valid={valid}
          onCancel={onClose}
          onSubmit={handleSubmit}
          height={48}
          fontSize={14}
        />
      </aside>
    </>
  );
}

function DrawerHeader({ onClose, desktop = false }) {
  return (
    <header className="flex w-full items-center justify-between">
      <h2
        className="font-display"
        style={{
          fontWeight: 700,
          fontSize: desktop ? 14 : 12,
          color: "#11191F",
          margin: 0,
          lineHeight: 1,
          letterSpacing: "0.02em",
        }}
      >
        ADD NEW CARD
      </h2>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="grid place-items-center"
        style={{
          width: 24,
          height: 24,
          borderRadius: 2,
          border: "1px solid #11191F",
          backgroundColor: "transparent",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#11191F"
          strokeWidth="1.5"
          width="14"
          height="14"
          aria-hidden="true"
        >
          <path d="M7 7l10 10M17 7L7 17" strokeLinecap="round" />
        </svg>
      </button>
    </header>
  );
}

function CardForm({
  number,
  setNumber,
  holder,
  setHolder,
  expiry,
  setExpiry,
  cvv,
  setCvv,
  inputHeight,
  fontSize,
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      <DrawerInput
        value={number}
        onChange={setNumber}
        placeholder="CARD NUMBER"
        inputMode="numeric"
        autoComplete="cc-number"
        maxLength={19}
        height={inputHeight}
        fontSize={fontSize}
        aria-label="Card number"
      />
      <DrawerInput
        value={holder}
        onChange={setHolder}
        placeholder="CARD NAMEHOLDER"
        autoComplete="cc-name"
        height={inputHeight}
        fontSize={fontSize}
        aria-label="Cardholder name"
      />
      <div className="flex w-full gap-2">
        <div className="flex-1">
          <DrawerInput
            value={expiry}
            onChange={setExpiry}
            placeholder="Expiry Date"
            inputMode="numeric"
            autoComplete="cc-exp"
            maxLength={7}
            height={inputHeight}
            fontSize={fontSize}
            aria-label="Expiry date"
          />
        </div>
        <div className="flex-1">
          <DrawerInput
            value={cvv}
            onChange={setCvv}
            placeholder="CVV"
            inputMode="numeric"
            autoComplete="cc-csc"
            maxLength={4}
            height={inputHeight}
            fontSize={fontSize}
            aria-label="CVV"
          />
        </div>
      </div>
    </div>
  );
}

function DrawerInput({ value, onChange, placeholder, height, fontSize, ...rest }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="add-card-input font-display w-full rounded-[2px] border border-[#11191f] bg-white px-3 py-2 text-[#11191f] outline-none focus:ring-1 focus:ring-[#11191f]"
      style={{
        height,
        fontSize,
        fontWeight: 500,
      }}
      {...rest}
    />
  );
}

function FooterButtons({ valid, onCancel, onSubmit, height, fontSize }) {
  return (
    <div className="flex w-full items-center gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="font-display flex-1 rounded-[2px] border border-[#11191f] bg-white text-[#11191f]"
        style={{
          height,
          fontSize,
          fontWeight: 700,
          letterSpacing: "0.02em",
        }}
      >
        CANCEL
      </button>
      <button
        type="button"
        disabled={!valid}
        onClick={onSubmit}
        className="font-display flex-1 rounded-[2px] text-white transition-colors"
        style={{
          height,
          fontSize,
          fontWeight: 700,
          letterSpacing: "0.02em",
          backgroundColor: valid ? "#11191F" : "rgba(17,25,31,0.5)",
          cursor: valid ? "pointer" : "not-allowed",
        }}
      >
        ADD CARD
      </button>
    </div>
  );
}

function detectBrand(digits) {
  if (/^4/.test(digits)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  return "unknown";
}

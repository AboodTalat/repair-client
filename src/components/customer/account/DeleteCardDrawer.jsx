"use client";

import { useEffect, useRef, useState } from "react";
import { BrandTile } from "./AccountIcons";
import useDelayedUnmount from "@/lib/useDelayedUnmount";

// DELETE CARD confirmation — Figma mobile 79:2191.
//
// Layout matches AddCardDrawer's footprint exactly so the two surfaces feel
// like one component family:
//   - Mobile: bottom-anchored white card, w:361 (clamped), radius:8, padding:24,
//     gap:16, animated via .bottom-card + .drawer-backdrop.
//   - Desktop: floating right-side card, 387px wide, 32px margins, radius:8,
//     animated via .right-drawer.
//
// Body:
//   - "Are you sure you want to delete this card?" (Zalando Condensed Medium
//     12px #11191f).
//   - Card-preview tile — bg-[#f0f0f0], p-2, radius-4, gap-3: 32x32 brand
//     tile on a white inset (matches the row layout from the section list).
//
// Footer:
//   - CANCEL (outlined, h:32, rounded-2, 10px Zalando Expanded Bold #11191f)
//   - DELETE CARD (#a50013 filled, h:32, rounded-2, 10px Zalando Expanded
//     Bold white). NOT disabled — the affirmative button is always available.

const EXIT_MS = 320;

export default function DeleteCardDrawer({ open, method, onClose, onConfirm }) {
  // Keep showing the last method during the exit animation — parent clears it
  // when the drawer closes (same pattern as AddToCartDrawer).
  // Derived state rather than a render-written ref — see AddToCartDrawer.
  const [lastMethod, setLastMethod] = useState(method);
  if (method && method !== lastMethod) setLastMethod(method);

  const { render, dataState } = useDelayedUnmount(open && Boolean(method), EXIT_MS);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!render || !lastMethod) return null;
  return (
    <DrawerBody
      method={lastMethod}
      onClose={onClose}
      onConfirm={onConfirm}
      dataState={dataState}
    />
  );
}

function DrawerBody({ method, onClose, onConfirm, dataState }) {
  function handleConfirm() {
    onConfirm?.(method.id);
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
        aria-label="Delete card"
        data-state={dataState}
        className="bottom-card fixed left-0 right-0 mx-auto bottom-6 z-50 flex w-[361px] max-w-[calc(100vw-32px)] flex-col gap-4 bg-white shadow-xl md:hidden"
        style={{ borderRadius: 8, padding: 24 }}
      >
        <DrawerHeader onClose={onClose} fontSize={12} />
        <ConfirmBody method={method} />
        <FooterButtons onCancel={onClose} onConfirm={handleConfirm} height={32} fontSize={10} />
      </aside>

      {/* Desktop right drawer */}
      <aside
        role="dialog"
        aria-label="Delete card"
        data-state={dataState}
        className="right-drawer drawer-scroll fixed right-8 top-8 bottom-8 z-50 hidden w-[387px] flex-col gap-6 overflow-y-auto bg-white shadow-2xl md:flex"
        style={{ padding: 24, borderRadius: 8 }}
      >
        <DrawerHeader onClose={onClose} fontSize={14} />
        <ConfirmBody method={method} larger />
        <div className="flex-1" />
        <FooterButtons onCancel={onClose} onConfirm={handleConfirm} height={48} fontSize={14} />
      </aside>
    </>
  );
}

function DrawerHeader({ onClose, fontSize }) {
  return (
    <header className="flex w-full items-center justify-between">
      <h2
        className="font-display"
        style={{
          fontWeight: 700,
          fontSize,
          color: "#11191F",
          margin: 0,
          lineHeight: 1,
          letterSpacing: "0.02em",
        }}
      >
        DELETE CARD
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

function ConfirmBody({ method, larger = false }) {
  return (
    <div className="flex w-full flex-col gap-2">
      <p
        className="font-body text-[#11191f]"
        style={{
          fontSize: larger ? 14 : 12,
          fontWeight: 500,
          fontStretch: "75%",
          margin: 0,
        }}
      >
        Are you sure you want to delete this card?
      </p>
      <div
        className="flex w-full items-center gap-3 rounded-[4px] bg-[#f0f0f0]"
        style={{ padding: 8 }}
      >
        {/* The Figma preview tile sits the brand glyph on a white inset.
            BrandTile already has a #f0f0f0 background; wrap it in a white
            box so it reads as "card on grey strip". */}
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-white"
        >
          <BrandTile brand={method.brand} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span
            className="font-body text-[#11191f]"
            style={{ fontSize: larger ? 14 : 12, fontWeight: 500, fontStretch: "75%" }}
          >
            {`${capitalize(method.brand)} ending in ${method.last4}`}
          </span>
          <span
            className="font-body text-[#11191f]/50"
            style={{ fontSize: larger ? 12 : 10, fontWeight: 500, fontStretch: "75%" }}
          >
            Expiration: {method.expiry}
          </span>
        </div>
      </div>
    </div>
  );
}

function FooterButtons({ onCancel, onConfirm, height, fontSize }) {
  return (
    <div className="flex w-full items-center gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="font-display flex-1 rounded-[2px] border border-[#11191f] bg-white text-[#11191f]"
        style={{ height, fontSize, fontWeight: 700, letterSpacing: "0.02em" }}
      >
        CANCEL
      </button>
      <button
        type="button"
        onClick={onConfirm}
        className="font-display flex-1 rounded-[2px] text-white"
        style={{
          height,
          fontSize,
          fontWeight: 700,
          letterSpacing: "0.02em",
          backgroundColor: "#A50013",
        }}
      >
        DELETE CARD
      </button>
    </div>
  );
}

function capitalize(s) {
  if (!s) return "";
  return s[0].toUpperCase() + s.slice(1);
}

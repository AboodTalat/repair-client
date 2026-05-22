"use client";

import { useEffect, useRef, useState } from "react";
import { BuildingIcon, HomeIcon, LocationIcon } from "./AccountIcons";

// DELETE ADDRESS confirmation — Figma mobile 79:5098.
//
// Layout matches DeleteCardDrawer so the two surfaces feel like one family:
//   - Mobile: bottom-anchored white card, w:361 (clamped), radius:8,
//     padding:24, gap:16, animated via .bottom-card + .drawer-backdrop.
//   - Desktop: floating right-side card, 387px wide, 32px margins, radius:8,
//     animated via .right-drawer.
//
// Body:
//   - "Are you sure you want to delete this ADDRESS?" (Zalando Condensed
//     Medium 12px #11191f — note "ADDRESS" is uppercase to match Figma).
//   - Address-preview tile — bg-[#f0f0f0], p-2, radius-4, gap-3: 32x32
//     icon (home/office/other) on a white inset; label + (Default) inline,
//     then the address line + phone in muted grey.
//
// Footer:
//   - CANCEL (outlined, h:32, rounded-2, 10px Zalando Expanded Bold #11191f)
//   - DELETE ADDRESS (#a50013 filled, h:32, rounded-2, 10px Zalando Expanded
//     Bold white). NOT disabled — the affirmative button is always available.

const EXIT_MS = 320;

function useDelayedUnmount(open, exitMs) {
  const [render, setRender] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setRender(true);
      setClosing(false);
      return undefined;
    }
    if (!render) return undefined;
    setClosing(true);
    const t = setTimeout(() => {
      setRender(false);
      setClosing(false);
    }, exitMs);
    return () => clearTimeout(t);
  }, [open, render, exitMs]);

  return { render, dataState: closing ? "closing" : "open" };
}

export default function DeleteAddressDrawer({ open, address, onClose, onConfirm }) {
  // Keep showing the last address during the exit animation — parent clears it
  // when the drawer closes (same pattern as DeleteCardDrawer / AddToCartDrawer).
  const lastAddressRef = useRef(address);
  if (address) lastAddressRef.current = address;

  const { render, dataState } = useDelayedUnmount(open && Boolean(address), EXIT_MS);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!render || !lastAddressRef.current) return null;
  return (
    <DrawerBody
      address={lastAddressRef.current}
      onClose={onClose}
      onConfirm={onConfirm}
      dataState={dataState}
    />
  );
}

function DrawerBody({ address, onClose, onConfirm, dataState }) {
  function handleConfirm() {
    onConfirm?.(address.id);
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
        aria-label="Delete address"
        data-state={dataState}
        className="bottom-card fixed left-0 right-0 mx-auto bottom-6 z-50 flex w-[361px] max-w-[calc(100vw-32px)] flex-col gap-4 bg-white shadow-xl md:hidden"
        style={{ borderRadius: 8, padding: 24 }}
      >
        <DrawerHeader onClose={onClose} fontSize={12} />
        <ConfirmBody address={address} />
        <FooterButtons onCancel={onClose} onConfirm={handleConfirm} height={32} fontSize={10} />
      </aside>

      {/* Desktop right drawer */}
      <aside
        role="dialog"
        aria-label="Delete address"
        data-state={dataState}
        className="right-drawer drawer-scroll fixed right-8 top-8 bottom-8 z-50 hidden w-[387px] flex-col gap-6 overflow-y-auto bg-white shadow-2xl md:flex"
        style={{ padding: 24, borderRadius: 8 }}
      >
        <DrawerHeader onClose={onClose} fontSize={14} />
        <ConfirmBody address={address} larger />
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
        DELETE ADDRESS
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

function AddressKindIcon({ kind, size = 20 }) {
  if (kind === "office") return <BuildingIcon size={size} />;
  if (kind === "other") return <LocationIcon size={size} />;
  return <HomeIcon size={size} />;
}

function ConfirmBody({ address, larger = false }) {
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
        Are you sure you want to delete this ADDRESS?
      </p>
      <div
        className="flex w-full flex-col gap-2 rounded-[4px] bg-[#f0f0f0]"
        style={{ padding: 8 }}
      >
        <div className="flex w-full items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] bg-white text-[#11191f]">
            <AddressKindIcon kind={address.kind} size={20} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <p
              className="flex items-baseline gap-1 text-[#11191f]"
              style={{ fontStretch: "75%" }}
            >
              <span
                className="font-body"
                style={{ fontSize: larger ? 14 : 12, fontWeight: 500 }}
              >
                {address.label}
              </span>
              {address.isDefault ? (
                <span
                  className="font-body text-[#11191f]/30"
                  style={{ fontSize: larger ? 12 : 10 }}
                >
                  (Default)
                </span>
              ) : null}
            </p>
          </div>
        </div>
        <div
          className="flex w-full flex-col gap-1 font-body text-[#11191f]/50"
          style={{ fontStretch: "75%", fontWeight: 500, fontSize: larger ? 12 : 10 }}
        >
          {address.line ? <p style={{ margin: 0 }}>{address.line}</p> : null}
          {address.phone ? <p style={{ margin: 0 }}>{address.phone}</p> : null}
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
        DELETE ADDRESS
      </button>
    </div>
  );
}

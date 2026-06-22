"use client";

import { useEffect, useState } from "react";
import { IconClose } from "./Icons";

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

export default function Modal({ open, onClose, title, children, footer, width = 480 }) {
  const { render, dataState } = useDelayedUnmount(open, 240);
  useEffect(() => {
    if (!render) return undefined;
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [render, onClose]);
  if (!render) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div
        data-state={dataState}
        className="drawer-backdrop absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        data-state={dataState}
        className="filter-card-desktop relative flex w-full flex-col overflow-hidden rounded-[4px] bg-white shadow-2xl"
        // maxHeight via inline style (arbitrary `max-h-[…]` classes get dropped
        // by the Turbopack scanner — see the Tailwind v4 gotcha in CLAUDE.md).
        // 2rem = the outer p-4 (1rem top + 1rem bottom); dvh tracks mobile chrome.
        style={{ maxWidth: width, maxHeight: "calc(100dvh - 2rem)" }}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-[#e5e7eb] px-5 py-4">
          <h2 className="font-display text-[14px] font-bold uppercase tracking-[1.4px] text-[#11191f]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-7 shrink-0 place-items-center rounded-[2px] hover:bg-[#f3f4f6]"
          >
            <span className="grid size-4 place-items-center">
              <IconClose />
            </span>
          </button>
        </header>
        <div className="drawer-scroll flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          // Stacks full-width on mobile (so long button labels never overflow),
          // back to a right-aligned row at sm+. `sm:flex-wrap` is the desktop
          // safety net: if two nowrap buttons can't fit the modal width, they
          // wrap onto stacked right-aligned lines instead of overflowing.
          <footer className="flex shrink-0 flex-col gap-2 border-t border-[#e5e7eb] bg-[#fafafa] px-5 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}

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
        style={{ maxWidth: width }}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-center justify-between border-b border-[#e5e7eb] px-5 py-4">
          <h2 className="font-display text-[14px] font-bold uppercase tracking-[1.4px] text-[#11191f]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-7 place-items-center rounded-[2px] hover:bg-[#f3f4f6]"
          >
            <span className="grid size-4 place-items-center">
              <IconClose />
            </span>
          </button>
        </header>
        <div className="px-5 py-4">{children}</div>
        {footer ? (
          <footer className="flex items-center justify-end gap-3 border-t border-[#e5e7eb] bg-[#fafafa] px-5 py-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}

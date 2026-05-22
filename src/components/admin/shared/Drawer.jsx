"use client";

import { useEffect, useState } from "react";
import { IconClose } from "./Icons";

// Right-side drawer. Reuses the .right-drawer animation declared in
// src/app/globals.css (already imported by the root layout).

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

export default function Drawer({
  open,
  onClose,
  title,
  subtitle,
  width = 540,
  footer = null,
  children,
}) {
  const { render, dataState } = useDelayedUnmount(open, 300);
  useEffect(() => {
    if (!render) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [render]);
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
    <div className="fixed inset-0 z-50">
      <div
        data-state={dataState}
        className="drawer-backdrop absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <aside
        data-state={dataState}
        className="right-drawer absolute right-0 top-0 flex h-full flex-col bg-white shadow-2xl"
        style={{ width: "100%", maxWidth: width }}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#e5e7eb] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-[16px] font-bold uppercase tracking-[1.4px] text-[#11191f]">
              {title}
            </h2>
            {subtitle ? (
              <p className="font-body text-[12px] text-[#6b7280]">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 place-items-center rounded-[2px] text-[#11191f] hover:bg-[#f3f4f6]"
          >
            <span className="grid size-4 place-items-center">
              <IconClose />
            </span>
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">{children}</div>
        {footer ? (
          <footer className="flex items-center justify-end gap-3 border-t border-[#e5e7eb] bg-[#fafafa] px-4 py-4 sm:px-6">
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>
  );
}

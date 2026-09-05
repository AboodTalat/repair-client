"use client";

import { useEffect, useId, useRef, useState } from "react";
import { IconClose } from "./Icons";
import useDelayedUnmount from "@/lib/useDelayedUnmount";

// Right-side drawer. Reuses the .right-drawer animation declared in
// src/app/globals.css (already imported by the root layout).

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
  const panelRef = useRef(null);
  const restoreFocusRef = useRef(null);
  const titleId = useId();
  useEffect(() => {
    if (!render) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [render]);

  // Move focus INTO the drawer on open and put it back where it came from on
  // close. Without this the drawer announced as a modal but left focus on
  // <body>: a screen-reader user was told a dialog opened and then found
  // nothing in it, and a keyboard user's next Tab walked the page *behind*
  // the drawer. Focus lands on the panel itself rather than the first control,
  // so the title is read before the actions.
  useEffect(() => {
    if (!render) return undefined;
    restoreFocusRef.current = document.activeElement;
    const panel = panelRef.current;
    if (panel) panel.focus({ preventScroll: true });
    return () => {
      const back = restoreFocusRef.current;
      if (back && typeof back.focus === "function" && document.contains(back)) {
        back.focus({ preventScroll: true });
      }
    };
  }, [render]);

  useEffect(() => {
    if (!render) return undefined;
    function onKey(e) {
      if (e.key === "Escape") {
        onClose?.();
        return;
      }
      // Keep Tab inside the drawer while it is modal — otherwise focus escapes
      // to the inert page behind it and the only way back is a mouse.
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = panel.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables.length) {
        e.preventDefault();
        panel.focus({ preventScroll: true });
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
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
        ref={panelRef}
        data-state={dataState}
        className="right-drawer absolute right-0 top-0 flex h-full flex-col bg-white shadow-2xl focus:outline-none"
        style={{ width: "100%", maxWidth: width }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#e5e7eb] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-1">
            <h2
              id={titleId}
              className="font-display text-[16px] font-bold uppercase tracking-[1.4px] text-[#11191f]"
            >
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

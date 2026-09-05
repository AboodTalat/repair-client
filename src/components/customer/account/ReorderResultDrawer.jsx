"use client";

import { useEffect, useState } from "react";
import { repairCall } from "@/lib/repairAuthedApi";
import useDelayedUnmount from "@/lib/useDelayedUnmount";

// Shown after "Buy Again" when some of the order's items are out of stock.
// Lists each sold-out item with a "Notify me" button that subscribes the
// customer to a back-in-stock alert (myAppRequestStockAlert — the same flow as
// the product page's "Notify When Available"). The items that WERE in stock are
// already in the cart, so the footer offers "Go to cart" when addedCount > 0.
//
// Mirrors AddAddressDrawer's chrome: mobile bottom-card + desktop right-drawer,
// the shared .drawer-backdrop / .bottom-card / .right-drawer animation classes,
// a local useDelayedUnmount, and Escape-to-close.

const EXIT_MS = 320;

export default function ReorderResultDrawer({ open, items = [], addedCount = 0, onClose, onGoToCart }) {
  const { render, dataState } = useDelayedUnmount(open, EXIT_MS);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!render) return null;
  // Re-key on the variant set so a fresh open (different order) resets the
  // per-item notify state.
  return (
    <DrawerBody
      key={items.map((i) => i.productVariantId).join(",")}
      items={items}
      addedCount={addedCount}
      onClose={onClose}
      onGoToCart={onGoToCart}
      dataState={dataState}
    />
  );
}

function DrawerBody({ items, addedCount, onClose, onGoToCart, dataState }) {
  // Per-variant notify status: { [productVariantId]: { status, message } }
  // status: "idle" | "loading" | "done" | "error"
  const [notify, setNotify] = useState({});

  async function handleNotify(variantId) {
    const current = notify[variantId]?.status;
    if (current === "loading" || current === "done") return;
    setNotify((m) => ({ ...m, [variantId]: { status: "loading", message: "" } }));
    try {
      const res = await repairCall(
        "myAppRequestStockAlert",
        { productVariantId: variantId },
        { isQuery: false }
      );
      setNotify((m) => ({
        ...m,
        [variantId]: { status: "done", message: res?.message || "We'll notify you when it's back." },
      }));
    } catch (e) {
      const msg = String(e?.message || "").replace(/^repairClientApi \S+:\s*/, "");
      setNotify((m) => ({
        ...m,
        [variantId]: { status: "error", message: msg || "Couldn't sign you up. Try again." },
      }));
    }
  }

  const body = (
    <Inner
      items={items}
      addedCount={addedCount}
      notify={notify}
      onNotify={handleNotify}
      onClose={onClose}
      onGoToCart={onGoToCart}
    />
  );

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
        aria-label="Some items are out of stock"
        data-state={dataState}
        className="bottom-card drawer-scroll fixed left-0 right-0 mx-auto bottom-6 z-50 flex max-h-[80vh] w-[361px] max-w-[calc(100vw-32px)] flex-col gap-4 overflow-y-auto bg-white shadow-xl md:hidden"
        style={{ borderRadius: 8, padding: 24 }}
      >
        {body}
      </aside>

      {/* Desktop right drawer */}
      <aside
        role="dialog"
        aria-label="Some items are out of stock"
        data-state={dataState}
        className="right-drawer drawer-scroll fixed right-8 top-8 bottom-8 z-50 hidden w-[400px] flex-col gap-5 overflow-y-auto bg-white shadow-2xl md:flex"
        style={{ padding: 24, borderRadius: 8 }}
      >
        {body}
      </aside>
    </>
  );
}

function Inner({ items, addedCount, notify, onNotify, onClose, onGoToCart }) {
  return (
    <>
      <header className="flex w-full items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2
            className="font-display uppercase"
            style={{ fontWeight: 700, fontSize: 14, color: "#11191F", lineHeight: 1.2, letterSpacing: "0.02em" }}
          >
            Some items are out of stock
          </h2>
          <p className="font-body text-[12px] text-[#6b7280]" style={{ fontStretch: "75%" }}>
            {addedCount > 0
              ? `${addedCount} item${addedCount === 1 ? "" : "s"} added to your cart. We can let you know when these come back:`
              : "These items couldn't be added. We can let you know when they come back:"}
          </p>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="grid shrink-0 place-items-center"
          style={{ width: 24, height: 24, borderRadius: 2, border: "1px solid #11191F", backgroundColor: "transparent" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#11191F" strokeWidth="1.5" width="14" height="14" aria-hidden="true">
            <path d="M7 7l10 10M17 7L7 17" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <ul className="flex w-full flex-col gap-2">
        {items.map((it) => {
          const state = notify[it.productVariantId] || { status: "idle", message: "" };
          const variantLine = [it.color, it.size].filter(Boolean).join(" / ");
          return (
            <li
              key={it.productVariantId}
              className="flex w-full flex-col gap-2 rounded-[4px] border border-[#f3f4f6] bg-[#fafafa] p-3"
            >
              <div className="flex w-full items-center justify-between gap-3">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-display text-[13px] font-medium text-[#11191f]">
                    {it.productName}
                  </span>
                  {variantLine ? (
                    <span className="font-body text-[12px] text-[#6b7280]" style={{ fontStretch: "75%" }}>
                      {variantLine}
                    </span>
                  ) : null}
                </div>
                <NotifyButton status={state.status} onClick={() => onNotify(it.productVariantId)} />
              </div>
              {state.status === "done" || state.status === "error" ? (
                <p
                  className="font-body text-[11px]"
                  style={{ fontStretch: "75%", color: state.status === "error" ? "#b91c1c" : "#16a34a" }}
                  role="status"
                >
                  {state.message}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="mt-1 flex w-full items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className="font-display flex-1 rounded-[2px] border border-[#11191f] bg-white text-[#11191f]"
          style={{ height: 44, fontSize: 12, fontWeight: 700, letterSpacing: "0.02em" }}
        >
          {addedCount > 0 ? "Keep Browsing" : "Close"}
        </button>
        {addedCount > 0 ? (
          <button
            type="button"
            onClick={onGoToCart}
            className="font-display flex-1 rounded-[2px] text-white"
            style={{ height: 44, fontSize: 12, fontWeight: 700, letterSpacing: "0.02em", backgroundColor: "#11191F" }}
          >
            Go to Cart
          </button>
        ) : null}
      </div>
    </>
  );
}

function NotifyButton({ status, onClick }) {
  if (status === "done") {
    return (
      <span
        className="flex shrink-0 items-center gap-1 font-display text-[11px] font-bold uppercase text-[#16a34a]"
        style={{ letterSpacing: "0.02em" }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="13" height="13" aria-hidden="true">
          <path d="M5 12l4 4 10-10" />
        </svg>
        On the list
      </span>
    );
  }
  const loading = status === "loading";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="shrink-0 rounded-[2px] bg-[#11191f] px-3 font-display text-[11px] font-bold uppercase text-white disabled:opacity-60"
      style={{ height: 32, letterSpacing: "0.02em" }}
    >
      {loading ? "…" : status === "error" ? "Retry" : "Notify Me"}
    </button>
  );
}

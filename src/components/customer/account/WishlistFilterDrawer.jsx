"use client";

import { useEffect, useState } from "react";
import { WISHLIST_TYPE_OPTIONS, WISHLIST_PRICE_RANGES } from "@/lib/mockWishlist";
import useDelayedUnmount from "@/lib/useDelayedUnmount";

// Wishlist filter dialog — mirrors customer/account/OrderFilterDrawer's footprint,
// motion, and chip primitives so the customer surfaces feel consistent. The two
// axes here are TYPE (multi) + PRICE (single-select preset); both reuse the same
// chip component, so the body stays light.
//
// The Figma frames don't ship a wishlist-specific filter sheet, so the layout
// values (sizes, paddings, font sizes) are deliberately taken from the orders
// drawer rather than invented. Swap chip content if a real Figma spec lands.

const TXT_BODY = "var(--font-zalando-sans)";
const TXT_DISPLAY = "var(--font-zalando-expanded)";
const INK = "#11191F";

export default function WishlistFilterDrawer(props) {
  const { render, dataState } = useDelayedUnmount(props.open, 320);
  if (!render) return null;
  return <DialogBody {...props} dataState={dataState} />;
}

function DialogBody({ onClose, value, onApply, dataState }) {
  const [draft, setDraft] = useState(() => normalize(value));

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggleType(slug) {
    setDraft((d) => {
      const next = new Set(d.types);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return { ...d, types: Array.from(next) };
    });
  }

  function setPriceRange(slug) {
    setDraft((d) => ({ ...d, priceRange: slug }));
  }

  function apply() {
    onApply?.(draft);
    onClose?.();
  }

  function clearAll() {
    const cleared = { types: [], priceRange: "all" };
    setDraft(cleared);
    onApply?.(cleared);
    onClose?.();
  }

  const applyCount =
    draft.types.length + (draft.priceRange && draft.priceRange !== "all" ? 1 : 0);

  const shared = {
    draft,
    toggleType,
    setPriceRange,
    apply,
    clearAll,
    applyCount,
    onClose,
    dataState,
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close filters"
        onClick={onClose}
        data-state={dataState}
        className="drawer-backdrop fixed inset-0 z-40"
        style={{ backgroundColor: "rgba(17,25,31,0.50)" }}
      />

      <MobileCard {...shared} />
      <DesktopCard {...shared} />
    </>
  );
}

/* ---------- mobile ---------- */

function MobileCard({
  draft,
  toggleType,
  setPriceRange,
  apply,
  clearAll,
  applyCount,
  onClose,
  dataState,
}) {
  return (
    <aside
      role="dialog"
      aria-modal="true"
      aria-label="Filter wishlist"
      data-state={dataState}
      className="bottom-card fixed bottom-6 left-0 right-0 mx-auto z-50 flex max-h-[calc(100vh-48px)] w-[361px] max-w-[calc(100vw-32px)] flex-col overflow-y-auto bg-white shadow-xl md:hidden"
      style={{ borderRadius: 8, padding: 24, gap: 24 }}
    >
      <header className="flex items-center justify-between">
        <h2
          style={{
            fontFamily: TXT_DISPLAY,
            fontWeight: 700,
            fontSize: 14,
            color: INK,
            margin: 0,
            lineHeight: 1,
            letterSpacing: "0.02em",
          }}
        >
          FILTER
        </h2>
        <CloseButton onClick={onClose} />
      </header>

      <div className="flex flex-col" style={{ gap: 16 }}>
        <section className="flex flex-col" style={{ gap: 8 }}>
          <SectionTitle>TYPE</SectionTitle>
          <div className="flex flex-wrap" style={{ gap: 8 }}>
            {WISHLIST_TYPE_OPTIONS.map((opt) => (
              <PillChip
                key={opt.slug}
                active={draft.types.includes(opt.slug)}
                onClick={() => toggleType(opt.slug)}
                fontSize={12}
              >
                {opt.label}
              </PillChip>
            ))}
          </div>
        </section>

        <section className="flex flex-col" style={{ gap: 8 }}>
          <SectionTitle>PRICE</SectionTitle>
          <div className="flex flex-wrap" style={{ gap: 8 }}>
            {WISHLIST_PRICE_RANGES.map((opt) => (
              <PillChip
                key={opt.slug}
                active={draft.priceRange === opt.slug}
                onClick={() => setPriceRange(opt.slug)}
                fontSize={12}
              >
                {opt.label}
              </PillChip>
            ))}
          </div>
        </section>
      </div>

      <footer className="flex items-center" style={{ gap: 8 }}>
        <button
          type="button"
          onClick={clearAll}
          className="grid flex-1 place-items-center transition-colors hover:bg-[#11191f]/5"
          style={{
            height: 32,
            padding: 8,
            backgroundColor: "#ffffff",
            borderRadius: 2,
            outline: `1px solid ${INK}`,
            outlineOffset: "-1px",
            color: INK,
            fontFamily: TXT_DISPLAY,
            fontWeight: 700,
            fontSize: 10,
            letterSpacing: "0.04em",
            lineHeight: 1,
          }}
        >
          CLEAR ALL
        </button>
        <button
          type="button"
          onClick={apply}
          className="flex flex-1 items-center justify-center transition-opacity hover:opacity-90"
          style={{
            height: 32,
            padding: 8,
            backgroundColor: INK,
            borderRadius: 2,
            color: "#ffffff",
            fontFamily: TXT_DISPLAY,
            fontWeight: 700,
            fontSize: 10,
            letterSpacing: "0.04em",
            lineHeight: 1,
            gap: 1,
          }}
        >
          <span>APPLY</span>
          {applyCount > 0 && (
            <span style={{ fontSize: 8, fontWeight: 400, color: "rgba(255,255,255,0.5)" }}>
              ({applyCount})
            </span>
          )}
        </button>
      </footer>
    </aside>
  );
}

/* ---------- desktop ---------- */

function DesktopCard({
  draft,
  toggleType,
  setPriceRange,
  apply,
  clearAll,
  applyCount,
  onClose,
  dataState,
}) {
  return (
    <aside
      role="dialog"
      aria-modal="true"
      aria-label="Filter wishlist"
      data-state={dataState}
      className="right-drawer drawer-scroll fixed right-8 top-8 bottom-8 z-50 hidden w-[387px] flex-col overflow-y-auto bg-white shadow-2xl md:flex"
      style={{ borderRadius: 8, padding: 24, gap: 24 }}
    >
      <header className="flex items-center justify-between">
        <h2
          style={{
            fontFamily: TXT_DISPLAY,
            fontWeight: 700,
            fontSize: 14,
            color: INK,
            margin: 0,
            lineHeight: 1,
            letterSpacing: "0.02em",
          }}
        >
          FILTER
        </h2>
        <CloseButton onClick={onClose} />
      </header>

      <div className="flex flex-1 flex-col" style={{ gap: 32 }}>
        <section className="flex flex-col" style={{ gap: 8 }}>
          <SectionTitle>TYPE</SectionTitle>
          <div className="flex flex-wrap" style={{ gap: 12 }}>
            {WISHLIST_TYPE_OPTIONS.map((opt) => (
              <PillChip
                key={opt.slug}
                active={draft.types.includes(opt.slug)}
                onClick={() => toggleType(opt.slug)}
                fontSize={14}
              >
                {opt.label}
              </PillChip>
            ))}
          </div>
        </section>

        <section className="flex flex-col" style={{ gap: 8 }}>
          <SectionTitle>PRICE</SectionTitle>
          <div className="flex flex-wrap" style={{ gap: 12 }}>
            {WISHLIST_PRICE_RANGES.map((opt) => (
              <PillChip
                key={opt.slug}
                active={draft.priceRange === opt.slug}
                onClick={() => setPriceRange(opt.slug)}
                fontSize={14}
              >
                {opt.label}
              </PillChip>
            ))}
          </div>
        </section>
      </div>

      <footer className="flex flex-col" style={{ gap: 16 }}>
        <button
          type="button"
          onClick={apply}
          className="flex w-full items-center justify-center transition-opacity hover:opacity-90"
          style={{
            height: 48,
            padding: 8,
            backgroundColor: INK,
            borderRadius: 4,
            color: "#ffffff",
            fontFamily: TXT_DISPLAY,
            fontWeight: 700,
            fontSize: 14,
            lineHeight: 1,
            gap: 4,
          }}
        >
          <span>APPLY ALL</span>
          {applyCount > 0 && (
            <span
              style={{
                fontFamily: TXT_BODY,
                fontWeight: 400,
                fontSize: 14,
                color: "rgba(255,255,255,0.5)",
                fontStretch: "75%",
              }}
            >
              ({applyCount})
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="grid w-full place-items-center transition-colors hover:bg-[#11191f]/5"
          style={{
            height: 48,
            padding: 8,
            backgroundColor: "#ffffff",
            borderRadius: 4,
            border: `1px solid ${INK}`,
            color: INK,
            fontFamily: TXT_DISPLAY,
            fontWeight: 700,
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          CLEAR ALL
        </button>
      </footer>
    </aside>
  );
}

/* ---------- shared pieces ---------- */

function SectionTitle({ children }) {
  return (
    <p
      style={{
        fontFamily: TXT_BODY,
        fontWeight: 400,
        fontSize: 12,
        fontStretch: "75%",
        color: "rgba(17,25,31,0.80)",
        textTransform: "uppercase",
        letterSpacing: "0.02em",
        margin: 0,
        lineHeight: 1,
      }}
    >
      {children}
    </p>
  );
}

function PillChip({ active, onClick, fontSize = 12, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="grid place-items-center transition-colors"
      style={{
        height: 24,
        paddingLeft: 6,
        paddingRight: 6,
        backgroundColor: active ? INK : "#ffffff",
        color: active ? "#ffffff" : INK,
        borderRadius: 2,
        border: `1px solid ${INK}`,
        fontFamily: TXT_BODY,
        fontWeight: 500,
        fontSize,
        fontStretch: "75%",
        lineHeight: 1,
      }}
    >
      {children}
    </button>
  );
}

function CloseButton({ onClick }) {
  return (
    <button
      type="button"
      aria-label="Close filters"
      onClick={onClick}
      className="grid place-items-center"
      style={{
        width: 24,
        height: 24,
        borderRadius: 2,
        border: `1px solid ${INK}`,
        backgroundColor: "transparent",
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="1.5" width="12" height="12" aria-hidden>
        <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
      </svg>
    </button>
  );
}

function normalize(v) {
  return {
    types: Array.isArray(v?.types) ? v.types : [],
    priceRange: v?.priceRange || "all",
  };
}

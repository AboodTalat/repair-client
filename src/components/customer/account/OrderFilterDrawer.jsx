"use client";

import { useEffect, useState } from "react";
import { ORDER_STATUS_OPTIONS, ORDER_DATE_RANGES } from "@/lib/orders";
import useDelayedUnmount from "@/lib/useDelayedUnmount";

// Order filter dialog — mirrors the shop FilterDrawer's footprint and motion
// so the customer surfaces feel consistent.
//   Mobile: bottom-anchored floating card (361x auto), padding 24, radius 8,
//           gap 24 between header / body / footer; gap 16 between sections.
//           Pills h:24 px:6 (1px #11191F border, 2px radius), 12px text.
//           Footer: side-by-side flex-1 buttons CLEAR ALL + APPLY (N), h:32.
//   Desktop: full-height right-side floating drawer at right:32 top:32 bottom:32,
//           w:387, radius 8, padding 24, gap 24 between header / body / footer;
//           gap 32 between body sections. Pills 14px text.
//           Footer: stacked APPLY ALL (filled, top) + CLEAR ALL (outlined, below).
//
// Filter axes are simpler than the shop's — orders only carry Status (multi)
// + Purchase date range (single). Both reuse the same chip primitive, so the
// drawer stays light.

const TXT_BODY = "var(--font-zalando-sans)";
const TXT_DISPLAY = "var(--font-zalando-expanded)";
const INK = "#11191F";

export default function OrderFilterDrawer(props) {
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

  function toggleStatus(slug) {
    setDraft((d) => {
      const next = new Set(d.statuses);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return { ...d, statuses: Array.from(next) };
    });
  }

  function setDateRange(slug) {
    setDraft((d) => ({ ...d, dateRange: slug }));
  }

  function apply() {
    onApply?.(draft);
    onClose?.();
  }

  function clearAll() {
    const cleared = { statuses: [], dateRange: "all" };
    setDraft(cleared);
    onApply?.(cleared);
    onClose?.();
  }

  const applyCount =
    draft.statuses.length + (draft.dateRange && draft.dateRange !== "all" ? 1 : 0);

  const shared = { draft, toggleStatus, setDateRange, apply, clearAll, applyCount, onClose, dataState };

  return (
    <>
      {/* Backdrop scrim — animated fade (.drawer-backdrop in globals.css) */}
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
  toggleStatus,
  setDateRange,
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
      aria-label="Filter orders"
      data-state={dataState}
      className="bottom-card fixed bottom-6 left-0 right-0 mx-auto z-50 flex max-h-[calc(100vh-48px)] w-[361px] max-w-[calc(100vw-32px)] flex-col overflow-y-auto bg-white shadow-xl md:hidden"
      style={{ borderRadius: 8, padding: 24, gap: 24 }}
    >
      {/* Header */}
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

      {/* Sections */}
      <div className="flex flex-col" style={{ gap: 16 }}>
        <section className="flex flex-col" style={{ gap: 8 }}>
          <SectionTitle>STATUS</SectionTitle>
          <div className="flex flex-wrap" style={{ gap: 8 }}>
            {ORDER_STATUS_OPTIONS.map((opt) => (
              <PillChip
                key={opt.slug}
                active={draft.statuses.includes(opt.slug)}
                onClick={() => toggleStatus(opt.slug)}
                fontSize={12}
              >
                {opt.label}
              </PillChip>
            ))}
          </div>
        </section>

        <section className="flex flex-col" style={{ gap: 8 }}>
          <SectionTitle>PURCHASE DATE</SectionTitle>
          <div className="flex flex-wrap" style={{ gap: 8 }}>
            {ORDER_DATE_RANGES.map((opt) => (
              <PillChip
                key={opt.slug}
                active={draft.dateRange === opt.slug}
                onClick={() => setDateRange(opt.slug)}
                fontSize={12}
              >
                {opt.label}
              </PillChip>
            ))}
          </div>
        </section>
      </div>

      {/* Footer */}
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
  toggleStatus,
  setDateRange,
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
      aria-label="Filter orders"
      data-state={dataState}
      className="right-drawer drawer-scroll fixed right-8 top-8 bottom-8 z-50 hidden w-[387px] flex-col overflow-y-auto bg-white shadow-2xl md:flex"
      style={{ borderRadius: 8, padding: 24, gap: 24 }}
    >
      {/* Header */}
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

      {/* Sections */}
      <div className="flex flex-1 flex-col" style={{ gap: 32 }}>
        <section className="flex flex-col" style={{ gap: 8 }}>
          <SectionTitle>STATUS</SectionTitle>
          <div className="flex flex-wrap" style={{ gap: 12 }}>
            {ORDER_STATUS_OPTIONS.map((opt) => (
              <PillChip
                key={opt.slug}
                active={draft.statuses.includes(opt.slug)}
                onClick={() => toggleStatus(opt.slug)}
                fontSize={14}
              >
                {opt.label}
              </PillChip>
            ))}
          </div>
        </section>

        <section className="flex flex-col" style={{ gap: 8 }}>
          <SectionTitle>PURCHASE DATE</SectionTitle>
          <div className="flex flex-wrap" style={{ gap: 12 }}>
            {ORDER_DATE_RANGES.map((opt) => (
              <PillChip
                key={opt.slug}
                active={draft.dateRange === opt.slug}
                onClick={() => setDateRange(opt.slug)}
                fontSize={14}
              >
                {opt.label}
              </PillChip>
            ))}
          </div>
        </section>
      </div>

      {/* Footer */}
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
    statuses: Array.isArray(v?.statuses) ? v.statuses : [],
    dateRange: v?.dateRange || "all",
  };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FILTER_OPTIONS } from "@/lib/mockShop";

// Filter dialog.
//   Mobile (Figma 11:1797): bottom-anchored floating card (361x auto),
//     padding 24, radius 8, gap 24 between header / body / footer; gap 16
//     between body sections. Chips 24x24 (XXL 28x24), 1px outline, radius 2.
//     Footer: two side-by-side flex-1 buttons "CLEAR ALL" + "APPLY (N)",
//     h:32, 10px Bold.
//   Desktop (Figma 126:3792 → node 126:4056): full-height right-side floating
//     drawer at right:32 top:32 bottom:32, w:387, radius 8, padding 24, gap 24
//     between header / body / footer; gap 32 between body sections.
//     Chips 32x32 (XXL 37.333x32), 1.5px #11191F border, radius 3, text 16px.
//     Color swatches 32x32 (selected: 3px #11191F border).
//     Material/Item Type pills h:24 px:6 with 14px text, 1px border, radius 2.
//     Price slider handles 16x16 (vs 12x12 on mobile).
//     Footer: STACKED buttons APPLY ALL (filled) on top + CLEAR ALL (outlined)
//     below, both full-width h:48 radius:4 with 14px Bold Expanded.

// Font references — next/font/google loads these under CSS variables in
// src/app/layout.js. Zalando Sans Condensed isn't shipped as a separate
// family, so we use Zalando Sans + fontStretch:"75%" to approximate the
// Condensed look (see repair/CLAUDE.md "Tokens already wired").
const TXT_BODY = "var(--font-zalando-sans)";
const TXT_DISPLAY = "var(--font-zalando-expanded)";
const INK = "#11191F";

// Keep the dialog mounted while the close animation plays.
// `open` toggles in the parent; we hold render=true through the exit window.
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

export default function FilterDrawer(props) {
  const { render, dataState } = useDelayedUnmount(props.open, 320);
  if (!render) return null;
  return <DialogBody {...props} dataState={dataState} />;
}

function DialogBody({
  onClose,
  value,
  onApply,
  typeOptions,
  colorOptions,
  sizeOptions,
  materialOptions,
  priceRange,
  dataState,
}) {
  const [draft, setDraft] = useState(() => normalize(value));

  // Facet option sources: live values from the server (passed in as props),
  // each falling back to the static mock list only when nothing was provided —
  // so the drawer never renders an empty section if a facet fetch failed.
  // ITEM TYPE = the live sub-category set; COLORS / SIZES / MATERIAL = the live
  // catalogue reference data (myAppListColors / Sizes / Materials).
  const types = typeOptions?.length ? typeOptions : FILTER_OPTIONS.types;
  const colors = colorOptions?.length ? colorOptions : FILTER_OPTIONS.colors;
  const materials = materialOptions?.length ? materialOptions : FILTER_OPTIONS.materials;
  // SIZE renders as two rows (numeric 36–48, then alpha S–XXL). Split the live
  // flat size list by digits-only name; fall back to the two mock arrays.
  const numericSizes = sizeOptions?.length
    ? sizeOptions.filter((s) => /^\d+$/.test(String(s)))
    : FILTER_OPTIONS.numericSizes;
  const alphaSizes = sizeOptions?.length
    ? sizeOptions.filter((s) => !/^\d+$/.test(String(s)))
    : FILTER_OPTIONS.sizes;

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggle(group, item) {
    setDraft((d) => {
      const next = new Set(d[group]);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return { ...d, [group]: Array.from(next) };
    });
  }

  function apply() {
    onApply?.(draft);
    onClose?.();
  }

  function clearAll() {
    const cleared = {
      sizes: [],
      colors: [],
      materials: [],
      types: [],
      priceMin: null,
      priceMax: null,
    };
    setDraft(cleared);
    onApply?.(cleared);
    onClose?.();
  }

  const applyCount =
    draft.sizes.length +
    draft.colors.length +
    draft.materials.length +
    draft.types.length +
    (draft.priceMin != null || draft.priceMax != null ? 1 : 0);

  // Live price bounds from the catalogue (myAppGetPriceRange), falling back to
  // the static mock range when the server didn't supply a usable one.
  const hasLiveRange =
    priceRange && Number.isFinite(priceRange.min) && Number.isFinite(priceRange.max) && priceRange.max > priceRange.min;
  const minPrice = hasLiveRange ? priceRange.min : FILTER_OPTIONS.priceRange[0];
  const maxPrice = hasLiveRange ? priceRange.max : FILTER_OPTIONS.priceRange[1];
  const currentMin = draft.priceMin ?? minPrice;
  const currentMax = draft.priceMax ?? maxPrice;

  function setPriceRange(lo, hi) {
    setDraft((d) => ({
      ...d,
      priceMin: lo <= minPrice ? null : lo,
      priceMax: hi >= maxPrice ? null : hi,
    }));
  }

  const shared = {
    draft,
    toggle,
    apply,
    clearAll,
    applyCount,
    minPrice,
    maxPrice,
    currentMin,
    currentMax,
    setPriceRange,
    types,
    colors,
    materials,
    numericSizes,
    alphaSizes,
    onClose,
    dataState,
  };

  return (
    <>
      {/* Backdrop scrim — animated fade */}
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

/* ---------- mobile (Figma 11:1797) ---------- */

function MobileCard({
  draft,
  toggle,
  apply,
  clearAll,
  applyCount,
  minPrice,
  maxPrice,
  currentMin,
  currentMax,
  setPriceRange,
  types,
  colors,
  materials,
  numericSizes,
  alphaSizes,
  onClose,
  dataState,
}) {
  return (
    <aside
      role="dialog"
      aria-modal="true"
      aria-label="Filters"
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
          <SectionTitle size={12}>SIZE</SectionTitle>
          <div className="flex flex-col" style={{ gap: 8 }}>
            <div className="flex flex-wrap" style={{ gap: 8 }}>
              {numericSizes.map((s) => (
                <SquareChip
                  key={s}
                  active={draft.sizes.includes(s)}
                  onClick={() => toggle("sizes", s)}
                  size={24}
                  borderWidth={1}
                  radius={2}
                  fontSize={12}
                >
                  {s}
                </SquareChip>
              ))}
            </div>
            <div className="flex flex-wrap" style={{ gap: 8 }}>
              {alphaSizes.map((s) => (
                <SquareChip
                  key={s}
                  active={draft.sizes.includes(s)}
                  onClick={() => toggle("sizes", s)}
                  size={24}
                  width={s.length >= 3 ? 28 : 24}
                  borderWidth={1}
                  radius={2}
                  fontSize={12}
                >
                  {s}
                </SquareChip>
              ))}
            </div>
          </div>
        </section>

        <section className="flex flex-col" style={{ gap: 8 }}>
          <SectionTitle size={12}>COLORS</SectionTitle>
          <div className="flex flex-wrap items-center" style={{ gap: 8 }}>
            {colors.map((c) => (
              <ColorSwatch
                key={c.hex}
                hex={c.hex}
                name={c.name}
                active={draft.colors.includes(c.hex)}
                onClick={() => toggle("colors", c.hex)}
                size={24}
                radius={2}
                inactiveBorder={1}
                activeBorder={2}
              />
            ))}
          </div>
        </section>

        <section className="flex flex-col" style={{ gap: 8 }}>
          <SectionTitle size={12}>MATERIAL</SectionTitle>
          <div className="flex flex-wrap" style={{ gap: 8 }}>
            {materials.map((m) => (
              <PillChip
                key={m}
                active={draft.materials.includes(m)}
                onClick={() => toggle("materials", m)}
                fontSize={12}
              >
                {m}
              </PillChip>
            ))}
          </div>
        </section>

        <section className="flex flex-col" style={{ gap: 8 }}>
          <SectionTitle size={12}>ITEM TYPE</SectionTitle>
          <div className="flex flex-wrap" style={{ gap: 8 }}>
            {types.map((t) => (
              <PillChip
                key={t}
                active={draft.types.includes(t)}
                onClick={() => toggle("types", t)}
                fontSize={12}
              >
                {t}
              </PillChip>
            ))}
          </div>
        </section>

        <section className="flex flex-col" style={{ gap: 8 }}>
          <SectionTitle size={12}>PRICE</SectionTitle>
          <PriceRangeSlider
            min={minPrice}
            max={maxPrice}
            valueMin={currentMin}
            valueMax={currentMax}
            onChange={setPriceRange}
            handleSize={12}
          />
          <PriceLabel currentMin={currentMin} currentMax={currentMax} fontSize={12} />
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
            <span
              style={{
                fontSize: 8,
                fontWeight: 400,
                color: "rgba(255,255,255,0.5)",
              }}
            >
              ({applyCount})
            </span>
          )}
        </button>
      </footer>
    </aside>
  );
}

/* ---------- desktop (Figma 126:3792 → node 126:4056) ---------- */

function DesktopCard({
  draft,
  toggle,
  apply,
  clearAll,
  applyCount,
  minPrice,
  maxPrice,
  currentMin,
  currentMax,
  setPriceRange,
  types,
  colors,
  materials,
  numericSizes,
  alphaSizes,
  onClose,
  dataState,
}) {
  return (
    <aside
      role="dialog"
      aria-modal="true"
      aria-label="Filters"
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

      {/* Sections — gap 32 (Figma desktop spacing) */}
      <div className="flex flex-1 flex-col" style={{ gap: 32 }}>
        {/* SIZE — chips 32x32, gap 12, text 16px */}
        <section className="flex flex-col" style={{ gap: 8 }}>
          <SectionTitle size={12}>SIZE</SectionTitle>
          <div className="flex flex-col" style={{ gap: 12 }}>
            <div className="flex flex-wrap" style={{ gap: 12 }}>
              {numericSizes.map((s) => (
                <SquareChip
                  key={s}
                  active={draft.sizes.includes(s)}
                  onClick={() => toggle("sizes", s)}
                  size={32}
                  borderWidth={1.5}
                  radius={3}
                  fontSize={16}
                >
                  {s}
                </SquareChip>
              ))}
            </div>
            <div className="flex flex-wrap" style={{ gap: 12 }}>
              {alphaSizes.map((s) => (
                <SquareChip
                  key={s}
                  active={draft.sizes.includes(s)}
                  onClick={() => toggle("sizes", s)}
                  size={32}
                  width={s.length >= 3 ? 38 : 32}
                  borderWidth={1.5}
                  radius={3}
                  fontSize={16}
                >
                  {s}
                </SquareChip>
              ))}
            </div>
          </div>
        </section>

        {/* COLORS — 32x32 swatches, gap 12, selected 3px ink border */}
        <section className="flex flex-col" style={{ gap: 8 }}>
          <SectionTitle size={12}>COLORS</SectionTitle>
          <div className="flex flex-wrap items-center" style={{ gap: 12 }}>
            {colors.map((c) => (
              <ColorSwatch
                key={c.hex}
                hex={c.hex}
                name={c.name}
                active={draft.colors.includes(c.hex)}
                onClick={() => toggle("colors", c.hex)}
                size={32}
                radius={3}
                inactiveBorder={1.5}
                activeBorder={3}
              />
            ))}
          </div>
        </section>

        {/* MATERIAL — h:24 px:6 pills, 14px text */}
        <section className="flex flex-col" style={{ gap: 8 }}>
          <SectionTitle size={12}>MATERIAL</SectionTitle>
          <div className="flex flex-wrap" style={{ gap: 12 }}>
            {materials.map((m) => (
              <PillChip
                key={m}
                active={draft.materials.includes(m)}
                onClick={() => toggle("materials", m)}
                fontSize={14}
              >
                {m}
              </PillChip>
            ))}
          </div>
        </section>

        {/* ITEM TYPE — same pill style */}
        <section className="flex flex-col" style={{ gap: 8 }}>
          <SectionTitle size={12}>ITEM TYPE</SectionTitle>
          <div className="flex flex-wrap" style={{ gap: 12 }}>
            {types.map((t) => (
              <PillChip
                key={t}
                active={draft.types.includes(t)}
                onClick={() => toggle("types", t)}
                fontSize={14}
              >
                {t}
              </PillChip>
            ))}
          </div>
        </section>

        {/* PRICE — 16x16 handles, 14px label */}
        <section className="flex flex-col" style={{ gap: 8 }}>
          <SectionTitle size={12}>PRICE</SectionTitle>
          <PriceRangeSlider
            min={minPrice}
            max={maxPrice}
            valueMin={currentMin}
            valueMax={currentMax}
            onChange={setPriceRange}
            handleSize={16}
          />
          <PriceLabel currentMin={currentMin} currentMax={currentMax} fontSize={14} />
        </section>
      </div>

      {/* Footer — STACKED buttons: APPLY ALL on top (filled), CLEAR ALL below
          (outlined). Both full-width h:48, radius 4, 14px Bold Expanded. */}
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

function SectionTitle({ children, size = 12 }) {
  return (
    <p
      style={{
        fontFamily: TXT_BODY,
        fontWeight: 400,
        fontSize: size,
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

// Square chip used for SIZE — `size` sets both height and default width.
// `width` overrides width only (used for XXL = 28/38).
function SquareChip({
  active,
  onClick,
  size = 24,
  width,
  borderWidth = 1,
  radius = 2,
  fontSize = 12,
  children,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid place-items-center transition-colors"
      style={{
        width: width ?? size,
        height: size,
        backgroundColor: active ? INK : "#ffffff",
        color: active ? "#ffffff" : INK,
        borderRadius: radius,
        border: `${borderWidth}px solid ${INK}`,
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

// Material / Item Type pill — auto-width with 6px L/R padding.
function PillChip({ active, onClick, fontSize = 12, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
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

function ColorSwatch({
  hex,
  name,
  active,
  onClick,
  size = 24,
  radius = 2,
  inactiveBorder = 1,
  activeBorder = 2,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={name}
      title={name}
      aria-pressed={active}
      style={{
        width: size,
        height: size,
        backgroundColor: hex,
        borderRadius: radius,
        border: active
          ? `${activeBorder}px solid ${INK}`
          : `${inactiveBorder}px solid rgba(17,25,31,0.10)`,
        padding: 0,
      }}
    />
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

function PriceLabel({ currentMin, currentMax, fontSize = 12 }) {
  return (
    <p
      style={{
        fontFamily: TXT_BODY,
        fontSize,
        fontStretch: "75%",
        color: INK,
        margin: 0,
        lineHeight: 1,
      }}
    >
      <span style={{ fontWeight: 400 }}>{`JOD ${currentMin}`}</span>
      <span style={{ fontWeight: 400 }}>{`  -  `}</span>
      <span style={{ fontWeight: 600 }}>{`JOD ${currentMax}`}</span>
    </p>
  );
}

// Dual-handle range slider — track height 3px (#f4f4f5), active fill #11191F
// between handles, square handles in #11191F. `handleSize` switches between
// 12 (mobile, Figma 11:1797) and 16 (desktop, Figma 126:4056).
function PriceRangeSlider({ min, max, valueMin, valueMax, onChange, handleSize = 12 }) {
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(null); // "lo" | "hi" | null

  const lo = Math.max(min, Math.min(valueMin, valueMax));
  const hi = Math.min(max, Math.max(valueMax, valueMin));
  const range = max - min || 1;
  const loPct = ((lo - min) / range) * 100;
  const hiPct = ((hi - min) / range) * 100;

  const pickHandle = useCallback(
    (clientX) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return null;
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const value = Math.round(min + pct * range);
      return Math.abs(value - lo) <= Math.abs(value - hi) ? "lo" : "hi";
    },
    [hi, lo, min, range],
  );

  const valueFromX = useCallback(
    (clientX) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return min;
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.round(min + pct * range);
    },
    [min, range],
  );

  useEffect(() => {
    if (!dragging) return;
    function onMove(e) {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const v = valueFromX(clientX);
      if (dragging === "lo") onChange(Math.min(v, hi), hi);
      else onChange(lo, Math.max(v, lo));
    }
    function onUp() {
      setDragging(null);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, hi, lo, onChange, valueFromX]);

  function onPointerDown(e) {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const which = pickHandle(clientX);
    if (!which) return;
    setDragging(which);
    const v = valueFromX(clientX);
    if (which === "lo") onChange(Math.min(v, hi), hi);
    else onChange(lo, Math.max(v, lo));
  }

  function onKey(which, e) {
    const step = e.shiftKey ? 10 : 1;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      if (which === "lo") onChange(Math.max(min, lo - step), hi);
      else onChange(lo, Math.max(lo, hi - step));
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      if (which === "lo") onChange(Math.min(hi, lo + step), hi);
      else onChange(lo, Math.min(max, hi + step));
    }
  }

  return (
    <div
      ref={trackRef}
      onMouseDown={onPointerDown}
      onTouchStart={onPointerDown}
      className="relative w-full select-none"
      style={{ height: handleSize, cursor: "pointer", touchAction: "none" }}
    >
      <div
        className="absolute left-0 right-0"
        style={{
          top: "50%",
          transform: "translateY(-50%)",
          height: 3,
          backgroundColor: "#f4f4f5",
          borderRadius: 1,
        }}
      />
      <div
        className="absolute"
        style={{
          top: "50%",
          transform: "translateY(-50%)",
          left: `${loPct}%`,
          width: `${Math.max(0, hiPct - loPct)}%`,
          height: 3,
          backgroundColor: INK,
          borderRadius: 1,
        }}
      />
      <button
        type="button"
        role="slider"
        aria-label="Minimum price"
        aria-valuemin={min}
        aria-valuemax={hi}
        aria-valuenow={lo}
        onKeyDown={(e) => onKey("lo", e)}
        onMouseDown={(e) => {
          e.stopPropagation();
          setDragging("lo");
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          setDragging("lo");
        }}
        className="absolute"
        style={{
          top: "50%",
          left: `${loPct}%`,
          transform: "translate(-50%, -50%)",
          width: handleSize,
          height: handleSize,
          backgroundColor: INK,
          borderRadius: handleSize >= 16 ? 3 : 2,
          padding: 0,
          border: "none",
          cursor: "grab",
        }}
      />
      <button
        type="button"
        role="slider"
        aria-label="Maximum price"
        aria-valuemin={lo}
        aria-valuemax={max}
        aria-valuenow={hi}
        onKeyDown={(e) => onKey("hi", e)}
        onMouseDown={(e) => {
          e.stopPropagation();
          setDragging("hi");
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          setDragging("hi");
        }}
        className="absolute"
        style={{
          top: "50%",
          left: `${hiPct}%`,
          transform: "translate(-50%, -50%)",
          width: handleSize,
          height: handleSize,
          backgroundColor: INK,
          borderRadius: handleSize >= 16 ? 3 : 2,
          padding: 0,
          border: "none",
          cursor: "grab",
        }}
      />
    </div>
  );
}

function normalize(v) {
  return {
    sizes: v?.sizes ?? [],
    colors: v?.colors ?? [],
    materials: v?.materials ?? [],
    types: v?.types ?? [],
    priceMin: v?.priceMin ?? null,
    priceMax: v?.priceMax ?? null,
  };
}

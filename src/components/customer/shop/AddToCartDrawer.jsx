"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { FILTER_OPTIONS } from "@/lib/mockShop";

// Quick-add dialog triggered by the plus button on ProductCard.
//   Mobile (Figma 7:1358 → node 12:2286): BOTTOM-ANCHORED CARD —
//     w:361 (clamped to viewport-32 on narrow screens), anchored 24px above
//     the viewport bottom, padding:24, borderRadius:8,
//     gap:24 between header/body/footer; gap:12 between body sections.
//     No product image on mobile. Sections (gap:8 between title and body):
//       COLOR  — swatches (24x24, 1px subtle border; selected: 2px #11191F border)
//       SIZE   — chips S/M/L/XL (24x24) / XXL (28x24); active = #11191F bg, white text
//       QUANTITY — [−ghost] [number input 48x24] [+filled] all h:24, borderRadius:2,
//                   outline 1px #11191F inset. The + button is filled (#11191F bg).
//     Footer: full-width ADD TO CART, h:40, padding:8, borderRadius:4,
//             #11191F bg, white 12px Zalando Sans Expanded Bold (700).
//   Desktop (Figma 120:7368): right-side drawer pinned to viewport edge —
//     w:387, full height, padding:24, gap:24 between sections.
//     Sections (gap:8 between title and body, except product which uses gap:16):
//       Product — image (aspect 326/489, bg #f5f5f5, soft shadow) + below it
//                 a row with title (16px Medium Expanded) / subtitle (16px
//                 Condensed Regular rgba(17,25,31,0.5)) and price (16px
//                 SemiBold Expanded) on the right.
//       COLOR — 32x32 swatches, radius 3, 1.5px subtle border; selected: 3px #11191F border
//       SIZE  — 32x32 chips (XXL ≈ 38x32), radius 3, 1.5px #11191F border; active = filled #11191F + white
//       QUANTITY — [−] [number 64x32] [+filled] all h:32, radius 3, 1.5px border
//     Footer: ADD TO CART full-width, h:48, radius:4, #11191F bg, 14px Expanded Bold white.
//     No header divider, no sticky footer with border — clean spacing.

// Keep the dialog mounted while the close animation plays (same pattern as
// FilterDrawer). `open` toggles in the parent; we hold render=true through
// the exit window. The parent also clears `product` to null on close, so we
// cache the last-seen product in a ref to keep rendering it during the exit.
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

export default function AddToCartDrawer({ open, product, onClose, onAdd }) {
  const lastProductRef = useRef(product);
  if (product) lastProductRef.current = product;

  const { render, dataState } = useDelayedUnmount(open && Boolean(product), 320);
  if (!render || !lastProductRef.current) return null;

  return (
    <DialogBody
      product={lastProductRef.current}
      onClose={onClose}
      onAdd={onAdd}
      dataState={dataState}
    />
  );
}

function DialogBody({ product, onClose, onAdd, dataState }) {
  const [size, setSize] = useState(null);
  const [color, setColor] = useState(product.colors?.[0] ?? null);
  const [qty, setQty] = useState(1);

  return (
    <>
      {/* Backdrop — Figma rgba(17,25,31,0.50), animated fade */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        data-state={dataState}
        className="drawer-backdrop fixed inset-0 z-40"
        style={{ backgroundColor: "rgba(17,25,31,0.50)" }}
      />

      {/* MOBILE: bottom-anchored card (Figma 7:1358 → node 12:2286) — w:361, padding:24, gap:24 */}
      <aside
        role="dialog"
        aria-label={`Add ${product.name} to cart`}
        data-state={dataState}
        className="bottom-card fixed left-0 right-0 mx-auto bottom-6 z-50 flex w-[361px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-48px)] flex-col gap-6 overflow-y-auto bg-white shadow-xl md:hidden"
        style={{ borderRadius: 8, padding: 24 }}
      >
        <MobileHeader onClose={onClose} />

        {/* Body — gap 12 between sections (Color / Size / Quantity) */}
        <div className="flex flex-col" style={{ gap: 12 }}>
          <MobileColorSection
            colors={product.colors}
            value={color}
            onChange={setColor}
          />
          <MobileSizeSection value={size} onChange={setSize} />
          <MobileQuantitySection value={qty} onChange={setQty} />
        </div>

        {/* Footer — ADD TO CART, h:40, borderRadius:4, 12px Bold */}
        <div className="flex" style={{ gap: 8 }}>
          <button
            type="button"
            disabled={!size}
            onClick={() => {
              onAdd?.({ product, size, color, qty });
              onClose?.();
            }}
            className="font-display grid flex-1 place-items-center transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{
              height: 40,
              padding: 8,
              backgroundColor: "#11191F",
              borderRadius: 4,
              color: "#ffffff",
              fontWeight: 700,
              fontSize: 12,
              lineHeight: 1,
            }}
          >
            ADD TO CART
          </button>
        </div>
      </aside>

      {/* DESKTOP: floating right-side card — Figma 120:7368.
          NOT flush to the viewport edge: 32px margin top/bottom/right,
          fully rounded corners (8px), w=384 (w-96), p=24, gap-6, bg-white.
          Backdrop scrim sits behind it. Sections (gap-6): Product (image +
          title/subtitle/price row) → COLOR → SIZE → QUANTITY → ADD TO CART
          button (h:48, full inner width, rounded:4). */}
      <aside
        role="dialog"
        aria-label={`Add ${product.name} to cart`}
        data-state={dataState}
        className="right-drawer drawer-scroll fixed right-8 top-8 bottom-8 z-50 hidden w-[387px] flex-col overflow-y-auto bg-white shadow-2xl md:flex"
        style={{ padding: 24, gap: 24, borderRadius: 8 }}
      >
        <DesktopHeader onClose={onClose} />

        <div className="flex flex-1 flex-col" style={{ gap: 24 }}>
          {/* Product: image (Figma 326/489 aspect) + title/subtitle/price row */}
          <section className="flex flex-col" style={{ gap: 16 }}>
            <div
              className="relative w-full overflow-hidden bg-[#f5f5f5]"
              style={{
                aspectRatio: "326 / 489",
                boxShadow: "0 0 18.523px 0 rgba(0,0,0,0.05)",
              }}
            >
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="339px"
                className="object-cover"
              />
            </div>
            <div className="flex items-start justify-between">
              <div className="flex flex-col" style={{ gap: 4 }}>
                <h3
                  className="font-display"
                  style={{
                    fontWeight: 500,
                    fontSize: 16,
                    lineHeight: "24px",
                    color: "#11191F",
                    margin: 0,
                  }}
                >
                  {product.name}
                </h3>
                <p
                  className="font-body"
                  style={{
                    fontWeight: 400,
                    fontSize: 16,
                    lineHeight: "20px",
                    color: "rgba(17,25,31,0.5)",
                    fontStretch: "75%",
                    margin: 0,
                  }}
                >
                  {product.subtitle}
                </p>
              </div>
              <p
                className="font-display"
                style={{
                  fontWeight: 600,
                  fontSize: 16,
                  lineHeight: "24px",
                  color: "#11191F",
                  margin: 0,
                  whiteSpace: "nowrap",
                }}
              >
                {product.currency} {product.salePrice ?? product.price}
              </p>
            </div>
          </section>

          <DesktopColorSection
            colors={product.colors}
            value={color}
            onChange={setColor}
          />
          <DesktopSizeSection value={size} onChange={setSize} />
          <DesktopQuantitySection value={qty} onChange={setQty} />
        </div>

        {/* ADD TO CART: h:48, full inner width (= 339px), rounded:4.
            Disabled until a size is selected, same UX as mobile. */}
        <button
          type="button"
          disabled={!size}
          onClick={() => {
            onAdd?.({ product, size, color, qty });
            onClose?.();
          }}
          className="font-display grid place-items-center transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{
            width: "100%",
            height: 48,
            padding: 8,
            backgroundColor: "#11191F",
            borderRadius: 4,
            color: "#ffffff",
            fontWeight: 700,
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          ADD TO CART
        </button>
      </aside>
    </>
  );
}

/* ---------- desktop pieces (Figma 120:7368) ---------- */

function DesktopHeader({ onClose }) {
  return (
    <header className="flex items-center justify-between">
      <h2
        className="font-display"
        style={{
          fontWeight: 700,
          fontSize: 14,
          color: "#11191F",
          margin: 0,
          lineHeight: 1,
          letterSpacing: "0.02em",
        }}
      >
        ADD ITEM TO CART
      </h2>
      {/* 24x24 outlined square with X icon (= rotated +). */}
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
          aria-hidden
        >
          <path d="M7 7l10 10M17 7L7 17" strokeLinecap="round" />
        </svg>
      </button>
    </header>
  );
}

function DesktopSectionTitle({ children }) {
  return (
    <p
      className="font-body"
      style={{
        fontWeight: 400,
        fontSize: 14,
        lineHeight: 1,
        color: "rgba(17,25,31,0.8)",
        fontStretch: "75%",
        margin: 0,
        letterSpacing: "0.02em",
      }}
    >
      {children}
    </p>
  );
}

function DesktopColorSection({ colors, value, onChange }) {
  return (
    <section className="flex flex-col" style={{ gap: 8 }}>
      <DesktopSectionTitle>COLOR</DesktopSectionTitle>
      <div className="flex flex-wrap items-center" style={{ gap: 8 }}>
        {(colors ?? []).map((hex) => {
          const active = value === hex;
          return (
            <button
              key={hex}
              type="button"
              aria-label={hex}
              aria-pressed={active}
              onClick={() => onChange(hex)}
              style={{
                width: 32,
                height: 32,
                backgroundColor: hex,
                borderRadius: 3,
                border: active
                  ? "3px solid #11191F"
                  : "1.5px solid rgba(17,25,31,0.10)",
                padding: 0,
              }}
            />
          );
        })}
      </div>
    </section>
  );
}

function DesktopSizeSection({ value, onChange }) {
  return (
    <section className="flex flex-col" style={{ gap: 8 }}>
      <DesktopSectionTitle>SIZE</DesktopSectionTitle>
      <div className="flex flex-wrap" style={{ gap: 8 }}>
        {FILTER_OPTIONS.sizes.map((s) => {
          const active = value === s;
          // XXL is wider in Figma (37.333px ≈ 38).
          const w = s.length >= 3 ? 38 : 32;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className="font-body grid place-items-center transition-colors"
              style={{
                width: w,
                height: 32,
                backgroundColor: active ? "#11191F" : "#ffffff",
                color: active ? "#ffffff" : "#11191F",
                borderRadius: 3,
                border: "1.5px solid #11191F",
                fontWeight: 500,
                fontSize: 16,
                fontStretch: "75%",
                lineHeight: 1,
              }}
            >
              {s}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function DesktopQuantitySection({ value, onChange }) {
  return (
    <section className="flex flex-col" style={{ gap: 8 }}>
      <DesktopSectionTitle>QUANTITY</DesktopSectionTitle>
      <div className="flex items-center" style={{ gap: 8 }}>
        {/* Minus — 32x32, white bg, 1.5px #11191F border, horizontal stroke */}
        <button
          type="button"
          aria-label="Decrease"
          onClick={() => onChange(Math.max(1, value - 1))}
          className="grid place-items-center"
          style={{
            width: 32,
            height: 32,
            backgroundColor: "#ffffff",
            borderRadius: 3,
            border: "1.5px solid #11191F",
          }}
        >
          <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden>
            <line x1="9" y1="16" x2="23" y2="16" stroke="#11191F" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        {/* Number — w:64, h:32, 1.5px border, Zalando Sans Condensed Medium 16px */}
        <div
          className="font-body grid place-items-center"
          style={{
            width: 64,
            height: 32,
            paddingLeft: 8,
            paddingRight: 8,
            backgroundColor: "#ffffff",
            borderRadius: 3,
            border: "1.5px solid #11191F",
            color: "#11191F",
            fontWeight: 500,
            fontSize: 16,
            fontStretch: "75%",
            lineHeight: 1,
          }}
        >
          {value}
        </div>
        {/* Plus — 32x32, #11191F bg, white plus icon */}
        <button
          type="button"
          aria-label="Increase"
          onClick={() => onChange(value + 1)}
          className="grid place-items-center"
          style={{
            width: 32,
            height: 32,
            backgroundColor: "#11191F",
            borderRadius: 3,
            border: "1.5px solid #11191F",
          }}
        >
          <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden>
            <line x1="9" y1="16" x2="23" y2="16" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="16" y1="9" x2="16" y2="23" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </section>
  );
}

/* ---------- mobile pieces (Figma 7:1358) ---------- */

function MobileHeader({ onClose }) {
  return (
    <header className="flex items-center justify-between">
      <h2
        className="font-display"
        style={{
          fontWeight: 700,
          fontSize: 14,
          color: "#11191F",
          margin: 0,
          lineHeight: 1,
        }}
      >
        ADD ITEM TO CART
      </h2>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="relative grid place-items-center"
        style={{
          width: 24,
          height: 24,
          borderRadius: 2,
          outline: "1px solid #11191F",
          outlineOffset: "-1px",
          backgroundColor: "transparent",
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#11191F" strokeWidth="1.5" width="24" height="24" aria-hidden>
          <path d="M7 7l10 10M17 7L7 17" />
        </svg>
      </button>
    </header>
  );
}

function MobileSectionTitle({ children }) {
  return (
    <p
      className="font-body"
      style={{
        fontWeight: 400,
        fontSize: 12,
        fontStretch: "75%",
        color: "rgba(17,25,31,0.80)",
        margin: 0,
      }}
    >
      {children}
    </p>
  );
}

function MobileColorSection({ colors, value, onChange }) {
  return (
    <section className="flex flex-col" style={{ gap: 8 }}>
      <MobileSectionTitle>COLOR</MobileSectionTitle>
      <div className="flex flex-wrap items-center" style={{ gap: 8 }}>
        {(colors ?? []).map((hex) => {
          const active = value === hex;
          return (
            <button
              key={hex}
              type="button"
              aria-label={hex}
              onClick={() => onChange(hex)}
              style={{
                width: 24,
                height: 24,
                backgroundColor: hex,
                borderRadius: 2,
                border: active
                  ? "2px solid #11191F"
                  : "1px solid rgba(17,25,31,0.10)",
              }}
            />
          );
        })}
      </div>
    </section>
  );
}

function MobileSizeSection({ value, onChange }) {
  return (
    <section className="flex flex-col" style={{ gap: 8 }}>
      <MobileSectionTitle>SIZE</MobileSectionTitle>
      <div className="flex flex-wrap" style={{ gap: 8 }}>
        {FILTER_OPTIONS.sizes.map((s) => {
          const active = value === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className="font-body grid place-items-center transition-colors"
              style={{
                width: s.length >= 3 ? 28 : 24,
                height: 24,
                backgroundColor: active ? "#11191F" : "#ffffff",
                color: active ? "#ffffff" : "#11191F",
                borderRadius: 2,
                outline: "1px solid #11191F",
                outlineOffset: "-1px",
                fontWeight: 500,
                fontSize: 12,
                fontStretch: "75%",
                lineHeight: 1,
              }}
            >
              {s}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function MobileQuantitySection({ value, onChange }) {
  return (
    <section className="flex flex-col" style={{ gap: 8 }}>
      <MobileSectionTitle>QUANTITY</MobileSectionTitle>
      <div className="flex items-center" style={{ gap: 8 }}>
        {/* − ghost button (Figma: 12x1.5px stroke at y=12) */}
        <button
          type="button"
          aria-label="Decrease"
          onClick={() => onChange(Math.max(1, value - 1))}
          className="grid place-items-center"
          style={{
            width: 24,
            height: 24,
            backgroundColor: "#ffffff",
            borderRadius: 2,
            outline: "1px solid #11191F",
            outlineOffset: "-1px",
          }}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
            <line x1="6" y1="12" x2="18" y2="12" stroke="#11191F" strokeWidth="1.5" />
          </svg>
        </button>
        {/* number display 48x24 */}
        <div
          className="font-body grid place-items-center"
          style={{
            width: 48,
            height: 24,
            paddingLeft: 6,
            paddingRight: 6,
            backgroundColor: "#ffffff",
            borderRadius: 2,
            outline: "1px solid #11191F",
            outlineOffset: "-1px",
            color: "#11191F",
            fontWeight: 500,
            fontSize: 12,
            fontStretch: "75%",
            lineHeight: 1,
          }}
        >
          {value}
        </div>
        {/* + filled button (Figma: 12x1.5px horizontal + 12x1.5px vertical white strokes) */}
        <button
          type="button"
          aria-label="Increase"
          onClick={() => onChange(value + 1)}
          className="grid place-items-center"
          style={{
            width: 24,
            height: 24,
            backgroundColor: "#11191F",
            borderRadius: 2,
            outline: "1px solid #11191F",
            outlineOffset: "-1px",
          }}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
            <line x1="6" y1="12" x2="18" y2="12" stroke="#FFFFFF" strokeWidth="1.5" />
            <line x1="12" y1="6" x2="12" y2="18" stroke="#FFFFFF" strokeWidth="1.5" />
          </svg>
        </button>
      </div>
    </section>
  );
}


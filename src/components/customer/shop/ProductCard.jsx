"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

// Card layout, per Figma:
//   Mobile (2:12 + sale 7:244):
//     - Image fills card width, ~176x264 ratio.
//     - Bottom-left: up to 4 tiny square swatches (8x8) flush.
//     - Bottom-right: translucent white square plus button (24x24).
//     - Below image:
//         Row 1: name (left)            JOD XX (right, sale → strikethrough)
//         Row 2: subtitle (left)        sale chip "JOD 15.99" (right, blue)
//   Desktop (119:3858):
//     - Image ~326x489 on grey bg.
//     - Larger swatches (12x12), larger plus button (40x40) at bottom-right.
//     - Below image:
//         Row 1: stacked name + subtitle  |  price right
//
// Colour switcher + per-colour swipe: each swatch is now a button. Selecting a
// swatch shows that colour's image set; when a colour has more than one image
// the shopper can swipe left/right (touch) or use the hover chevrons (desktop)
// to move through them. The swipe mechanics mirror the product-detail carousel
// (ProductPageClient). When the product carries no per-colour images
// (`colorImages` empty — e.g. mock data in SearchOverlay / coming-soon), the
// card falls back to the original single image + decorative swatches.
//
// `onQuickAdd(product)` is called when the plus button is clicked — the
// parent opens the Add-to-Cart sheet.

export default function ProductCard({ product, onQuickAdd, compact = false }) {
  if (compact) return <MobileCard product={product} onQuickAdd={onQuickAdd} />;
  return <DesktopCard product={product} onQuickAdd={onQuickAdd} />;
}

function ChevronIcon({ dir = "right" }) {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" aria-hidden="true">
      <path
        d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
        stroke="#11191f"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Swipeable, color-scoped image viewer. `images` is the selected color's image
// list (always ≥1). A transparent <Link> overlay handles tap-to-navigate; a
// real swipe (tracked via movedRef) suppresses that navigation so the gesture
// doesn't open the product. Remounted by the parent (`key={selectedColor}`) on
// color change so the index resets to the first image.
function ColorImageViewer({
  images,
  name,
  href,
  aspectRatio,
  sizes,
  showArrows = false,
  priority = false,
}) {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0);
  const startX = useRef(null);
  // Width lives in state, not a ref: it is READ during render (to turn the
  // px drag into a percentage), and a ref read during render is torn by
  // concurrent rendering / StrictMode (react-hooks/refs). startX and movedRef
  // stay refs — they are only ever touched inside event handlers, which is
  // exactly what refs are for.
  const [width, setWidth] = useState(0);
  const movedRef = useRef(false);

  const count = images.length;
  const idx = index < count ? index : 0;
  const multi = count > 1;

  function onTouchStart(e) {
    startX.current = e.touches[0].clientX;
    setWidth(e.currentTarget.offsetWidth);
    movedRef.current = false;
  }
  function onTouchMove(e) {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    if (Math.abs(dx) > 6) movedRef.current = true;
    const atStart = idx === 0 && dx > 0;
    const atEnd = idx === count - 1 && dx < 0;
    setDrag(atStart || atEnd ? dx / 3 : dx);
  }
  function onTouchEnd() {
    if (startX.current === null) return;
    const w = width || 1;
    const threshold = Math.min(50, w * 0.15);
    if (drag <= -threshold && idx < count - 1) setIndex(idx + 1);
    else if (drag >= threshold && idx > 0) setIndex(idx - 1);
    setDrag(0);
    startX.current = null;
  }

  const w = width || 1;
  const dragPct = (drag / w) * 100;

  function go(e, dir) {
    e.preventDefault();
    e.stopPropagation();
    setIndex((i) => Math.min(count - 1, Math.max(0, i + dir)));
  }

  return (
    <div
      className="relative block w-full overflow-hidden touch-pan-y select-none"
      style={{ aspectRatio }}
      onTouchStart={multi ? onTouchStart : undefined}
      onTouchMove={multi ? onTouchMove : undefined}
      onTouchEnd={multi ? onTouchEnd : undefined}
      onTouchCancel={multi ? onTouchEnd : undefined}
    >
      <div
        className={`flex h-full w-full ${drag === 0 ? "transition-transform duration-300" : ""}`}
        style={{ transform: `translateX(calc(-${idx * 100}% + ${dragPct}%))` }}
      >
        {images.map((src, i) => (
          <div key={i} className="relative h-full w-full shrink-0">
            <Image
              src={src}
              alt={name}
              fill
              sizes={sizes}
              className="object-cover pointer-events-none"
              priority={priority && i === 0}
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* Tap → product detail; a swipe sets movedRef so navigation is suppressed. */}
      <Link
        href={href}
        aria-label={name}
        className="absolute inset-0 z-10"
        onClick={(e) => {
          if (movedRef.current) e.preventDefault();
        }}
      />

      {/* Desktop hover chevrons — mouse has no swipe gesture. */}
      {showArrows && multi && (
        <>
          {idx > 0 && (
            <button
              type="button"
              aria-label="Previous image"
              onClick={(e) => go(e, -1)}
              className="absolute left-2 top-1/2 z-20 hidden size-7 -translate-y-1/2 place-items-center rounded-full bg-white/70 opacity-0 transition-opacity hover:bg-white group-hover:opacity-100 md:grid"
              style={{ backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }}
            >
              <ChevronIcon dir="left" />
            </button>
          )}
          {idx < count - 1 && (
            <button
              type="button"
              aria-label="Next image"
              onClick={(e) => go(e, 1)}
              className="absolute right-2 top-1/2 z-20 hidden size-7 -translate-y-1/2 place-items-center rounded-full bg-white/70 opacity-0 transition-opacity hover:bg-white group-hover:opacity-100 md:grid"
              style={{ backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }}
            >
              <ChevronIcon dir="right" />
            </button>
          )}
        </>
      )}

      {/* Dots — bottom-center, only when the active color has multiple images. */}
      {multi && (
        <div className="pointer-events-none absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1">
          {images.map((_, i) => (
            <span
              key={i}
              className="rounded-full transition-all duration-200"
              style={{
                width: i === idx ? 10 : 4,
                height: 4,
                backgroundColor: i === idx ? "#11191f" : "rgba(17,25,31,0.3)",
                boxShadow: "0 0 2px rgba(255,255,255,0.8)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QuickAddButton({ size, offset = 8, product, onQuickAdd }) {
  // Glassmorphism per Figma:
  //   Mobile (2:12 / 2:857): 24x24, right:8, bottom:8.
  //   Desktop (119:3858): 40x40, right:16, bottom:16.
  //   background rgba(255,255,255,0.30); 0.3px white/70 outline INSET by
  //   -0.3px (sits inside the button edge); borderRadius 2;
  //   backdropFilter blur(1.5px). Properties are inline because Tailwind v4 +
  //   Turbopack silently drops arbitrary `backdrop-blur-[1.5px]` and the
  //   outline-offset utilities — without inline styles the button renders as
  //   a flat translucent box and the glass effect is lost. z-20 keeps it above
  //   the ColorImageViewer's z-10 tap-to-navigate Link.
  return (
    <button
      type="button"
      aria-label={`Quick add ${product.name}`}
      onClick={(e) => {
        e.preventDefault();
        onQuickAdd?.(product);
      }}
      className="absolute z-20 grid place-items-center hover:bg-white/50"
      style={{
        right: offset,
        bottom: offset,
        width: size,
        height: size,
        backgroundColor: "rgba(255,255,255,0.3)",
        borderRadius: 2,
        outline: "0.3px solid rgba(255,255,255,0.7)",
        outlineOffset: "-0.3px",
        backdropFilter: "blur(1.5px)",
        WebkitBackdropFilter: "blur(1.5px)",
      }}
    >
      <Image
        src="/shop/icon-add.svg"
        alt=""
        width={size === 24 ? 12 : 14}
        height={size === 24 ? 12 : 14}
      />
    </button>
  );
}

// Label badges shown at top-left of the product image (#5). Tones are
// keyed off the well-known label set the admin Products drawer exposes.
const LABEL_TONES = {
  "Best Seller":   { bg: "#11191f", fg: "#ffffff" },
  "Most Popular":  { bg: "#0066b2", fg: "#ffffff" },
  "New Arrival":   { bg: "#16a34a", fg: "#ffffff" },
  "Limited":       { bg: "#a855f7", fg: "#ffffff" },
  "Low Stock":     { bg: "#dc2626", fg: "#ffffff" },
};

function LabelBadges({ labels, small = true }) {
  if (!labels || labels.length === 0) return null;
  const fontSize = small ? 7 : 8;
  const padY = small ? 1 : 2;
  const padX = small ? 3 : 5;
  const gap = small ? 4 : 6;
  const offset = small ? 8 : 16;
  return (
    <div
      className="pointer-events-none absolute z-20 flex flex-wrap"
      style={{ top: offset, left: offset, gap, maxWidth: `calc(100% - ${offset * 2}px)` }}
      aria-hidden
    >
      {labels.map((lab) => {
        const tone = LABEL_TONES[lab] || { bg: "#11191f", fg: "#ffffff" };
        return (
          <span
            key={lab}
            className="font-display font-medium uppercase whitespace-nowrap"
            style={{
              backgroundColor: tone.bg,
              color: tone.fg,
              fontSize,
              letterSpacing: "0.3px",
              paddingTop: padY,
              paddingBottom: padY,
              paddingLeft: padX,
              paddingRight: padX,
              borderRadius: 2,
            }}
          >
            {lab}
          </span>
        );
      })}
    </div>
  );
}

// Decorative swatches — used as the fallback when a product has no per-color
// image data (mock products). Non-interactive.
function Swatches({ colors, small, offset = 8 }) {
  // Figma:
  //   Mobile: up to 4 swatches, 8x8, gap 2, anchor left:8/bottom:8.
  //   Desktop: up to 3 swatches, 12x12, gap 8, anchor left:16/bottom:16.
  const max = small ? 4 : 3;
  const slice = (colors ?? []).slice(0, max);
  const dot = small ? 8 : 12;
  const gap = small ? 2 : 8;
  return (
    <div
      className="absolute z-20 pointer-events-none flex"
      style={{ left: offset, bottom: offset, gap }}
      aria-hidden
    >
      {slice.map((c, i) => (
        <span
          key={`${c}-${i}`}
          className="rounded-[2px] border border-[rgba(17,25,31,0.1)] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]"
          style={{ width: dot, height: dot, backgroundColor: c }}
        />
      ))}
    </div>
  );
}

// Interactive color picker — each swatch selects that color's image set. The
// selected swatch wears a black ring with a white inset (matches the
// product-detail selected-color treatment, scaled down to the card swatch).
function ColorSwatchPicker({ colorImages, selected, onSelect, small, offset = 8 }) {
  const max = small ? 4 : 3;
  const slice = colorImages.slice(0, max);
  const dot = small ? 8 : 12;
  const gap = small ? 2 : 8;
  return (
    <div className="absolute z-20 flex" style={{ left: offset, bottom: offset, gap }}>
      {slice.map((c, i) => {
        const active = i === selected;
        return (
          <button
            key={`${c.colorId ?? c.hex}-${i}`}
            type="button"
            aria-label={`Show color ${i + 1}`}
            aria-pressed={active}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelect(i);
            }}
            className="cursor-pointer rounded-[2px]"
            style={{
              width: dot,
              height: dot,
              backgroundColor: c.hex,
              boxShadow: active
                ? "0 0 0 1px #ffffff inset, 0 0 0 1.5px #11191f"
                : "0 1px 2px 0 rgba(0,0,0,0.05)",
              border: active ? "none" : "1px solid rgba(17,25,31,0.1)",
            }}
          />
        );
      })}
    </div>
  );
}

// Shared hook: resolve the active color + its image list, with fallback to the
// single primary `image` when the product carries no per-color image data.
function useColorState(product) {
  const colorImages = Array.isArray(product.colorImages) ? product.colorImages : [];
  const [selected, setSelected] = useState(0);
  const hasColorImages = colorImages.length > 0;
  const safeSelected = selected < colorImages.length ? selected : 0;
  const activeImages = hasColorImages
    ? (colorImages[safeSelected]?.images?.length
        ? colorImages[safeSelected].images
        : [product.image].filter(Boolean))
    : [product.image].filter(Boolean);
  return { colorImages, hasColorImages, selected: safeSelected, setSelected, activeImages };
}

function MobileCard({ product, onQuickAdd }) {
  const hasDiscount = product.salePrice != null && product.salePrice < product.price;
  const { colorImages, hasColorImages, selected, setSelected, activeImages } =
    useColorState(product);

  return (
    <article className="flex flex-col gap-2">
      <div className="group relative isolate w-full bg-[#f5f5f5] shadow-[0_0_10px_0_rgba(0,0,0,0.05)]">
        <ColorImageViewer
          key={selected}
          images={activeImages}
          name={product.name}
          href={`/products/${product.id}`}
          aspectRatio="176 / 264"
          sizes="(max-width: 768px) 50vw, 176px"
        />
        <LabelBadges labels={product.labels} small />
        {hasColorImages ? (
          <ColorSwatchPicker
            colorImages={colorImages}
            selected={selected}
            onSelect={setSelected}
            small
          />
        ) : (
          product.colors?.length > 0 && <Swatches colors={product.colors} small />
        )}
        <QuickAddButton size={24} product={product} onQuickAdd={onQuickAdd} />
      </div>

      {/* Label row — Figma 7:1358 sale variant: left column = name+subtitle,
          right column = strikethrough price stacked above blue chip (#0066B2,
          NOT #1d4ed8 — Figma "Repair Blue"). Non-sale: same left column,
          right side is just the price text. */}
      <div
        className="flex justify-between gap-2 px-1"
        style={{ alignItems: hasDiscount ? "center" : "flex-start" }}
      >
        <div className="flex w-[87px] flex-col" style={{ gap: 2 }}>
          <h3
            className="font-body truncate text-[12px] font-medium leading-[14px] text-[#11191f]"
            style={{ fontStretch: "75%" }}
          >
            {product.name}
          </h3>
          <p
            className="font-body truncate text-[10px] leading-[12px] text-[rgba(17,25,31,0.5)]"
            style={{ fontStretch: "75%" }}
          >
            {product.subtitle}
          </p>
        </div>

        {hasDiscount ? (
          <div className="flex flex-col items-end" style={{ gap: 2 }}>
            <p
              className="font-body whitespace-nowrap text-right text-[12px] leading-[14px]"
              style={{
                fontStretch: "75%",
                fontWeight: 400,
                color: "rgba(17,25,31,0.5)",
                textDecoration: "line-through",
              }}
            >
              {product.currency} {product.price}
            </p>
            <span
              className="font-body whitespace-nowrap text-[10px] leading-[12px] text-white"
              style={{
                fontStretch: "75%",
                fontWeight: 400,
                backgroundColor: "#0066B2",
                paddingLeft: 4,
                paddingRight: 4,
                paddingTop: 2,
                paddingBottom: 2,
              }}
            >
              {product.currency} {product.salePrice.toFixed(2)}
            </span>
          </div>
        ) : (
          <p
            className="font-body whitespace-nowrap text-right text-[12px] font-semibold leading-[14px] text-[#11191f]"
            style={{ fontStretch: "75%" }}
          >
            {product.currency} {product.price}
          </p>
        )}
      </div>
    </article>
  );
}

function DesktopCard({ product, onQuickAdd }) {
  const hasDiscount = product.salePrice != null && product.salePrice < product.price;
  const { colorImages, hasColorImages, selected, setSelected, activeImages } =
    useColorState(product);

  return (
    <article className="flex flex-col gap-4">
      <div className="group relative isolate w-full overflow-hidden bg-[#f5f5f5] shadow-[0_0_18.523px_0_rgba(0,0,0,0.05)]">
        <ColorImageViewer
          key={selected}
          images={activeImages}
          name={product.name}
          href={`/products/${product.id}`}
          aspectRatio="326 / 489"
          sizes="326px"
          showArrows
        />
        <LabelBadges labels={product.labels} small={false} />
        {hasColorImages ? (
          <ColorSwatchPicker
            colorImages={colorImages}
            selected={selected}
            onSelect={setSelected}
            offset={16}
          />
        ) : (
          product.colors?.length > 0 && <Swatches colors={product.colors} offset={16} />
        )}
        <QuickAddButton size={40} offset={16} product={product} onQuickAdd={onQuickAdd} />
      </div>

      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-[16px] font-medium leading-6 text-[#11191f]">
            {product.name}
          </h3>
          <p
            // Subtitle: Figma uses stone-500 (#78716c) + Zalando Sans Condensed
            // Regular 16px / leading-5. font-body + fontStretch:75% approximates
            // the Condensed weight (project doesn't ship a separate Condensed).
            className="font-body text-[16px] leading-5 text-[#78716c]"
            style={{ fontStretch: "75%" }}
          >
            {product.subtitle}
          </p>
        </div>
        {hasDiscount ? (
          // Figma codegen (desktop sale): previous price strikethrough above a
          // filled blue chip, both in Zalando Sans Condensed Regular. Condensed
          // → font-body + fontStretch:75% (project ships no separate Condensed);
          // chip bg kept at the established Repair Blue #0066B2 so mobile +
          // desktop sale chips match (inline style per the Turbopack gotcha for
          // conditionally-rendered backgrounds).
          <div className="flex flex-col items-end" style={{ gap: 2 }}>
            <p
              className="font-body text-right text-[16px] leading-6 whitespace-nowrap"
              style={{
                fontStretch: "75%",
                fontWeight: 400,
                color: "rgba(17,25,31,0.5)",
                textDecoration: "line-through",
              }}
            >
              {product.currency} {product.price}
            </p>
            <span
              className="font-body text-right text-[14px] leading-4 text-white whitespace-nowrap"
              style={{
                fontStretch: "75%",
                fontWeight: 400,
                backgroundColor: "#0066B2",
                paddingLeft: 8,
                paddingRight: 8,
                paddingTop: 4,
                paddingBottom: 4,
              }}
            >
              {product.currency} {product.salePrice.toFixed(2)}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-end gap-1">
            <p className="font-display text-[16px] font-semibold leading-6 text-[#11191f] whitespace-nowrap">
              {product.currency} {product.price}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}

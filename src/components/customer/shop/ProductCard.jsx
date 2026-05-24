"use client";

import Image from "next/image";
import Link from "next/link";

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
// `onQuickAdd(product)` is called when the plus button is clicked — the
// parent opens the Add-to-Cart sheet.

export default function ProductCard({ product, onQuickAdd, compact = false }) {
  if (compact) return <MobileCard product={product} onQuickAdd={onQuickAdd} />;
  return <DesktopCard product={product} onQuickAdd={onQuickAdd} />;
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
  //   a flat translucent box and the glass effect is lost.
  return (
    <button
      type="button"
      aria-label={`Quick add ${product.name}`}
      onClick={(e) => {
        e.preventDefault();
        onQuickAdd?.(product);
      }}
      className="absolute grid place-items-center hover:bg-white/50"
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
  const fontSize = small ? 9 : 10;
  const padY = small ? 2 : 3;
  const padX = small ? 4 : 6;
  const gap = small ? 4 : 6;
  const offset = small ? 8 : 16;
  return (
    <div
      className="pointer-events-none absolute flex flex-wrap"
      style={{ top: offset, left: offset, gap, maxWidth: `calc(100% - ${offset * 2}px)` }}
      aria-hidden
    >
      {labels.map((lab) => {
        const tone = LABEL_TONES[lab] || { bg: "#11191f", fg: "#ffffff" };
        return (
          <span
            key={lab}
            className="font-display font-bold uppercase whitespace-nowrap"
            style={{
              backgroundColor: tone.bg,
              color: tone.fg,
              fontSize,
              letterSpacing: "0.5px",
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
      className="absolute pointer-events-none flex"
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

function MobileCard({ product, onQuickAdd }) {
  const hasDiscount = product.salePrice != null && product.salePrice < product.price;

  return (
    <article className="flex flex-col gap-2">
      <div className="relative w-full bg-[#f5f5f5] shadow-[0_0_10px_0_rgba(0,0,0,0.05)]">
        <Link
          href={`/products/${product.id}`}
          className="relative block w-full"
          style={{ aspectRatio: "176 / 264" }}
        >
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 176px"
            className="object-cover"
          />
        </Link>
        <LabelBadges labels={product.labels} small />
        {product.colors?.length > 0 && <Swatches colors={product.colors} small />}
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

  return (
    <article className="flex flex-col gap-4">
      <div className="relative w-full overflow-hidden bg-[#f5f5f5] shadow-[0_0_18.523px_0_rgba(0,0,0,0.05)]">
        <Link
          href={`/products/${product.id}`}
          className="relative block w-full"
          style={{ aspectRatio: "326 / 489" }}
        >
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="326px"
            className="object-cover"
          />
        </Link>
        <LabelBadges labels={product.labels} small={false} />
        {product.colors?.length > 0 && (
          <Swatches colors={product.colors} offset={16} />
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
        <div className="flex flex-col items-end gap-1">
          <p
            className="font-display text-[16px] font-semibold leading-6 whitespace-nowrap"
            style={{
              color: hasDiscount ? "rgba(17,25,31,0.5)" : "#11191f",
              textDecoration: hasDiscount ? "line-through" : "none",
            }}
          >
            {product.currency} {product.price}
          </p>
          {hasDiscount && (
            <span
              className="px-2 py-1 font-display text-[14px] font-semibold leading-4 text-white whitespace-nowrap"
              style={{ backgroundColor: "#0066B2" }}
            >
              {product.currency} {product.salePrice.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

// Inline SVGs — Figma asset URLs expire in 7 days; these approximate the icons.

function HeartIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" width={32} height={32} aria-hidden="true">
      <path
        d="M16.4959 23.048C16.2239 23.144 15.7759 23.144 15.5039 23.048C13.1839 22.256 7.99992 18.952 7.99992 13.352C7.99992 10.88 9.99192 8.87999 12.4479 8.87999C13.9039 8.87999 15.1919 9.58399 15.9999 10.672C16.8079 9.58399 18.1039 8.87999 19.5519 8.87999C22.0079 8.87999 23.9999 10.88 23.9999 13.352C23.9999 18.952 18.8159 22.256 16.4959 23.048Z"
        fill="#11191F"
        stroke="#11191F"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DropletIcon() {
  return (
    <svg viewBox="0 0 18 24" fill="none" width={18} height={24} aria-hidden="true">
      <path
        d="M9 2C9 2 2 11 2 15.5a7 7 0 0 0 14 0C16 11 9 2 9 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StretchIcon() {
  // Move Without Limits — vertical double-arrow (up/down stretchy). Figma
  // node 2119:2631, viewBox 12x24, filled #11191f.
  return (
    <svg viewBox="0 0 12 24" fill="currentColor" width={12} height={24} aria-hidden="true">
      <path d="M6.825 0.361C6.609 0.131 6.314 0 6 0C5.686 0 5.391 0.131 5.175 0.361L0.3 5.611C-0.005 5.939 -0.084 6.417 0.094 6.825C0.272 7.233 0.68 7.5 1.125 7.5H3.75V16.5H1.125C0.68 16.5 0.272 16.767 0.094 17.175C-0.084 17.583 -0.005 18.061 0.3 18.389L5.175 23.639C5.386 23.869 5.686 24 6 24C6.314 24 6.609 23.869 6.825 23.639L11.7 18.389C12.005 18.061 12.084 17.583 11.906 17.175C11.728 16.767 11.32 16.5 10.875 16.5H8.25V7.5H10.875C11.32 7.5 11.728 7.233 11.906 6.825C12.084 6.417 12.005 5.939 11.7 5.611L6.825 0.361Z" />
    </svg>
  );
}

function BodyIcon() {
  // Sculpted Support — 4 arrows pointing inward toward a center dot. Figma
  // node 2119:2647, viewBox 30x24. The original Figma export had invalid
  // bezier control points (NaN) so reconstructed cleanly with stroke + dot.
  return (
    <svg
      viewBox="0 0 30 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={30}
      height={24}
      aria-hidden="true"
    >
      <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
      <path d="M9 9V4.5 M9 9H4.5 M9 9L1.5 1.5" />
      <path d="M21 9V4.5 M21 9H25.5 M21 9L28.5 1.5" />
      <path d="M9 15V19.5 M9 15H4.5 M9 15L1.5 22.5" />
      <path d="M21 15V19.5 M21 15H25.5 M21 15L28.5 22.5" />
    </svg>
  );
}

function FeatherIcon() {
  // Lightweight Construction — feather. Figma node 2119:2714, 24x24 filled.
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={24} height={24} aria-hidden="true">
      <path d="M13.0547 10.1062L1.07812 22.0781C0.6375 22.5188 0.6375 23.2312 1.07812 23.6672C1.51875 24.1031 2.23125 24.1078 2.66719 23.6672L5.33906 20.9953H8.52656C10.8563 20.9953 13.1156 20.3203 15.0422 19.0734C15.5625 18.7359 15.3 17.9953 14.6766 17.9953C14.4375 17.9953 14.2453 17.8031 14.2453 17.5641C14.2453 17.3719 14.3719 17.2078 14.55 17.1516L18.3469 16.0125C18.4641 15.975 18.5719 15.9141 18.6609 15.825L19.7109 14.775C20.1844 14.3016 19.8469 13.4953 19.1812 13.4953H17.6719C17.4328 13.4953 17.2406 13.3031 17.2406 13.0641C17.2406 12.8719 17.3672 12.7078 17.5453 12.6516L22.7953 11.0766C22.9828 11.0203 23.1422 10.8937 23.2312 10.7156C23.7375 9.73125 24 8.62969 24 7.5C24 5.57812 23.2359 3.73594 21.8766 2.37656L21.6187 2.11875C20.2641 0.764063 18.4219 0 16.5 0C14.5781 0 12.7359 0.764062 11.3766 2.12344L6.51562 6.98438C4.26562 9.23438 3 12.2859 3 15.4688V18.0609L11.8875 9.17813C12.1781 8.8875 12.6562 8.8875 12.9469 9.17813C13.2 9.43125 13.2328 9.81562 13.05 10.1062H13.0547Z" />
    </svg>
  );
}

function WaistIcon() {
  // High-Waisted Design — shield (support / stays in place). Figma node
  // 2119:2724, 24x24 filled.
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={24} height={24} aria-hidden="true">
      <path d="M12 0C12.2156 0 12.4312 0.046875 12.6281 0.135937L21.4547 3.88125C22.4859 4.31719 23.2547 5.33438 23.25 6.5625C23.2266 11.2125 21.3141 19.7203 13.2375 23.5875C12.4547 23.9625 11.5453 23.9625 10.7625 23.5875C2.68594 19.7203 0.773437 11.2125 0.75 6.5625C0.745312 5.33438 1.51406 4.31719 2.54531 3.88125L11.3766 0.135937C11.5688 0.046875 11.7844 0 12 0V0M12 3.13125V20.85C18.4687 17.7188 20.2078 10.7859 20.25 6.62813L12 3.13125Z" />
    </svg>
  );
}

function LeafIcon() {
  // Sustainable Materials — leaf. Figma node 2119:2734, 24x24 filled.
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={24} height={24} aria-hidden="true">
      <path d="M12.75 4.5C9.06562 4.5 5.94844 6.91406 4.88906 10.2422C6.46406 9.44531 8.24063 9 10.125 9H14.25C14.6625 9 15 9.3375 15 9.75C15 10.1625 14.6625 10.5 14.25 10.5H13.5H10.125C9.34688 10.5 8.59219 10.5891 7.86562 10.7531C6.65156 11.0297 5.52188 11.5219 4.51875 12.1922C1.79531 14.0062 0 17.1047 0 20.625V21.375C0 21.9984 0.501562 22.5 1.125 22.5C1.74844 22.5 2.25 21.9984 2.25 21.375V20.625C2.25 18.3422 3.22031 16.2891 4.77187 14.85C5.7 18.3891 8.92031 21 12.75 21H12.7969C18.9891 20.9672 24 14.8641 24 7.34063C24 5.34375 23.6484 3.44531 23.0109 1.73438C22.8891 1.41094 22.4156 1.425 22.2516 1.72969C21.3703 3.37969 19.6266 4.5 17.625 4.5H12.75Z" />
    </svg>
  );
}

function PlusIcon({ color = "white" }) {
  return (
    <svg viewBox="0 0 12 12" width={12} height={12} fill="none" aria-hidden="true">
      <path d="M6 2v8M2 6h8" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg viewBox="0 0 12 12" width={12} height={12} fill="none" aria-hidden="true">
      <path d="M2 6h8" stroke="#11191f" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// ------------------------------------------------------------------
// Static data — plain objects only (no JSX), icons rendered inline.

const COLORWAYS = [
  { hex: "#11191f", name: "Midnight Black", desc: "Timeless. Versatile. Essential." },
  { hex: "#9d8085", name: "Dusty Pink", desc: "Bold. Modern. Dynamic." },
  { hex: "#a8c0b2", name: "Fresh Green", desc: "Sleek. Sophisticated. Powerful." },
  { hex: "#566486", name: "Iris Blue", desc: "Pure. Clean. Confident." },
];

// Component references (not JSX elements) so React Compiler can analyse the
// module without encountering JSX outside a component or hook body.
const DETAIL_ITEMS = [
  {
    Icon: FeatherIcon,
    title: "Lightweight Construction",
    desc: "Barely-there feel at just 180g. Engineered to disappear on your body.",
  },
  {
    Icon: WaistIcon,
    title: "High-Waisted Design",
    desc: "Stays in place. No rolling. No slipping. Just pure focus.",
  },
  {
    Icon: LeafIcon,
    title: "Sustainable Materials",
    desc: "Made with 78% recycled polyester. Performance meets responsibility.",
  },
];

// ------------------------------------------------------------------

export default function ProductPageClient({ product }) {
  const [activeImage, setActiveImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const [qty, setQty] = useState(1);
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartX = useRef(null);
  const trackWidthRef = useRef(0);

  // Swipe threshold: 15% of carousel width OR 50px, whichever is smaller.
  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
    trackWidthRef.current = e.currentTarget.offsetWidth;
  }
  function onTouchMove(e) {
    if (touchStartX.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    // Resist over-scroll at the edges so the user feels the boundary.
    const atStart = activeImage === 0 && dx > 0;
    const atEnd = activeImage === product.images.length - 1 && dx < 0;
    setDragOffset(atStart || atEnd ? dx / 3 : dx);
  }
  function onTouchEnd() {
    if (touchStartX.current === null) return;
    const w = trackWidthRef.current || 1;
    const threshold = Math.min(50, w * 0.15);
    if (dragOffset <= -threshold && activeImage < product.images.length - 1) {
      setActiveImage((i) => i + 1);
    } else if (dragOffset >= threshold && activeImage > 0) {
      setActiveImage((i) => i - 1);
    }
    setDragOffset(0);
    touchStartX.current = null;
  }

  const trackWidth = trackWidthRef.current || 1;
  const dragPct = (dragOffset / trackWidth) * 100;

  return (
    <div className="flex flex-col bg-white">

      {/* ── Mobile: image carousel ─────────────────────────────────── */}
      <section className="md:hidden px-4 pt-4">
        <div
          className="relative w-full overflow-hidden shadow-[0_0_10px_0_rgba(0,0,0,0.05)] touch-pan-y select-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
        >
          <div
            className={`flex ${dragOffset === 0 ? "transition-transform duration-300" : ""}`}
            style={{
              transform: `translateX(calc(-${activeImage * 100}% + ${dragPct}%))`,
            }}
          >
            {product.images.map((src, i) => (
              <div
                key={i}
                className="relative shrink-0 w-full"
                style={{ aspectRatio: "361 / 541" }}
              >
                <Image
                  src={src}
                  alt={`${product.name} — view ${i + 1}`}
                  fill
                  sizes="(max-width: 768px) calc(100vw - 32px), 50vw"
                  className="object-cover pointer-events-none"
                  priority={i === 0}
                  draggable={false}
                />
              </div>
            ))}
          </div>

          {/* Dots — overlay image bottom-left, per Figma */}
          <div className="absolute left-3 bottom-3 flex items-center gap-1">
            {product.images.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`View image ${i + 1}`}
                onClick={() => setActiveImage(i)}
                className="rounded-[8px] transition-all duration-200 cursor-pointer"
                style={{
                  width: i === activeImage ? 24 : 6,
                  height: 6,
                  backgroundColor: i === activeImage ? "#11191f" : "#a1a1aa",
                }}
              />
            ))}
          </div>

          {/* Wishlist button — overlay image bottom-right, per Figma */}
          <button
            type="button"
            aria-label="Add to wishlist"
            className="absolute bottom-3 right-3 grid place-items-center text-[#11191f] rounded-[2.667px]"
            style={{
              width: 32,
              height: 32,
              backgroundColor: "rgba(255,255,255,0.3)",
              backdropFilter: "blur(2px)",
              WebkitBackdropFilter: "blur(2px)",
              outline: "0.4px solid rgba(255,255,255,0.7)",
              outlineOffset: "-0.4px",
            }}
          >
            <HeartIcon />
          </button>
        </div>
      </section>

      {/* ── Desktop: hero (thumbnails + main image + product info column) ── */}
      {/* Figma 2119:2515 — implemented per the snippet the designer provided:
            outer  : w-[1376px] px-24 flex items-center gap-8
            left   : flex items-center gap-4  → vertical thumb strip (w-24 h-40
                     rounded-lg) + main image (w-[508px] h-[761px] rounded-lg
                     bg-neutral-100)
            right  : w-[545.33px] flex flex-col gap-8
                     ├─ block 1 gap-6 → name+price row, colors, sizes, CTAs
                     └─ block 2 gap-4 → "Description" heading + paragraph
          Responsive: outer is w-full + max-w-[1376px] + self-center so it
          fits any viewport up to 1376 and centers above. Within the right
          column the *info* block is wrapped in a sticky pos so it pins to
          the top while the description scrolls past — Figma is a static
          mock; this is a UX enhancement on top. */}
      <section className="hidden md:flex md:w-full md:max-w-[1376px] md:items-center md:gap-4 md:self-center md:px-8 md:pt-12 md:pb-24 lg:gap-8 lg:px-12 xl:px-24">
        {/* Left — thumb strip + main image */}
        <div className="flex min-w-0 flex-1 items-center gap-4">
          {/* Thumbnail strip — hidden below lg; w-24 h-40 each, gap-4, rounded-lg. */}
          <div className="hidden flex-col gap-4 lg:flex">
            {product.images.map((src, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveImage(i)}
                aria-label={`View image ${i + 1}`}
                className="relative h-40 w-24 cursor-pointer overflow-hidden rounded-lg bg-neutral-100 transition-opacity"
                style={{
                  opacity: i === activeImage ? 1 : 0.6,
                  outline:
                    i === activeImage ? "2px solid #11191f" : "1px solid rgba(17,25,31,0.1)",
                  outlineOffset: "-1px",
                }}
              >
                <Image src={src} alt="" fill sizes="96px" className="object-cover" />
              </button>
            ))}
          </div>

          {/* Main image — Figma lg+: w-[508px] h-[761px], driven by the thumb
              strip. Below lg the thumb strip is hidden, so render a swipeable
              track + dots overlay (same UX as the mobile carousel) so the user
              can navigate between images on touch tablets. Width is flex-driven
              (capped at 508px) so it scales down with the viewport between md
              and the Figma design width without overflowing. */}
          <div
            className="relative min-w-0 flex-1 select-none overflow-hidden rounded-lg bg-neutral-100 touch-pan-y lg:max-w-[508px]"
            style={{ aspectRatio: "508 / 761" }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onTouchCancel={onTouchEnd}
          >
            <div
              className={`flex h-full w-full ${dragOffset === 0 ? "transition-transform duration-300" : ""}`}
              style={{
                transform: `translateX(calc(-${activeImage * 100}% + ${dragPct}%))`,
              }}
            >
              {product.images.map((src, i) => (
                <div key={i} className="relative h-full w-full shrink-0">
                  <Image
                    src={src}
                    alt={`${product.name} — view ${i + 1}`}
                    fill
                    sizes="(min-width: 1024px) 508px, 50vw"
                    className="object-cover pointer-events-none"
                    priority={i === 0}
                    draggable={false}
                  />
                </div>
              ))}
            </div>

            {/* Dots — visible only below lg where the thumb strip is hidden. */}
            <div className="absolute left-3 bottom-3 flex items-center gap-1 lg:hidden">
              {product.images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`View image ${i + 1}`}
                  onClick={() => setActiveImage(i)}
                  className="rounded-[8px] transition-all duration-200 cursor-pointer"
                  style={{
                    width: i === activeImage ? 24 : 6,
                    height: 6,
                    backgroundColor: i === activeImage ? "#11191f" : "#a1a1aa",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right — Figma lg+: w-[545.33px]. Width is flex-driven (capped at
            545.33px) so the info column shares the row evenly with the image
            and scales down with the viewport between md and the Figma design
            width without overflowing. */}
        <div className="flex min-w-0 flex-1 flex-col items-start gap-8 self-stretch lg:max-w-[545.33px]">
          {/* Block 1: info — scrolls naturally with the rest of the right
              column so the description flows with the page content. */}
          <div className="flex w-full flex-col items-start gap-6">
            {!product.outOfStock &&
              product.itemsLeft > 0 &&
              product.itemsLeft <= (product.lowStockLimit ?? 5) && (
                <LowStockBanner itemsLeft={product.itemsLeft} />
              )}

            {/* Name + subtitle  ▸  strikethrough price + sale chip */}
            <div className="flex w-full items-start justify-between">
              <div className="flex flex-col items-start gap-1">
                <h1 className="font-display text-[24px] font-bold leading-9 text-[#11191f]">
                  {product.name}
                </h1>
                <p className="font-display text-[12px] leading-4 text-[#6b7280]">
                  {product.subtitle}
                </p>
              </div>
              <DesktopPriceBlock
                currency={product.currency}
                price={product.price}
                salePrice={product.salePrice}
              />
            </div>

            {/* Colors */}
            <div className="flex w-full flex-col items-start gap-3">
              <p className="font-display text-[12px] font-bold uppercase leading-4 tracking-wide text-[#6b7280]">
                Colors
              </p>
              <div className="flex w-full items-start gap-3">
                {product.colors.map((c, i) => (
                  <button
                    key={c.name}
                    type="button"
                    aria-label={c.name}
                    onClick={() => setSelectedColor(i)}
                    className="size-8 shrink-0 cursor-pointer rounded-[2px]"
                    style={{
                      backgroundColor: c.hex,
                      // Figma selected state: black outer ring + white inner ring (double ring).
                      boxShadow:
                        i === selectedColor
                          ? "0 0 0 2px #ffffff inset, 0 0 0 4px #11191f"
                          : "none",
                      border: i === selectedColor ? "none" : "1px solid #d1d5db",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Sizes — Figma: flex-1 h-10 px-8 outline; selected = bg-gray-900 white text */}
            <div className="flex w-full flex-col items-start gap-3">
              <p className="font-display text-[12px] font-bold uppercase leading-4 tracking-wide text-[#6b7280]">
                Size
              </p>
              <div className="flex w-full items-start gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedSize(s)}
                    className="flex h-10 flex-1 cursor-pointer flex-col items-center justify-center px-2 transition-colors"
                    style={{
                      backgroundColor: selectedSize === s ? "#11191f" : "transparent",
                      outline: "1px solid #11191f",
                      outlineOffset: "-1px",
                      color: selectedSize === s ? "#ffffff" : "#11191f",
                    }}
                  >
                    <span className="font-display text-[14px] font-bold leading-5">{s}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* CTAs — qty stepper (w-32 h-12) + Buy Now (flex-1 h-12 bg-gray-900) and Add to Cart (full h-12 outline) */}
            <div className="flex w-full flex-col items-start gap-3 pt-2">
              <div className="flex w-full items-start gap-3">
                <div
                  className={`flex h-12 w-32 items-center justify-between px-3 ${product.outOfStock ? "opacity-50" : ""}`}
                  style={{ outline: "1px solid #11191f", outlineOffset: "-1px" }}
                >
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    disabled={product.outOfStock}
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className={`flex w-8 self-stretch items-center justify-center ${product.outOfStock ? "cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <MinusIcon />
                  </button>
                  <span className="font-display text-[14px] font-bold leading-5 text-[#11191f]">
                    {qty}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    disabled={product.outOfStock}
                    onClick={() => setQty((q) => q + 1)}
                    className={`flex w-8 self-stretch items-center justify-center ${product.outOfStock ? "cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <PlusIcon color="#11191f" />
                  </button>
                </div>
                <button
                  type="button"
                  disabled={product.outOfStock}
                  aria-disabled={product.outOfStock || undefined}
                  className={`flex h-12 flex-1 flex-col items-center justify-center bg-[#11191f] py-3.5 ${product.outOfStock ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <span className="font-display text-[14px] font-bold uppercase leading-5 tracking-wide text-white">
                    {product.outOfStock ? "Out of Stock" : "Buy Now"}
                  </span>
                </button>
              </div>
              <button
                type="button"
                className="flex h-12 w-full cursor-pointer flex-col items-center justify-center py-3"
                style={{ outline: "1px solid #11191f", outlineOffset: "-1px" }}
              >
                <span className="font-display text-[14px] font-bold uppercase leading-5 tracking-wide text-[#11191f]">
                  {product.outOfStock ? "Notify When Available" : "Add to Cart"}
                </span>
              </button>
            </div>
          </div>

          {/* Block 2: Description */}
          <div className="flex w-full flex-col items-start gap-4">
            <h2 className="font-display text-[18px] font-bold text-[#11191f]">
              Description
            </h2>
            <p className="w-full font-display text-[12px] leading-4 text-[#6b7280]">
              Experience the pinnacle of athletic performance with our {product.name}. These leggings offer a superior blend of support and flexibility, empowering you to conquer any workout. The high-performance fabric gently hugs your body, providing targeted compression to enhance your natural shape and reduce muscle fatigue. Whether you&apos;re crushing a high-intensity interval training session, flowing through a yoga class, or running errands, these leggings will keep you comfortable and confident. The wide, high-rise waistband stays securely in place, offering a flattering silhouette and preventing distractions. With their exceptional breathability and moisture-wicking properties, these leggings keep you cool and dry, even during the most intense workouts. Available in a range of vibrant colors, our {product.name} are the perfect fusion of style and performance.
            </p>
          </div>
        </div>
      </section>

      {/* ── Mobile: product info ────────────────────────────────────── */}
      <div className="flex flex-col gap-8 px-4 pt-4 pb-10 md:hidden">
        {!product.outOfStock &&
          product.itemsLeft > 0 &&
          product.itemsLeft <= (product.lowStockLimit ?? 5) && (
            <LowStockBanner itemsLeft={product.itemsLeft} />
          )}
        {/* Name / price */}
        <div className="flex items-start justify-between px-2">
          <div className="flex flex-col gap-0.5">
            <h1
              className="font-body text-[16px] font-medium leading-normal text-[#11191f]"
              style={{ fontStretch: "75%" }}
            >
              {product.name}
            </h1>
            <div className="flex items-center gap-1">
              <span
                className="font-body text-[12px] leading-normal text-[rgba(17,25,31,0.5)]"
                style={{ fontStretch: "75%" }}
              >
                80% nylon
              </span>
              <span className="size-1 rounded-full bg-[rgba(17,25,31,0.5)]" />
              <span
                className="font-body text-[12px] leading-normal text-[rgba(17,25,31,0.5)]"
                style={{ fontStretch: "75%" }}
              >
                20% spandex
              </span>
            </div>
          </div>
          <PriceBlock
            currency={product.currency}
            price={product.price}
            salePrice={product.salePrice}
            plainSize="md"
          />
        </div>

        {/* Colors + Sizes */}
        <div className="flex flex-col gap-4 px-2">
          <div className="flex flex-col gap-2">
            <p
              className="font-body text-[12px] leading-normal text-[rgba(17,25,31,0.8)]"
              style={{ fontStretch: "75%" }}
            >
              COLORS
            </p>
            <div className="flex gap-2">
              {product.colors.map((c, i) => (
                <button
                  key={c.name}
                  type="button"
                  aria-label={c.name}
                  onClick={() => setSelectedColor(i)}
                  className="size-6 rounded-[2px] shrink-0 cursor-pointer"
                  style={{
                    backgroundColor: c.hex,
                    border:
                      i === selectedColor
                        ? "2px solid #11191f"
                        : "1px solid rgba(17,25,31,0.1)",
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p
              className="font-body text-[12px] leading-normal text-[rgba(17,25,31,0.8)]"
              style={{ fontStretch: "75%" }}
            >
              SIZE
            </p>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedSize(s)}
                  className="grid size-6 place-items-center rounded-[2px] border cursor-pointer transition-colors"
                  style={{
                    backgroundColor: selectedSize === s ? "#11191f" : "#ffffff",
                    borderColor: "#11191f",
                    color: selectedSize === s ? "#ffffff" : "#11191f",
                  }}
                >
                  <span
                    className="font-body text-[12px] font-medium leading-none"
                    style={{ fontStretch: "75%" }}
                  >
                    {s}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <CtaRow qty={qty} setQty={setQty} outOfStock={product.outOfStock} />
      </div>

      {/* ── Crafted to Last ─────────────────────────────────────────── */}
      {/* Figma 2119:2589 — black section, 1440x532 desktop. Typography +
          padding scale across md → lg → xl so the section reads at the
          right size for every viewport between the mobile breakpoint and
          the Figma design width. Stats are a grid-cols-3 at md+ so the
          three columns stay equal regardless of label length. */}
      <section className="flex flex-col items-center justify-center gap-6 bg-[#11191f] px-4 py-16 md:gap-10 md:px-8 md:py-20 lg:gap-12 lg:py-24 xl:gap-16 xl:py-32">
        <div className="flex flex-col items-center gap-2 text-center md:gap-3 lg:gap-4">
          <h2 className="font-display text-[24px] font-bold leading-8 text-white md:text-[34px] md:leading-[40px] lg:text-[40px] lg:leading-[48px] xl:text-[48px] xl:leading-[48px]">
            Crafted to Last
          </h2>
          <p
            className="font-body text-[14px] leading-normal text-[#9ca3af] md:max-w-[420px] md:text-[14px] md:leading-5 lg:max-w-[480px] lg:text-[15px] lg:leading-6 xl:max-w-[520px] xl:text-[16px]"
            style={{ fontStretch: "75%" }}
          >
            Premium materials. Precision engineering. Built for thousands of workouts.
          </p>
        </div>
        <div className="flex w-full flex-col gap-6 md:mx-auto md:max-w-[1120px] md:grid md:grid-cols-3 md:gap-6 lg:gap-10 xl:gap-12">
          {[
            { value: "78%", label: "Recycled Polyester" },
            { value: "22%", label: "Premium Elastane" },
            { value: "100%", label: "Performance Guaranteed" },
          ].map(({ value, label }) => (
            <div key={value} className="flex min-w-0 flex-col items-center gap-2">
              <span className="font-display text-[36px] font-bold leading-[40px] text-white md:text-[44px] md:leading-[48px] lg:text-[56px] lg:leading-[60px] xl:text-[72px] xl:leading-[72px]">
                {value}
              </span>
              <span
                className="font-body text-[12px] uppercase leading-4 tracking-wider text-[#9ca3af] md:text-[13px] md:leading-[18px] lg:text-[14px] lg:leading-5"
                style={{ fontStretch: "75%" }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Stays Dry. Stays Fresh. ─────────────────────────────────── */}
      {/* Figma 2119:2611 — desktop: image LEFT 720x700, dark text RIGHT 720x700.
          Mobile: image full-width then dark text below. */}
      <section className="flex flex-col md:flex-row md:h-[700px]">
        <div className="relative h-full w-full md:h-full md:w-1/2">
          <Image
            src="/shop/model-2.png"
            alt=""
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
        <div className="flex flex-col items-center justify-center gap-4 bg-white px-4 py-16 md:w-1/2 md:px-16 md:py-24">
          <div className="grid size-16 shrink-0 place-items-center rounded-full bg-[#11191f] text-white">
            <DropletIcon />
          </div>
          <div className="flex flex-col items-center gap-2 text-center md:gap-6">
            <h2 className="font-display text-[24px] font-bold leading-normal text-[#11191f] md:text-[40px] md:leading-[48px]">
              Stays Dry.
              <br />
              Stays Fresh.
            </h2>
            <p
              className="font-body text-[14px] leading-6 text-[#9ca3af] md:max-w-[520px] md:text-[16px] md:leading-6"
              style={{ fontStretch: "75%" }}
            >
              Advanced moisture-wicking technology pulls sweat away from your skin, keeping you dry through the most intense workouts.
            </p>
          </div>
        </div>
      </section>

      {/* ── Move Without Limits ─────────────────────────────────────── */}
      {/* Figma 2119:2625 — desktop: dark text LEFT 720x700, image RIGHT 720x700.
          Mobile: image full-width, dark text below (matches reading flow). */}
      <section className="flex flex-col md:h-[700px] md:flex-row-reverse">
        <div className="relative h-[551px] w-full md:h-full md:w-1/2">
          <Image
            src="/shop/model-3.png"
            alt=""
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
        <div className="flex flex-col items-center justify-center gap-4 bg-[#11191f] px-4 pt-16 pb-[88px] md:w-1/2 md:px-16 md:py-0">
          <div className="grid size-16 shrink-0 place-items-center rounded-full bg-white text-[#11191f]">
            <StretchIcon />
          </div>
          <div className="flex flex-col items-center gap-2 text-center md:gap-6">
            <h2 className="font-display text-[24px] font-bold leading-8 text-white md:text-[40px] md:leading-[48px]">
              Move Without Limits
            </h2>
            <p
              className="font-body text-[14px] leading-normal text-[#9ca3af] md:max-w-[520px] md:text-[16px] md:leading-6"
              style={{ fontStretch: "75%" }}
            >
              Four-way stretch fabric moves with you in every direction. From yoga flows to explosive sprints.
            </p>
          </div>
        </div>
      </section>

      {/* ── Sculpted Support ────────────────────────────────────────── */}
      {/* Figma 2119:2639 — desktop: image LEFT 720x700, dark text RIGHT 720x700. */}
      <section className="flex flex-col md:flex-row md:h-[700px]">
        <div className="relative h-[551px] w-full md:h-full md:w-1/2">
          <Image
            src="/shop/model-4.png"
            alt=""
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
        <div className="flex flex-col items-center justify-center gap-4 bg-[#11191f] px-4 py-16 md:w-1/2 md:px-16 md:py-0">
          <div className="grid size-16 shrink-0 place-items-center rounded-full bg-white text-[#11191f]">
            <BodyIcon />
          </div>
          <div className="flex flex-col items-center gap-2 text-center md:gap-6">
            <h2 className="font-display text-[24px] font-bold leading-8 text-white md:text-[40px] md:leading-[48px]">
              Sculpted Support
            </h2>
            <p
              className="font-body text-[14px] leading-normal text-[#9ca3af] md:max-w-[520px] md:text-[16px] md:leading-6"
              style={{ fontStretch: "75%" }}
            >
              Compression fit that supports your muscles and enhances your natural shape. Feel confident, perform better.
            </p>
          </div>
        </div>
      </section>

      {/* ── Four Colorways. One Vision. ─────────────────────────────── */}
      {/* Figma 2119:2653 — desktop: two-column 1376 wide. LEFT = color list
          (4 rows, each 424x176 with 112-square swatch + heading/desc).
          RIGHT = 2x2 lifestyle grid (296x371 each, 16px gap).
          Mobile: stacked list + horizontal-scroll lifestyle row. */}
      <section className="flex flex-col gap-4 bg-[#fafafa] px-4 py-12 md:gap-12 md:px-8 md:py-24">
        <div className="flex flex-col items-center text-center md:gap-1">
          <h2 className="font-display text-[20px] font-bold leading-7 text-[#11191f] md:text-[36px] md:leading-[44px]">
            Four Colorways.
          </h2>
          <h2 className="font-display text-[20px] font-bold leading-7 text-[#6b7280] md:text-[36px] md:leading-[44px]">
            One Vision.
          </h2>
        </div>
        <div className="grid w-full gap-8 md:mx-auto md:max-w-[1280px] md:grid-cols-2 md:gap-16">
          {/* Color list */}
          <div className="flex flex-col gap-4 md:gap-0">
            {COLORWAYS.map((cw) => (
              <div key={cw.name} className="flex items-center gap-4 md:gap-6 md:py-6">
                <div
                  className="size-24 shrink-0 rounded-[8px] md:size-28"
                  style={{ backgroundColor: cw.hex }}
                />
                <div className="flex flex-col gap-1 md:gap-2">
                  <span className="font-display text-[14px] font-bold leading-5 text-[#11191f] md:text-[20px] md:leading-7">
                    {cw.name}
                  </span>
                  <span
                    className="font-body text-[12px] leading-4 text-[#6b7280] md:text-[14px] md:leading-5"
                    style={{ fontStretch: "75%" }}
                  >
                    {cw.desc}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Lifestyle 2x2 grid — desktop only (mobile has horizontal scroll below). */}
          <div className="hidden gap-4 md:grid md:grid-cols-2">
            {[
              "/shop/model-1.png",
              "/shop/model-2.png",
              "/shop/model-3.png",
              "/shop/model-4.png",
            ].map((src, i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-[8px] bg-[#e5e5e5]"
                style={{ aspectRatio: "296 / 371" }}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 25vw, 100vw"
                  className="object-cover"
                  draggable={false}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Gallery Carousel (mobile only) ──────────────────────────── */}
      {/* Figma node 35:2449 — 3 lifestyle cards 280x350, rounded-lg, 12px gap, first card 16px from edge.
          Hidden on desktop because the 2x2 lifestyle grid above takes over. */}
      <section
        className="no-scrollbar overflow-x-auto pl-4 mb-12 md:hidden"
        style={{ height: 350 }}
      >
        <div className="flex h-full gap-3 pr-4">
          {["/shop/model-1.png", "/shop/model-3.png", "/shop/model-4.png"].map((src, i) => (
            <div
              key={i}
              className="relative h-full shrink-0 overflow-hidden rounded-[8px] bg-[#e5e5e5]"
              style={{ width: 280 }}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="280px"
                className="object-cover"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── The Details ─────────────────────────────────────────────── */}
      {/* Figma 2119:2706 — desktop: centered 704-wide column, 3 detail rows
          stacked vertically. 64x64 icon tile (rgba white 0.1) + 28px heading
          + 23px description. Mobile keeps the compact 14px / 12px scale. */}
      <section className="flex flex-col gap-8 bg-[#11191f] px-4 py-16 md:gap-12 md:py-24">
        <h2 className="font-display text-[24px] font-bold leading-8 text-white text-center md:text-[36px] md:leading-[44px]">
          The Details
        </h2>
        <div className="flex flex-col gap-8 md:mx-auto md:w-full md:max-w-[704px] md:gap-12">
          {DETAIL_ITEMS.map(({ Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4 md:gap-6">
              <div
                className="grid size-12 shrink-0 place-items-center rounded-2xl text-white md:size-16"
                style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
              >
                <Icon />
              </div>
              <div className="flex flex-col md:gap-2" style={{ gap: "3.25px" }}>
                <span className="font-display text-[14px] font-bold leading-5 text-white md:text-[20px] md:leading-7">
                  {title}
                </span>
                <span
                  className="font-body text-[12px] leading-5 text-[#9ca3af] md:text-[16px] md:leading-6"
                  style={{ fontStretch: "75%" }}
                >
                  {desc}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Complete Your Set ───────────────────────────────────────── */}
      {/* Figma 2119:2741 — desktop: 1376-wide section, title 36px + subtitle
          24px centered, then row of larger product cards (326x489 image +
          label row). Mobile keeps the horizontal-scroll 176-wide cards. */}
      <section className="flex flex-col gap-4 px-4 py-8 md:gap-12 md:px-8 md:py-24">
        <div className="flex flex-col items-center gap-2 text-center md:gap-3">
          <h2 className="font-display text-[20px] font-bold leading-7 text-[#11191f] md:text-[36px] md:leading-[44px]">
            Complete Your Set
          </h2>
          <p
            className="font-body text-[14px] leading-5 text-[#6b7280] md:text-[16px] md:leading-6"
            style={{ fontStretch: "75%" }}
          >
            Curated pieces designed to work together
          </p>
        </div>

        {/* Mobile: horizontal scroll */}
        <div className="no-scrollbar overflow-x-auto md:hidden">
          <div className="flex gap-2">
            {product.relatedProducts.map((rp) => (
              <article
                key={rp.id}
                className="flex shrink-0 flex-col gap-2"
                style={{ width: 176 }}
              >
                <div
                  className="relative w-full bg-[#f5f5f5] shadow-[0_0_10px_0_rgba(0,0,0,0.05)]"
                  style={{ aspectRatio: "176 / 264" }}
                >
                  <Link
                    href={`/products/${rp.id}`}
                    className="absolute inset-0"
                    aria-label={rp.name}
                  >
                    <Image
                      src={rp.image}
                      alt={rp.name}
                      fill
                      sizes="176px"
                      className="object-cover"
                    />
                  </Link>

                  {rp.colors?.length > 0 && (
                    <div
                      className="absolute flex pointer-events-none"
                      style={{ left: 8, bottom: 8, gap: 2 }}
                      aria-hidden="true"
                    >
                      {rp.colors.slice(0, 4).map((hex, ci) => (
                        <span
                          key={ci}
                          className="rounded-[2px]"
                          style={{
                            width: 8,
                            height: 8,
                            backgroundColor: hex,
                            border: "0.3px solid rgba(17,25,31,0.1)",
                          }}
                        />
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    aria-label={`Quick add ${rp.name}`}
                    className="absolute grid place-items-center rounded-[2px] cursor-pointer hover:bg-white/50"
                    style={{
                      right: 8,
                      bottom: 8,
                      width: 24,
                      height: 24,
                      backgroundColor: "rgba(255,255,255,0.3)",
                      backdropFilter: "blur(1.5px)",
                      WebkitBackdropFilter: "blur(1.5px)",
                      outline: "0.3px solid rgba(255,255,255,0.7)",
                      outlineOffset: "-0.3px",
                    }}
                  >
                    <PlusIcon />
                  </button>
                </div>

                <div className="flex items-start justify-between px-1">
                  <div className="flex flex-col gap-0.5" style={{ width: 87 }}>
                    <span
                      className="font-body truncate text-[12px] font-medium leading-[14px] text-[#11191f]"
                      style={{ fontStretch: "75%" }}
                    >
                      {rp.name}
                    </span>
                    <span
                      className="font-body truncate text-[10px] leading-3 text-[rgba(17,25,31,0.5)]"
                      style={{ fontStretch: "75%" }}
                    >
                      {rp.subtitle}
                    </span>
                  </div>
                  <PriceBlock
                    currency={rp.currency}
                    price={rp.price}
                    salePrice={rp.salePrice}
                    plainSize="sm"
                  />
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Desktop: 4-col grid per Figma at lg+ (4 related cards across 1376px).
            Below lg, drop to 2 columns so 326px cards aren't squeezed. */}
        <div className="mx-auto hidden w-full max-w-[1376px] md:grid md:grid-cols-2 md:gap-6 lg:grid-cols-4">
          {product.relatedProducts.map((rp) => (
            <article key={rp.id} className="flex flex-col gap-4">
              <div
                className="relative w-full overflow-hidden bg-[#f5f5f5] shadow-[0_0_18.523px_0_rgba(0,0,0,0.05)]"
                style={{ aspectRatio: "326 / 489" }}
              >
                <Link
                  href={`/products/${rp.id}`}
                  className="absolute inset-0"
                  aria-label={rp.name}
                >
                  <Image
                    src={rp.image}
                    alt={rp.name}
                    fill
                    sizes="(min-width: 768px) 326px, 100vw"
                    className="object-cover"
                  />
                </Link>

                {rp.colors?.length > 0 && (
                  <div
                    className="pointer-events-none absolute flex"
                    style={{ left: 16, bottom: 16, gap: 8 }}
                    aria-hidden="true"
                  >
                    {rp.colors.slice(0, 3).map((hex, ci) => (
                      <span
                        key={ci}
                        className="rounded-[2px] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]"
                        style={{
                          width: 12,
                          height: 12,
                          backgroundColor: hex,
                          border: "1px solid rgba(17,25,31,0.1)",
                        }}
                      />
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  aria-label={`Quick add ${rp.name}`}
                  className="absolute grid cursor-pointer place-items-center hover:bg-white/50"
                  style={{
                    right: 16,
                    bottom: 16,
                    width: 40,
                    height: 40,
                    backgroundColor: "rgba(255,255,255,0.3)",
                    borderRadius: 2,
                    outline: "0.3px solid rgba(255,255,255,0.7)",
                    outlineOffset: "-0.3px",
                    backdropFilter: "blur(1.5px)",
                    WebkitBackdropFilter: "blur(1.5px)",
                  }}
                >
                  <PlusIcon />
                </button>
              </div>

              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <h3 className="font-display text-[16px] font-medium leading-6 text-[#11191f]">
                    {rp.name}
                  </h3>
                  <p
                    className="font-body text-[16px] leading-5 text-[#78716c]"
                    style={{ fontStretch: "75%" }}
                  >
                    {rp.subtitle}
                  </p>
                </div>
                <PriceBlock
                  currency={rp.currency}
                  price={rp.price}
                  salePrice={rp.salePrice}
                  plainSize="md"
                />
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

// Price with optional discount badge — Figma node 25:996.
// Figma spec (applied as-is, no scaling):
//   strikethrough: Zalando Sans Condensed Regular, 16px, rgba(17,25,31,0.5)
//   chip: Zalando Sans Condensed Medium, 16px, white on #0066B2,
//         px:4 py:2, gap-8 from strikethrough
// `plainSize` only affects the no-discount fallback — when no salePrice is
// present, fall back to the surrounding context's font size (lg = 24px
// desktop header, md = 20px mobile header, sm = 12px related card).
function PriceBlock({ currency, price, salePrice, plainSize = "md" }) {
  const hasDiscount = salePrice != null && salePrice < price;

  if (!hasDiscount) {
    const plain =
      plainSize === "lg"
        ? "text-[24px] leading-normal"
        : plainSize === "sm"
          ? "text-[12px] leading-[14px]"
          : "text-xl leading-normal";
    return (
      <p
        className={`font-body ${plain} font-semibold text-[#11191f] whitespace-nowrap`}
        style={{ fontStretch: "75%" }}
      >
        {currency} {price}
      </p>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className="font-body text-[16px] font-normal leading-normal text-[rgba(17,25,31,0.5)] whitespace-nowrap line-through"
        style={{ fontStretch: "75%" }}
      >
        {currency} {price}
      </span>
      <span
        className="font-body text-[16px] font-medium leading-normal text-white whitespace-nowrap"
        style={{
          fontStretch: "75%",
          backgroundColor: "#1e40af",
          paddingLeft: 4,
          paddingRight: 4,
          paddingTop: 2,
          paddingBottom: 2,
        }}
      >
        {currency} {salePrice.toFixed(2)}
      </span>
    </div>
  );
}

// Desktop hero price — Figma 2119:2536. Stacked vertical: 14px strikethrough
// gray-400 above, 14px white-on-#0066B2 chip below (px-2 py-1 rounded-[2px]).
// When there is no salePrice, render a single 16px JOD label in #11191f.
function DesktopPriceBlock({ currency, price, salePrice }) {
  const hasDiscount = salePrice != null && salePrice < price;
  if (!hasDiscount) {
    return (
      <p className="font-display text-[16px] font-bold leading-5 text-[#11191f] whitespace-nowrap">
        {currency} {price}
      </p>
    );
  }
  return (
    <div className="flex flex-col items-end gap-1.5">
      <span className="font-display text-[14px] font-normal leading-4 text-[#9ca3af] whitespace-nowrap line-through">
        {currency} {price}
      </span>
      <span
        className="font-display text-[14px] font-bold leading-4 text-white whitespace-nowrap"
        style={{
          backgroundColor: "#1e40af",
          paddingLeft: 8,
          paddingRight: 8,
          paddingTop: 4,
          paddingBottom: 4,
          borderRadius: 2,
        }}
      >
        {currency} {salePrice.toFixed(2)}
      </span>
    </div>
  );
}

// Low-stock warning banner — Figma node 79:5969.
//   bg #ffd599, 1px solid #ba6d00 border, 4px radius, no shadow,
//   p-12 / gap-12, vuesax/linear/danger icon at 20x20,
//   10px Zalando Expanded Bold heading + 10px Medium subtitle.
// Render when the selected variant has 0 < quantity <= low_stock_threshold.
// Shape is mock-only for now; once the page calls myAppGetProductDetail,
// derive `itemsLeft` from the matching variant's `quantity` field (catalog.ts
// returns `quantity` + `low_stock_threshold` per variant).
function LowStockBanner({ itemsLeft }) {
  return (
    <div
      className="flex w-full items-center gap-3 rounded-[4px] border border-solid p-3"
      style={{ backgroundColor: "#ffd599", borderColor: "#ba6d00" }}
      role="status"
    >
      <DangerIcon />
      <div className="flex flex-col gap-0.5">
        <span className="font-display text-[10px] font-bold leading-normal text-[#11191f] whitespace-nowrap">
          {itemsLeft} {itemsLeft === 1 ? "ITEM" : "ITEMS"} LEFT IN STOCK
        </span>
        <span className="font-display text-[10px] font-medium leading-normal text-[rgba(17,25,31,0.5)] whitespace-nowrap">
          You can only order up to the amount in stock
        </span>
      </div>
    </div>
  );
}

// vuesax/linear/danger — rounded warning triangle with exclamation mark.
function DangerIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M12.0001 21.41H5.94005C2.47005 21.41 1.02005 18.93 2.70005 15.9L5.82005 10.28L8.76005 5C10.54 1.79 13.46 1.79 15.24 5L18.18 10.29L21.3 15.91C22.98 18.94 21.52 21.42 18.06 21.42H12.0001V21.41Z"
        stroke="#ba6d00"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 9V14"
        stroke="#ba6d00"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.995 17H12.004"
        stroke="#ba6d00"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Shared quantity stepper + BUY NOW / ADD TO CART — used by both mobile and
// desktop product-info columns so the interaction logic isn't duplicated.
// Out-of-stock variant (Figma): same two-row layout, but the qty stepper and
// the dark primary button are wrapped in `opacity-50` and disabled. The dark
// button label switches to "OUT OF STOCK", and the secondary row swaps
// "ADD TO CART" for a full-opacity "NOTIFY WHEN AVAILABLE" outlined button.
function CtaRow({ qty, setQty, outOfStock = false, size = "sm" }) {
  // `size="lg"` matches Figma desktop hero (2119:2567): 48px-tall stepper +
  // 48px-tall buttons, 128px-wide stepper, 16px button text. Default "sm"
  // preserves the original mobile/compact layout (32px tall, 12px text).
  const isLg = size === "lg";
  const rowH = isLg ? "h-12" : "h-8";
  const btnSquare = isLg ? "size-12" : "size-8";
  const stepperWidth = isLg ? "w-32" : "w-36";
  const buyText = isLg ? "text-[14px]" : "text-[12px]";
  const cartText = isLg ? "text-[14px]" : "text-[10px]";
  const qtyText = isLg ? "text-[16px]" : "text-[12px]";

  return (
    <div className={`flex flex-col ${isLg ? "gap-3" : "gap-2"}`}>
      <div className={`flex ${rowH} gap-2`}>
        <div className={`flex ${rowH} ${stepperWidth} gap-2 ${outOfStock ? "opacity-50" : ""}`}>
          <button
            type="button"
            aria-label="Decrease quantity"
            disabled={outOfStock}
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className={`grid ${btnSquare} shrink-0 place-items-center rounded-[2px] border border-[#11191f] ${outOfStock ? "cursor-not-allowed" : "cursor-pointer"}`}
          >
            <MinusIcon />
          </button>
          <div className="grid flex-1 place-items-center rounded-[2px] border border-[#11191f]">
            <span
              className={`font-body ${qtyText} font-medium leading-none text-[#11191f]`}
              style={{ fontStretch: "75%" }}
            >
              {qty}
            </span>
          </div>
          <button
            type="button"
            aria-label="Increase quantity"
            disabled={outOfStock}
            onClick={() => setQty((q) => q + 1)}
            className={`grid ${btnSquare} shrink-0 place-items-center rounded-[2px] border border-[#11191f] ${outOfStock ? "cursor-not-allowed" : "cursor-pointer"}`}
          >
            <PlusIcon color="#11191f" />
          </button>
        </div>
        <button
          type="button"
          disabled={outOfStock}
          aria-disabled={outOfStock || undefined}
          className={`flex flex-1 ${rowH} items-center justify-center rounded-[4px] bg-[#11191f] px-2 ${outOfStock ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <span className={`font-display ${buyText} font-bold leading-none text-white whitespace-nowrap`}>
            {outOfStock ? "OUT OF STOCK" : "BUY NOW"}
          </span>
        </button>
      </div>
      <button
        type="button"
        className={`flex ${rowH} w-full items-center justify-center rounded-[2px] border border-[#11191f] cursor-pointer`}
      >
        <span className={`font-display ${cartText} font-bold leading-none text-[#11191f]`}>
          {outOfStock ? "NOTIFY WHEN AVAILABLE" : "ADD TO CART"}
        </span>
      </button>
    </div>
  );
}

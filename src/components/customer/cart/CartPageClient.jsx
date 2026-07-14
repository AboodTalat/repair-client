"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { SUGGESTED_PROMOS, formatJOD } from "@/lib/mockCart";
import { buildSignInRedirect } from "@/lib/authRedirect";
import { fetchCartPromoExamples } from "@/lib/promo";
import { useCart } from "@/lib/useCart";

// /cart page — matches Figma mobile 83:5144 + desktop 119:5240.
//
// Data is wired via the useCart hook (guest localStorage cart OR the logged-in
// DB cart). Promo codes are intentionally NOT applied to the real total yet —
// promo wiring is a later pass shared with the still-mock checkout flow, so the
// PromoCodeSection stays interactive but `totals.discount` is always 0 (no fake
// discount on a real total).
//
// Icons live as static SVGs under `/public/cart/`, downloaded from the Figma
// node directly. Each icon has its Figma fill/stroke baked in via
// `var(--fill-0, #COLOR)` fallbacks (e.g. truck.svg → white, percent-tag.svg
// → #9CA3AF, check.svg → #15803D), so no CSS recoloring is needed. Inlining
// the URL-fetched assets statically also avoids the 7-day Figma asset URL
// expiry (same pattern as `customer/account/AccountIcons.jsx` —
// see repair/CLAUDE.md).
//
// Fonts follow the Figma spec: every uppercase display label / heading /
// CTA is `font-display` (Zalando Sans Expanded). Body labels and variant
// subtitles are `font-body` with `style={{ fontStretch: "75%" }}` to fake
// the "Zalando Sans Condensed" weight (next/font/google doesn't ship a
// Condensed family — see repair/CLAUDE.md "Design system" notes).
//
// ShopHeader + ShopFooter come from `(customer)/layout.js` — DO NOT
// render them here. The mobile design's top sort/search/bag toolbar IS
// the ShopHeader; this page only owns the stepper + content + sticky
// mobile CTA below it.

const STEPS = [
  { key: "cart", label: "Cart", index: 1 },
  { key: "details", label: "Details", index: 2 },
  { key: "payment", label: "Payment", index: 3 },
];

export const CHECKOUT_STEPS = STEPS;

// Each step's canonical route — keeps the "back to previous step" link
// (BackStepLink) in lock-step with the Stepper without each page having to
// hardcode where the prior step lives.
export const STEP_ROUTES = {
  cart: "/cart",
  details: "/checkout",
  payment: "/checkout/payment",
};

export const condensed = { fontStretch: "75%" };

// Intrinsic dimensions per icon (matches the viewBox of each cleaned SVG
// under `/public/cart/`). These are passed to the <img> as `width`/`height`
// HTML attributes so the browser computes an intrinsic size from them —
// otherwise some browsers fall back to a 300x150 default for SVGs and
// silently ignore Tailwind's CSS sizes. The CSS class still controls the
// final display size; the attributes just set the intrinsic baseline.
const ICON_INTRINSIC = {
  plus: [24, 24],
  minus: [24, 24],
  truck: [17.5, 14],
  check: [10.5, 12],
  "check-step": [10.5, 12],
  "check-success": [10.5, 12],
  tag: [10.5, 12],
  "percent-tag": [15.75, 14],
  shield: [14, 14],
  lock: [12.25, 14],
  "lock-sm": [8.75, 10],
  return: [14, 14],
  headset: [14, 14],
  visa: [27, 24],
  mastercard: [27, 24],
  amex: [27, 24],
  discover: [27, 24],
  applepay: [30, 24],
  gpay: [30, 24],
};

export function Icon({ name, alt = "", className = "", style }) {
  // Plain <img> for static SVGs — sidesteps next/image's required width/height
  // for inline icons and keeps Tailwind sizing in control. The width/height
  // HTML attributes give the browser an intrinsic size to start from; the
  // className then resizes the rendered element to its Figma-spec size.
  const [w, h] = ICON_INTRINSIC[name] ?? [24, 24];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/cart/${name}.svg`}
      alt={alt}
      aria-hidden={!alt}
      width={w}
      height={h}
      className={className}
      style={style}
    />
  );
}

// Three-step progress used by /cart (activeStep="cart") and /checkout
// (activeStep="details"). Status per step:
//   - "completed" (idx < activeIdx): dark filled box with check-step icon
//   - "active"    (idx === activeIdx): dark filled box. Step 1 ("cart") is
//      special — it always shows the check icon when active or completed
//      (the entry-point step merges visually with the completed state);
//      every other active step shows its step.index number.
//   - "pending"   (idx > activeIdx): outlined white box with step.index
//
// Desktop also colors the connector line between each pair of steps: BLACK
// when the lower step is completed, GREY (#e5e7eb) otherwise. So on /cart
// both lines stay grey; on /checkout the cart→details segment turns black.
export function Stepper({ activeStep = "cart" }) {
  const activeIdx = Math.max(
    0,
    STEPS.findIndex((s) => s.key === activeStep),
  );
  const statusOf = (idx) =>
    idx < activeIdx ? "completed" : idx === activeIdx ? "active" : "pending";
  return (
    <>
      {/* Mobile stepper — matches Figma 83:5878 / 84:6696 spec exactly:
          inner row is `relative flex justify-between items-center`; the
          connector line is `w-[320px] h-[2px] left-[15px] top-[16px] absolute`
          (no transform — the top:16 puts the 2px line right at the vertical
          center of the 32px icon boxes which sit on top via z-10). */}
      <div className="relative w-full md:hidden">
        <div className="relative flex w-full items-center justify-between">
          {/* Connector line — width pinned via inline style because Tailwind v4 +
              Turbopack silently drops arbitrary `w-[Npx]` in this file's scan. */}
          <div
            className="absolute h-[2px] bg-[#f3f4f6]"
            style={{ left: 15, top: 16, width: 320 }}
          />
          {STEPS.map((s, idx) => (
            <StepperItem key={s.key} step={s} status={statusOf(idx)} variant="mobile" />
          ))}
        </div>
      </div>

      {/* Desktop stepper — Figma frame 119:5240 (cart) / 119:5594 (details).
          Outer 672×56 with each step absolutely positioned at its Figma left
          offset (0 / 296.28 / 609.97). Two connector lines centered on the
          32×32 icon vertical center (icon y=0..32 → center y=16 → 2px line
          at top:15 → line center y=16). Each line outer is a 256-wide /
          32-of-px-4-padded wrapper around the actual h-[2px] line; the px-4
          pads the line ends in 16px from each end of the wrapper, so visible
          line is 224px wide. All position values are inline-styled because
          Tailwind v4 + Turbopack silently drops `left-[35.81px]`-style
          arbitraries. */}
      <div className="relative mx-auto hidden h-14 w-[672px] md:block">
        {/* Line 1: between step 1 and step 2 — black when step 1 is completed. */}
        <div
          className="absolute"
          style={{
            left: 35.81 + 16,
            top: 25,
            width: 256 - 32,
            height: 2,
            backgroundColor: statusOf(0) === "completed" ? "#11191f" : "#e5e7eb",
          }}
        />
        {/* Line 2: between step 2 and step 3 — black when step 2 is completed. */}
        <div
          className="absolute"
          style={{
            left: 349.5 + 16,
            top: 25,
            width: 256 - 32,
            height: 2,
            backgroundColor: statusOf(1) === "completed" ? "#11191f" : "#e5e7eb",
          }}
        />
        <div className="absolute top-0 inline-flex flex-col items-center" style={{ left: 0 }}>
          <DesktopStepperItem step={STEPS[0]} status={statusOf(0)} />
        </div>
        <div className="absolute top-0 inline-flex flex-col items-center" style={{ left: 296.28 }}>
          <DesktopStepperItem step={STEPS[1]} status={statusOf(1)} />
        </div>
        <div className="absolute top-0 inline-flex flex-col items-center" style={{ left: 609.97 }}>
          <DesktopStepperItem step={STEPS[2]} status={statusOf(2)} />
        </div>
      </div>
    </>
  );
}

// Inline left-arrow glyph for the back link — inline SVG to dodge the
// Figma 7-day asset-URL expiry (same rationale as the cart `<Icon>` set).
function ArrowLeftIcon({ className = "size-3", style }) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
      style={style}
    >
      <path
        d="M7.5 2.5 4 6l3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// "← Back to <previous step>" link. Derives the previous step from the same
// STEPS array the Stepper uses, so it stays correct if the flow changes.
// Renders nothing on the first step (cart) since there's no step to go back
// to. Used by /checkout (back to cart) and /checkout/payment (back to
// details); a plain <Link> so it survives a refresh and gets real anchor
// semantics — the per-page mock state is reset on navigation either way.
export function BackStepLink({ activeStep, className = "" }) {
  const idx = STEPS.findIndex((s) => s.key === activeStep);
  const prev = idx > 0 ? STEPS[idx - 1] : null;
  if (!prev) return null;
  return (
    <Link
      href={STEP_ROUTES[prev.key]}
      className={`inline-flex w-fit items-center gap-1.5 text-[#6b7280] transition-colors hover:text-[#11191f] ${className}`}
    >
      <ArrowLeftIcon className="size-3" />
      <span className="font-display text-[12px] font-semibold uppercase leading-4 tracking-[0.5px]">
        Back to {prev.label}
      </span>
    </Link>
  );
}

function showsCheckIcon(step, status) {
  // Step 1 ("cart") merges its active state with completed (always check).
  if (status === "completed") return true;
  if (status === "active" && step.index === 1) return true;
  return false;
}

function DesktopStepperItem({ step, status }) {
  // Figma 119:5240 desktop step — `w-8 h-10 pb-2` wrapper pins the 32×32
  // icon at the top with 8px gap to the label below. Active step uses
  // shadow-lg elevation (no white ring on desktop since lines are #e5e7eb
  // and bg-[#11191f] icon is already visually separated). Pending boxes
  // use outline -1 so the 32×32 footprint stays exact. Label is
  // Expanded 12/16 uppercase tracking-wide; bold for completed/active,
  // medium for pending.
  const filled = status === "completed" || status === "active";
  return (
    <>
      <div className="flex h-10 w-8 flex-col items-start pb-2">
        <div
          className={`inline-flex size-8 items-center justify-center overflow-hidden rounded-[2px] ${
            filled
              ? "bg-[#11191f] text-white shadow-lg"
              : "bg-white text-[#9ca3af] outline outline-1 -outline-offset-1 outline-[#e5e7eb]"
          }`}
        >
          {showsCheckIcon(step, status) ? (
            <Icon name="check-step" className="h-3 w-[10.5px]" />
          ) : (
            <span className="font-display text-[12px] font-medium leading-4">{step.index}</span>
          )}
        </div>
      </div>
      <span
        className={`font-display text-[12px] uppercase leading-4 tracking-wide ${
          filled ? "font-bold text-[#11191f]" : "font-medium text-[#9ca3af]"
        }`}
      >
        {step.label}
      </span>
    </>
  );
}

function StepperItem({ step, status, variant }) {
  const isDesktop = variant === "desktop";
  const filled = status === "completed" || status === "active";
  // Mobile: Figma pins the active step to `w-16` (64px); other steps shrink
  // to their natural label width. Pending boxes use `outline -1` so the
  // 32×32 footprint is exact (a 1px border would shrink content to 30×30
  // and shift the "2"/"3" digit by half a pixel).
  const widthCls = !isDesktop && status === "active" ? "w-16" : "";
  return (
    <div className={`relative z-10 flex flex-col items-center gap-2 ${widthCls}`}>
      <div
        className={`grid size-8 place-items-center overflow-hidden rounded-[2px] ${
          filled
            ? "bg-[#11191f] text-white"
            : "bg-white text-[#9ca3af] outline outline-1 -outline-offset-1 outline-[#e5e7eb]"
        }`}
        style={
          filled
            ? {
                // Figma 84:6699 shadow stack: 4px white ring + soft elevation.
                boxShadow:
                  "0 0 0 4px #ffffff, 0 4px 6px -1px rgba(0,0,0,0.10), 0 2px 4px -2px rgba(0,0,0,0.10)",
              }
            : { boxShadow: "0 0 0 4px #ffffff" }
        }
      >
        {showsCheckIcon(step, status) ? (
          <Icon name="check-step" className="h-3 w-[10.5px]" />
        ) : (
          <span className="font-display text-[12px] font-medium leading-4">{step.index}</span>
        )}
      </div>
      <span
        className={`font-display uppercase ${
          filled ? "font-bold text-[#11191f]" : "font-medium text-[#9ca3af]"
        } ${
          isDesktop
            ? "text-[12px] leading-4 tracking-[0.6px]"
            : "text-[10px] leading-4 tracking-wide"
        }`}
      >
        {step.label}
      </span>
    </div>
  );
}

export function FreeShippingBanner({ amountToFreeShipping, freeShippingPct, variant }) {
  const desktop = variant === "desktop";
  const reached = amountToFreeShipping <= 0;
  return (
    <div
      className={
        desktop
          ? "flex w-full items-center gap-6 overflow-hidden rounded-[4px] p-6 text-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)]"
          : "flex w-full items-start gap-3 overflow-hidden rounded-[4px] p-4 text-white"
      }
      style={{ backgroundColor: "#11191f" }}
    >
      <div
        className={
          desktop
            ? "grid size-10 shrink-0 place-items-center rounded-[4px]"
            : "grid size-8 shrink-0 place-items-center rounded-[4px]"
        }
        style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
      >
        <Icon name="truck" alt="" className={desktop ? "h-[18px] w-[22.5px]" : "h-3.5 w-[17.5px]"} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p
          className={
            desktop
              ? "font-display text-[14px] font-medium leading-5 text-white"
              : "font-display text-[14px] font-medium leading-5 text-white"
          }
        >
          Free Shipping Available
        </p>
        <p
          className={
            desktop
              ? "pb-2 font-display text-[12px] leading-4 text-[#d1d5db]"
              : "pb-2 font-body text-[12px] leading-[19.5px] text-[#d1d5db]"
          }
          style={desktop ? undefined : condensed}
        >
          {reached ? (
            <span>
              You&rsquo;ve qualified for{" "}
              <span className="font-bold text-white">free standard shipping</span>.
            </span>
          ) : (
            <>
              Add{" "}
              <span className="font-bold text-white">{formatJOD(amountToFreeShipping)}</span>{" "}
              more to your cart to qualify for free standard shipping.
            </>
          )}
        </p>
        <div
          className={
            desktop
              ? "h-1.5 w-full overflow-hidden rounded-full"
              : "h-1 w-full overflow-hidden rounded-full"
          }
          style={{ backgroundColor: desktop ? "#374151" : "rgba(255,255,255,0.2)" }}
        >
          <div
            className="h-full rounded-full bg-white transition-all"
            style={{ width: `${freeShippingPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function QtyStepper({ qty, onDec, onInc, variant }) {
  // Mobile: 3 detached squares (24x24, 0.75px black border, 1.5px radius —
  // Figma 83:5946). Desktop: 1 grouped pill (32px tall, 1px #d1d5db border,
  // 2px radius — Figma 119:5301).
  if (variant === "desktop") {
    return (
      <div className="flex items-center rounded-[2px] border border-[#d1d5db]">
        <button
          type="button"
          onClick={onDec}
          className="grid size-8 place-items-center hover:bg-[#f9fafb]"
          aria-label="Decrease quantity"
        >
          <Icon name="minus" className="h-3 w-[10.5px]" />
        </button>
        <div className="grid h-8 w-10 place-items-center border-x border-[#d1d5db]">
          <span className="font-display text-[14px] font-medium leading-none text-[#11191f]">
            {qty}
          </span>
        </div>
        <button
          type="button"
          onClick={onInc}
          className="grid size-8 place-items-center hover:bg-[#f9fafb]"
          aria-label="Increase quantity"
        >
          <Icon name="plus" className="h-3 w-[10.5px]" />
        </button>
      </div>
    );
  }
  // Mobile +/- icons fill the entire 24x24 button (Figma img:
  // `absolute block inset-0 max-w-none size-full`). The SVG viewBox is
  // 0 0 24 24 with the line at x=6..18, so rendering at full button
  // size shows the line at its intended 12px Figma width.
  return (
    <div className="flex items-start gap-1.5">
      <button
        type="button"
        onClick={onDec}
        className="relative size-6 shrink-0 rounded-[1.5px] border-[0.75px] border-[#11191f] bg-white"
        aria-label="Decrease quantity"
      >
        <Icon name="minus" className="absolute inset-0 size-full" />
      </button>
      <div className="grid h-6 w-[60px] place-items-center rounded-[1.5px] border-[0.75px] border-[#11191f] bg-white">
        <span className="font-body text-[12px] font-medium leading-none text-[#11191f]" style={condensed}>
          {qty}
        </span>
      </div>
      <button
        type="button"
        onClick={onInc}
        className="relative size-6 shrink-0 rounded-[1.5px] border-[0.75px] border-[#11191f]"
        aria-label="Increase quantity"
      >
        <Icon name="plus" className="absolute inset-0 size-full" />
      </button>
    </div>
  );
}

// Stock state per cart line. `maxQty` is the live `in_stock_quantity` the
// server returns for logged-in carts; guest lines carry `maxQty: null`
// (unknown) and are NEVER treated as out of stock. A line is "short" when the
// variant is fully out of stock (maxQty <= 0) or the chosen qty exceeds what's
// left (qty > maxQty) — the exact predicate myAppCheckout rejects on, so the
// cart highlights every line that would fail checkout.
export function stockShort(item) {
  return item.maxQty != null && (item.maxQty <= 0 || item.qty > item.maxQty);
}

function stockLabel(item) {
  if (item.maxQty == null) return null;
  if (item.maxQty <= 0) return "Out of stock";
  if (item.qty > item.maxQty) return `Only ${item.maxQty} left`;
  return null;
}

// Small red pill marking an out-of-stock / insufficiently-stocked line.
function StockBadge({ item }) {
  const label = stockLabel(item);
  if (!label) return null;
  return (
    <span
      className="inline-flex w-fit items-center rounded-[3px] px-2 py-0.5 font-display text-[10px] font-bold uppercase leading-4 tracking-[0.4px] text-white"
      style={{ backgroundColor: "#b91c1c" }}
    >
      {label}
    </span>
  );
}

function MobileCartItem({ item, onInc, onDec }) {
  const short = stockShort(item);
  return (
    <div className="flex w-full items-start gap-3">
      <div
        className="relative h-[126px] w-[84px] shrink-0 overflow-hidden bg-[#f3f4f6] shadow-[0_0_10px_0_rgba(0,0,0,0.05)]"
        style={short ? { outline: "2px solid #b91c1c", outlineOffset: "-2px" } : undefined}
      >
        <Image src={item.image} alt={item.name} fill sizes="84px" className="object-cover" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between self-stretch py-1">
        <div className="flex flex-col gap-1 pb-2">
          <h3 className="font-display text-[14px] font-semibold leading-[17.5px] text-[#11191f]">
            {item.name}
          </h3>
          <p className="font-body text-[12px] leading-4 text-[#6b7280]" style={condensed}>
            {item.variantLabel}
          </p>
          <StockBadge item={item} />
        </div>
        <div className="flex items-end justify-between">
          <QtyStepper qty={item.qty} onInc={onInc} onDec={onDec} variant="mobile" />
          <span className="font-display text-[14px] font-bold leading-5 text-[#11191f]">
            {formatJOD(item.price * item.qty)}
          </span>
        </div>
      </div>
    </div>
  );
}

function DesktopCartItem({ item, onInc, onDec, onRemove, isFirst }) {
  const short = stockShort(item);
  return (
    <div
      className={`flex w-full items-start gap-6 ${isFirst ? "py-4" : "border-t border-[#f3f4f6] pb-4 pt-[17px]"}`}
    >
      <div
        className="relative h-36 w-24 shrink-0 overflow-hidden bg-[#f3f4f6] shadow-[0_0_18.523px_0_rgba(0,0,0,0.05)]"
        style={short ? { outline: "2px solid #b91c1c", outlineOffset: "-2px" } : undefined}
      >
        <Image src={item.image} alt={item.name} fill sizes="96px" className="object-cover" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between self-stretch">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="font-display text-[18px] font-bold leading-7 text-[#11191f]">
              {item.name}
            </h3>
            <p className="font-body text-[14px] leading-5 text-[#6b7280]" style={condensed}>
              {item.variantLabel}
            </p>
            <StockBadge item={item} />
          </div>
          <span className="shrink-0 font-display text-[18px] font-bold leading-7 text-[#11191f]">
            {formatJOD(item.price * item.qty)}
          </span>
        </div>
        <div className="flex items-end justify-between">
          <QtyStepper qty={item.qty} onInc={onInc} onDec={onDec} variant="desktop" />
          <button
            type="button"
            onClick={onRemove}
            className="font-display text-[12px] leading-4 text-[#9ca3af] underline hover:text-[#11191f]"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

export function ItemsSection({ items, setItems, onInc, onDec, onRemove, variant }) {
  // Backward-compatible: /cart passes real cart handlers (onInc/onDec/onRemove,
  // each called with the item); the still-mock checkout pages pass `setItems`
  // and fall back to local array mutation keyed by item id.
  const inc =
    onInc ?? ((it) => setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, qty: x.qty + 1 } : x))));
  const dec =
    onDec ??
    ((it) => setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, qty: Math.max(1, x.qty - 1) } : x))));
  const remove = onRemove ?? ((it) => setItems((prev) => prev.filter((x) => x.id !== it.id)));

  if (variant === "desktop") {
    return (
      <div className="flex w-full flex-col">
        <div className="flex items-center justify-between border-b border-[#f3f4f6] pb-[17px]">
          <h2 className="font-display text-[20px] font-bold leading-7 tracking-[-0.5px] text-[#11191f]">
            Your Items ({items.length})
          </h2>
          <Link
            href="/shop"
            className="font-display text-[12px] font-medium uppercase leading-4 tracking-[0.6px] text-[#6b7280] hover:text-[#11191f]"
          >
            Edit Cart
          </Link>
        </div>
        <div className="flex flex-col">
          {items.map((it, idx) => (
            <DesktopCartItem
              key={it.id}
              item={it}
              onInc={() => inc(it)}
              onDec={() => dec(it)}
              onRemove={() => remove(it)}
              isFirst={idx === 0}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-6 px-4 py-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[16px] font-semibold leading-6 text-[#11191f]">
          Your Items ({items.length})
        </h2>
        <Link
          href="/shop"
          className="font-body text-[12px] font-medium leading-4 text-[#6b7280] hover:text-[#11191f]"
          style={condensed}
        >
          Edit Cart
        </Link>
      </div>
      <div className="flex flex-col gap-6">
        {items.map((it) => (
          <MobileCartItem key={it.id} item={it} onInc={() => inc(it)} onDec={() => dec(it)} />
        ))}
      </div>
    </section>
  );
}

// `onApplyCode(code)` validates against the backend (myAppValidatePromoCode via
// the parent) and resolves `{ ok, error? }`. `externalError` surfaces an async
// drop (e.g. the cart re-validating below a promo's minimum-order after a qty
// change). Guests are short-circuited — the resolver requires auth.
// `suggestedCodes` is the list of example promo codes rendered as chips below
// the input. The /cart page feeds it live, admin-flagged codes (via
// `fetchCartPromoExamples`); the still-mock /checkout + /checkout/payment pages
// don't pass it and fall back to the legacy `SUGGESTED_PROMOS` constant. At most
// MAX_SUGGESTED_CHIPS are shown (the row wraps, but a long list would dwarf the
// card) and the whole row is hidden when there are none.
const MAX_SUGGESTED_CHIPS = 4;
export function PromoCodeSection({
  appliedPromo,
  onApplyCode,
  onClear,
  isGuest = false,
  externalError = "",
  variant,
  suggestedCodes = SUGGESTED_PROMOS,
  welcomeActive = false,
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const desktopWrap = variant === "desktop";

  // First-order welcome discount can't be combined with a promo code — replace
  // the input with a clear note instead of letting the user type a code that
  // would always be rejected (the backend + useCart also block it).
  if (welcomeActive) {
    return (
      <div
        className={
          desktopWrap
            ? "flex w-full flex-col gap-3 rounded-lg border border-[#f3f4f6] bg-[#f9fafb] p-6"
            : "flex flex-col gap-3 px-4 py-4"
        }
      >
        <h2
          className={
            desktopWrap
              ? "font-display text-[16px] font-bold uppercase leading-6 tracking-[0.4px] text-[#11191f]"
              : "font-display text-[16px] font-semibold leading-6 text-[#11191f]"
          }
        >
          Promo Code
        </h2>
        <div
          className="flex items-start gap-2 rounded-[6px] p-3 font-body text-[13px] leading-5"
          style={{ backgroundColor: "#f0fdf4", color: "#15803d" }}
        >
          <Icon name="check" className="mt-0.5 h-3 w-2.5 shrink-0" />
          <span>
            Your 10% first-order welcome discount is applied automatically. Promo codes can’t be
            combined with it — you can use one on a future order.
          </span>
        </div>
      </div>
    );
  }

  const submit = async (codeOverride) => {
    const raw = (codeOverride ?? value).trim().toUpperCase();
    if (!raw) {
      setError("Enter a promo code");
      return;
    }
    if (isGuest) {
      setError("Sign in to apply a promo code.");
      return;
    }
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const res = await onApplyCode(raw);
      if (!res?.ok) {
        setError(res?.error || "That code isn’t valid");
        return;
      }
      setValue("");
    } finally {
      setLoading(false);
    }
  };

  const shownError = error || externalError;
  const desktop = variant === "desktop";

  return (
    <div
      className={
        desktop
          ? "flex w-full flex-col gap-4 rounded-lg border border-[#f3f4f6] bg-[#f9fafb] p-6"
          : "flex flex-col gap-4 px-4 py-4"
      }
    >
      <h2
        className={
          desktop
            ? "font-display text-[16px] font-bold uppercase leading-6 tracking-[0.4px] text-[#11191f]"
            : "font-display text-[16px] font-semibold leading-6 text-[#11191f]"
        }
      >
        Promo Code
      </h2>
      <div className="flex items-stretch gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center">
            <Icon name="percent-tag" className="h-3.5 w-[15.75px]" />
          </span>
          <input
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError("");
            }}
            placeholder="Enter discount code"
            aria-label="Promo code"
            disabled={loading}
            className={`h-12 w-full rounded-[4px] border bg-white pl-10 pr-4 font-body text-[14px] text-[#11191f] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#11191f] ${
              shownError ? "border-[#dc2626]" : desktop ? "border-[#d1d5db]" : "border-[#11191f]"
            }`}
            style={condensed}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => submit()}
          disabled={loading}
          className={`shrink-0 rounded-[4px] px-6 text-white disabled:opacity-60 ${
            desktop
              ? "font-display text-[14px] font-bold uppercase leading-5"
              : "h-12 font-display text-[14px] font-medium leading-5"
          }`}
          style={{ backgroundColor: "#11191f" }}
        >
          {loading ? "Applying…" : "Apply"}
        </button>
      </div>
      {shownError ? (
        <p className="font-body text-[12px] leading-4 text-[#dc2626]" style={condensed}>
          {shownError}
        </p>
      ) : null}
      {suggestedCodes.length > 0 ? (
      <div className={desktop ? "flex w-full flex-wrap items-start justify-start gap-2" : "flex flex-wrap items-start gap-2 self-stretch"}>
        {suggestedCodes.slice(0, MAX_SUGGESTED_CHIPS).map((code) => {
          const isApplied = appliedPromo?.code === code;
          if (desktop) {
            // Desktop chip — Figma 119:5380 / 119:5384. Both chips render
            // in the SAME outlined-white state (no filled-black active
            // treatment); the applied indicator lives on the green discount
            // pill in the Order Total below. Differs from mobile in:
            //   - outline outline-1 -outline-offset-1 (not border)
            //   - px-3 py-1.5 (tighter than mobile's px-[13px] py-[7px])
            //   - gap-2 (8px) between icon and label (mobile is gap-1.5)
            //   - icon is 8×10 (mobile is 10×12)
            //   - label is Expanded Medium (mobile is Condensed Medium)
            return (
              <button
                key={code}
                type="button"
                onClick={() => (isApplied ? onClear() : submit(code))}
                className="flex items-center justify-start gap-2 rounded-full bg-white px-3 py-1.5 outline outline-1"
                style={{ outlineColor: "#e5e7eb", outlineOffset: "-1px" }}
              >
                <Icon name="tag" className="h-2.5 w-2 text-[#4b5563]" />
                <span className="text-center font-display text-[12px] font-medium leading-4 text-[#4b5563]">
                  {code}
                </span>
              </button>
            );
          }
          // Mobile chip — Figma 83:6032 / 83:6037. Both chips render in the
          // SAME outlined-white state; the "applied" indicator lives on the
          // green discount pill in the Order Total below, not on these chips.
          return (
            <button
              key={code}
              type="button"
              onClick={() => (isApplied ? onClear() : submit(code))}
              className="flex items-center justify-start gap-1.5 rounded-full bg-white px-3 py-1.5 outline outline-1"
              style={{ outlineColor: "#e5e7eb", outlineOffset: "-1px" }}
            >
              <Icon name="tag" className="h-3 w-2.5 text-[#9ca3af]" />
              <span
                className="text-center font-body text-[12px] font-medium leading-4 text-[#4b5563]"
                style={condensed}
              >
                {code}
              </span>
            </button>
          );
        })}
      </div>
      ) : null}
    </div>
  );
}

function TotalsRow({ label, value, valueAccent, variant }) {
  // Figma: mobile totals row label uses Zalando Sans Condensed Regular
  // (data-node 83:6049); desktop uses Zalando Sans Expanded Regular
  // (data-node 119:5398). Values are Zalando Sans Expanded Medium on
  // both breakpoints.
  const desktop = variant === "desktop";
  return (
    <div className="flex w-full items-center justify-between self-stretch">
      <span
        className={
          desktop
            ? "font-display text-[14px] leading-5 text-[#4b5563]"
            : "font-body text-[14px] leading-5 text-[#4b5563]"
        }
        style={desktop ? undefined : condensed}
      >
        {label}
      </span>
      <span
        className="font-display text-[14px] font-medium leading-5"
        style={{ color: valueAccent ?? "#11191f" }}
      >
        {value}
      </span>
    </div>
  );
}

export function OrderTotalsBlock({ totals, appliedPromo, variant, onContinue, isGuest = false, blocked = false }) {
  const desktop = variant === "desktop";
  const { subtotal, discount, welcomeDiscount = 0, shipping, tax, total, itemCount } = totals;
  // Tax-inclusive display: when the store's prices already include tax, show
  // the embedded amount (display-only — not added to `total`) instead of the
  // misleading "Tax (Estimated): JOD 0.00". These fields are absent on the
  // mock checkout totals, so that path falls through to the plain row below.
  const taxInclusive = !!totals.taxInclusive;
  const taxLabel = taxInclusive ? "Tax (included)" : "Tax (Estimated)";
  const taxValue = taxInclusive ? totals.taxIncludedAmount ?? 0 : tax;

  // Outer container — Figma:
  //   mobile (83:6043): bg #f9fafb, border #f3f4f6, padding 17px on all sides,
  //     no corner radius (full-bleed strip), gap-[16px] between header + body.
  //   desktop (119:5392): bg #f9fafb, border #f3f4f6, rounded-[8px],
  //     ~24px inset padding, gap-[16px] between sections.
  return (
    <div
      className={
        desktop
          ? "flex w-full flex-col gap-4 rounded-lg border border-[#f3f4f6] bg-[#f9fafb] p-6"
          : "inline-flex w-full flex-col items-start gap-4 bg-[#f9fafb] p-4 outline outline-1"
      }
      style={
        desktop
          ? undefined
          : {
              // Tailwind v4 + Turbopack drops `outline-[#f3f4f6]` and
              // `-outline-offset-1` from the scanner output — set both inline
              // so the card actually gets the light-grey #F3F4F6 outline.
              outlineColor: "#f3f4f6",
              outlineOffset: "-1px",
            }
      }
    >
      <h2
        className={
          desktop
            ? "font-display text-[16px] font-bold uppercase leading-6 tracking-[0.4px] text-[#11191f]"
            : "self-stretch font-display text-[14px] font-semibold uppercase leading-5 tracking-tight text-[#11191f]"
        }
      >
        Order Total
      </h2>
      {/* Rows container — Figma:
            mobile rows gap-[12px] (no border on this container; the
              Total wrapper below carries the border-t),
            desktop rows gap-[16px] + border-b pb-[25px] (border-line is
              on this container, the Total row below has no border). */}
      <div
        className={
          desktop
            ? "flex flex-col gap-4 border-b border-[#e5e7eb] pb-[25px]"
            : "flex w-full flex-col items-center gap-3 self-stretch"
        }
      >
        <TotalsRow label={`Subtotal (${itemCount} items)`} value={formatJOD(subtotal)} variant={variant} />
        <TotalsRow
          label="Shipping"
          value={shipping === 0 ? "Free" : formatJOD(shipping)}
          valueAccent={shipping === 0 ? "#16a34a" : undefined}
          variant={variant}
        />
        <TotalsRow label={taxLabel} value={formatJOD(taxValue)} variant={variant} />
        {discount > 0 ? (
          // Discount pill — Figma spec differs by breakpoint:
          //   Mobile (83:6062 / 83:6067 / 83:6069):
          //     bg #f0fdf4, rounded 8px, pl 8 / pr 8 / py 4, gap 6px,
          //     icon imgSvg3 (#15803D), label Expanded Medium 12px #15803d,
          //     value Expanded Bold 12px #15803d, tight format "-JOD18.60".
          //   Desktop (119:5411 / 119:5416 / 119:5418):
          //     bg #f0fdf4, rounded 4px, p 8px, gap 8px,
          //     icon imgSvg6 (#16A34A), label Expanded Medium 14px #16a34a,
          //     value Expanded Medium 14px #16a34a, spaced "-JOD 18.60".
          <div
            className={`flex w-full items-center justify-between self-stretch ${
              desktop ? "rounded-[4px] p-2" : "rounded-[8px] px-2 py-1"
            }`}
            style={{ backgroundColor: "#f0fdf4" }}
          >
            <span
              className={`flex items-center font-display font-medium leading-5 ${
                desktop ? "gap-2" : "gap-1.5"
              }`}
              style={{ color: desktop ? "#16a34a" : "#15803d" }}
            >
              <Icon
                name={desktop ? "check-success" : "check"}
                className={desktop ? "h-3 w-[10.5px]" : "h-3 w-2.5"}
              />
              <span className={desktop ? "text-[14px]" : "text-[12px]"}>
                Discount ({appliedPromo?.code})
              </span>
            </span>
            <span
              className={`font-display leading-5 ${
                desktop ? "text-[14px] font-medium" : "text-[12px] font-bold"
              }`}
              style={{ color: desktop ? "#16a34a" : "#15803d" }}
            >
              {desktop ? `-${formatJOD(discount)}` : `-JOD${discount.toFixed(2)}`}
            </span>
          </div>
        ) : null}
        {welcomeDiscount > 0 ? (
          // First-order welcome discount pill — same green treatment as the
          // promo discount pill, labelled so the customer sees the 10% applied.
          <div
            className={`flex w-full items-center justify-between self-stretch ${
              desktop ? "rounded-[4px] p-2" : "rounded-[8px] px-2 py-1"
            }`}
            style={{ backgroundColor: "#f0fdf4" }}
          >
            <span
              className={`flex items-center font-display font-medium leading-5 ${
                desktop ? "gap-2" : "gap-1.5"
              }`}
              style={{ color: desktop ? "#16a34a" : "#15803d" }}
            >
              <Icon
                name={desktop ? "check-success" : "check"}
                className={desktop ? "h-3 w-[10.5px]" : "h-3 w-2.5"}
              />
              <span className={desktop ? "text-[14px]" : "text-[12px]"}>
                Welcome discount (10%)
              </span>
            </span>
            <span
              className={`font-display leading-5 ${
                desktop ? "text-[14px] font-medium" : "text-[12px] font-bold"
              }`}
              style={{ color: desktop ? "#16a34a" : "#15803d" }}
            >
              {desktop ? `-${formatJOD(welcomeDiscount)}` : `-JOD${welcomeDiscount.toFixed(2)}`}
            </span>
          </div>
        ) : null}
      </div>
      {/* Total row — Figma:
            mobile (83:6070): wrapped in border-t border-[#e5e7eb] pt-[17px],
              label 16px Bold leading-24, value 20px Bold leading-32 tracking-[-0.6px].
            desktop (119:5419): no border (the rows container carries border-b),
              label 18px Bold leading-28, value 20px Bold leading-32. */}
      <div
        className={
          desktop
            ? "flex items-center justify-between"
            : "flex w-full flex-col items-start self-stretch border-t border-[#e5e7eb] pt-4"
        }
      >
        <div
          className={
            desktop
              ? "contents"
              : "inline-flex w-full items-start justify-between"
          }
        >
          <span
            className={
              desktop
                ? "font-display text-[18px] font-bold leading-7 text-[#11191f]"
                : "font-display text-[16px] font-bold leading-6 text-[#11191f]"
            }
          >
            Total
          </span>
          <span
            className={
              desktop
                ? "font-display text-[20px] font-bold leading-8 text-[#11191f]"
                : "font-display text-right text-[20px] font-bold leading-8 text-[#11191f]"
            }
          >
            {formatJOD(total)}
          </span>
        </div>
      </div>
      {desktop ? (
        <>
          {isGuest ? (
            <>
              <Link
                href={buildSignInRedirect("/cart")}
                className="mt-2 flex h-14 w-full items-center justify-center rounded-[4px] text-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.10),0_4px_6px_-4px_rgba(0,0,0,0.10)]"
                style={{ backgroundColor: "#11191f" }}
              >
                <span className="font-display text-[14px] font-semibold uppercase leading-6 tracking-[0.8px]">
                  Sign in to Continue
                </span>
              </Link>
              <button
                type="button"
                onClick={onContinue}
                className="font-display text-[14px] font-semibold leading-6 text-[#11191f]"
              >
                CONTINUE AS A GUEST
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onContinue}
                disabled={blocked}
                className="mt-2 flex h-14 w-full items-center justify-center rounded-[4px] text-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.10),0_4px_6px_-4px_rgba(0,0,0,0.10)] disabled:cursor-not-allowed"
                style={{ backgroundColor: blocked ? "rgba(17,25,31,0.5)" : "#11191f" }}
              >
                <span className="font-display text-[14px] font-bold uppercase leading-6 tracking-[0.8px]">
                  Continue to Next Step
                </span>
              </button>
              {blocked ? (
                <p className="text-center font-body text-[12px] leading-4 text-[#b91c1c]" style={condensed}>
                  Update the quantity or remove the unavailable items to continue.
                </p>
              ) : null}
            </>
          )}
          <p className="text-center font-body text-[10px] leading-[15px] text-[#9ca3af]" style={condensed}>
            By proceeding to payment, you agree to our{" "}
            <a href="/terms" className="underline">Terms of Service</a>
            {" "}and{" "}
            <a href="/privacy" className="underline">Privacy Policy</a>.
          </p>
          <div
            className="flex items-center justify-center gap-2 rounded-[4px] py-1.5"
            style={{ backgroundColor: "#f3f4f6" }}
          >
            <Icon name="lock-sm" className="h-3 w-[10.5px]" />
            <span className="font-display text-[10px] leading-[15px] text-[#6b7280]">
              Encrypted &amp; Secure
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}

// Trust-badge icon sizes are different per breakpoint:
//   Mobile: 14x14 (shield, return), 14x12.25 (lock) — Figma data-nodes
//     83:6084 / 83:6090 / 83:6096, each sits inside a 40x40 white card.
//   Desktop: 20x20 (shield, return), 20x17.5 (lock) — Figma data-nodes
//     119:5440 / 119:5445 / 119:5450, the icon IS the card's content
//     (no inner white square — the outer bordered card serves that role).
const TRUST_ITEMS = [
  {
    label: "Secure Payment",
    icon: "shield",
    mobileClass: "size-3.5",
    desktopClass: "size-5",
  },
  {
    label: "SSL Encrypted",
    icon: "lock",
    mobileClass: "h-3.5 w-[12.25px]",
    desktopClass: "h-5 w-[17.5px]",
  },
  {
    label: "30-Day Returns",
    icon: "return",
    mobileClass: "size-3.5",
    desktopClass: "size-5",
  },
];

export function TrustBadgesRow({ variant }) {
  const desktop = variant === "desktop";
  return (
    <div className={desktop ? "flex w-full items-stretch justify-center gap-2" : "flex w-full items-start gap-4 px-4 py-2"}>
      {TRUST_ITEMS.map((item) => (
        <div
          key={item.label}
          className={
            desktop
              ? "flex flex-1 flex-col items-center gap-2 rounded-lg border border-[#f3f4f6] bg-white p-[13px] shadow-[0_1px_1px_rgba(0,0,0,0.05)]"
              : "flex flex-1 flex-col items-center gap-2"
          }
        >
          {desktop ? (
            <Icon name={item.icon} className={item.desktopClass} />
          ) : (
            <div className="grid size-10 place-items-center rounded-[4px] border border-[#f3f4f6] bg-white shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
              <Icon name={item.icon} className={item.mobileClass} />
            </div>
          )}
          <span
            className={
              desktop
                ? "font-display text-[10px] font-medium leading-[15px] text-[#6b7280]"
                : "font-body text-[10px] font-medium leading-[15px] text-[#4b5563]"
            }
            style={desktop ? undefined : condensed}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// Figma node 83:6100 — 6 payment-brand icons. visa + amex come from clean
// Figma SVG exports; the other 4 (mastercard, discover, applepay, gpay)
// have `Cnan nan` in their SVG path data (Figma's export bug on degenerate
// cubic curves), so we use the rasterized PNG renders from Figma's
// screenshot API instead — they're authoritative even when SVG export
// breaks. Widths: 27 for the cards, 30 for Apple/G Pay (matches Figma).
const PAYMENT_BRANDS = [
  { name: "visa", ext: "svg", w: 27 },
  { name: "mastercard", ext: "png", w: 27 },
  { name: "amex", ext: "svg", w: 27 },
  { name: "discover", ext: "png", w: 27 },
  { name: "applepay", ext: "png", w: 30 },
  { name: "gpay", ext: "png", w: 30 },
];

export function PaymentMethodsRow({ variant }) {
  const desktop = variant === "desktop";
  return (
    <div
      className={
        desktop
          ? "flex w-full items-center justify-center gap-3 opacity-60"
          : "inline-flex w-full items-center justify-center gap-3 self-stretch opacity-60"
      }
    >
      {PAYMENT_BRANDS.map((b) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={b.name}
          src={`/cart/${b.name}.${b.ext}`}
          alt=""
          aria-hidden
          width={b.w}
          height={24}
          className="h-6"
          style={{ width: b.w }}
        />
      ))}
    </div>
  );
}

export function SupportCard({ variant }) {
  const desktop = variant === "desktop";
  return (
    <div
      className={
        desktop
          ? "relative w-full overflow-hidden rounded-lg p-6"
          : "relative mx-4 overflow-hidden rounded-[4px] p-5"
      }
      style={{ backgroundColor: "#11191f" }}
    >
      <div
        className="pointer-events-none absolute -right-[40px] -top-[40px] size-32 rounded-full blur-[20px]"
        style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
      />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div
            className="grid size-10 shrink-0 place-items-center rounded-[4px]"
            style={{
              backgroundColor: "rgba(255,255,255,0.1)",
              border: desktop ? "none" : "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {/* Mobile headset 14x14 (Figma 83:6124),
                desktop 18x18 (Figma 119:5477). */}
            <Icon name="headset" className={desktop ? "size-[18px]" : "size-3.5"} />
          </div>
          <div className="flex flex-col gap-0.5">
            <h3
              className={
                desktop
                  ? "font-display text-[16px] font-bold leading-6 text-white"
                  : "font-display text-[14px] font-semibold leading-5 text-white"
              }
            >
              Need Help?
            </h3>
            <p
              className={
                desktop
                  ? "font-body text-[12px] leading-4 text-[#d1d5db]"
                  : "font-body text-[10px] leading-[16.25px] text-[#9ca3af]"
              }
              style={condensed}
            >
              Our support team is available 24/7
            </p>
          </div>
        </div>
        <Link
          href="/contact"
          className={
            desktop
              ? "flex w-full items-center justify-center rounded-[4px] bg-white px-6 py-2 font-display text-[12px] font-bold uppercase leading-4 tracking-[0.6px] text-[#11191f] hover:bg-[#f3f4f6]"
              : "flex h-10 w-full items-center justify-center rounded-[4px] bg-white font-display text-[12px] font-bold uppercase leading-4 text-[#11191f] hover:bg-[#f3f4f6]"
          }
        >
          {desktop ? "Contact Us" : "CONTACT US"}
        </Link>
      </div>
    </div>
  );
}

export function PoliciesFootnote() {
  return (
    <div className="flex flex-col items-center gap-3 px-8 py-2 md:hidden">
      {/* Figma 83:6144 — span structure with an explicit <br/> after
          "Terms of Service" so the wrap point is deterministic. Base text
          color is gray-500 #6b7280; both links use gray-900 #11191f
          underlined. Font family is Zalando Sans Condensed (faked via
          `font-body` + `fontStretch: 75%` since next/font/google doesn't
          ship a separate Condensed family — see repair/CLAUDE.md). */}
      <div
        className="text-center font-body text-[10px] font-normal leading-4 text-[#6b7280]"
        style={condensed}
      >
        <span>By proceeding to payment, you agree to our </span>
        <a href="/terms" className="text-[#11191f] underline">Terms of Service</a>
        <br />
        <span>and </span>
        <a href="/privacy" className="text-[#11191f] underline">Privacy Policy</a>
        <span>.</span>
      </div>
      <div
        className="flex items-center gap-1.5 rounded-full px-3 py-1"
        style={{ backgroundColor: "#f3f4f6" }}
      >
        <Icon name="lock-sm" className="h-2.5 w-[8.75px]" />
        <span className="font-body text-[10px] font-medium leading-[15px] text-[#4b5563]" style={condensed}>
          Encrypted &amp; Secure
        </span>
      </div>
    </div>
  );
}

export function StickyCheckoutBar({ total, onContinue, ctaText = "Continue to Next Step", isGuest = false, blocked = false }) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-20 border-t border-[#e5e7eb] px-5 pb-4 pt-[17px] shadow-[0_-4px_20px_-2px_rgba(0,0,0,0.1)] md:hidden"
      style={{
        backgroundColor: "rgba(255,255,255,0.8)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div className="mx-auto flex max-w-[393px] flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-display text-[12px] font-medium leading-4 text-[#6b7280]">Total to pay</span>
          <span className="font-display text-[18px] font-bold leading-7 text-[#11191f]">
            {formatJOD(total)}
          </span>
        </div>
        {isGuest ? (
          <>
            <Link
              href={buildSignInRedirect("/cart")}
              className="flex h-14 w-full items-center justify-center rounded-[4px] text-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.10),0_4px_6px_-4px_rgba(0,0,0,0.10)]"
              style={{ backgroundColor: "#11191f" }}
            >
              <span className="font-display text-[14px] font-semibold leading-6">SIGN IN TO CONTINUE</span>
            </Link>
            <button
              type="button"
              onClick={onContinue}
              className="font-display text-[14px] font-semibold leading-6 text-[#11191f]"
            >
              CONTINUE AS A GUEST
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onContinue}
            disabled={blocked}
            className="flex h-14 w-full items-center justify-center rounded-[4px] text-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.10),0_4px_6px_-4px_rgba(0,0,0,0.10)] disabled:cursor-not-allowed"
            style={{ backgroundColor: blocked ? "rgba(17,25,31,0.5)" : "#11191f" }}
          >
            <span className="font-display text-[16px] font-semibold leading-6">{ctaText}</span>
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <div className="grid size-16 place-items-center rounded-full bg-[#f3f4f6]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/shop/icon-bag.svg" alt="" aria-hidden className="size-7" />
      </div>
      <h2 className="font-display text-[20px] font-bold uppercase leading-7 tracking-[-0.5px] text-[#11191f]">
        Your cart is empty
      </h2>
      <p className="max-w-[320px] font-body text-[14px] leading-5 text-[#6b7280]" style={condensed}>
        Add a few pieces from the shop to see them here.
      </p>
      <Link
        href="/shop"
        className="mt-2 flex h-12 items-center justify-center rounded-[4px] bg-[#11191f] px-8 font-display text-[14px] font-bold uppercase leading-5 text-white tracking-[0.7px]"
      >
        Continue Shopping
      </Link>
    </div>
  );
}

function CartLoading() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-[#e5e7eb] border-t-[#11191f]" />
        <p className="font-body text-[14px] text-[#6b7280]" style={condensed}>
          Loading your cart…
        </p>
      </div>
    </div>
  );
}

function CartError({ message, onDismiss }) {
  return (
    <div
      role="alert"
      className="mx-4 mt-4 flex items-center justify-between gap-3 rounded-[4px] border border-[#fecaca] px-4 py-3 md:mx-8"
      style={{ backgroundColor: "#fef2f2" }}
    >
      <span className="font-body text-[13px] leading-5 text-[#b91c1c]" style={condensed}>
        {message}
      </span>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 font-display text-[12px] font-medium uppercase tracking-wide text-[#b91c1c] underline"
      >
        Dismiss
      </button>
    </div>
  );
}

// Banner shown when one or more cart lines are out of stock / short on stock —
// the same red language as CartError, but with an optional one-click "Remove
// unavailable items" action so the user can clear the blockers and proceed.
// `fromCheckout` tailors the lead-in when the user was bounced here from a
// failed checkout (so the redirect doesn't feel unexplained).
function OutOfStockBanner({ count, onRemoveUnavailable, fromCheckout }) {
  const lead = fromCheckout
    ? "We couldn't complete your order — "
    : "";
  const noun = count === 1 ? "item is" : "items are";
  return (
    <div
      role="alert"
      className="mx-4 mt-4 flex flex-col gap-2 rounded-[4px] border border-[#fecaca] px-4 py-3 md:mx-8"
      style={{ backgroundColor: "#fef2f2" }}
    >
      <span className="font-body text-[13px] leading-5 text-[#b91c1c]" style={condensed}>
        {lead}
        {count === 1 ? "one " : `${count} `}
        {noun} no longer available at the chosen quantity. Update the quantity or remove the
        highlighted {count === 1 ? "item" : "items"} below to continue.
      </span>
      {onRemoveUnavailable ? (
        <button
          type="button"
          onClick={onRemoveUnavailable}
          className="self-start font-display text-[12px] font-medium uppercase tracking-wide text-[#b91c1c] underline"
        >
          Remove unavailable {count === 1 ? "item" : "items"}
        </button>
      ) : null}
    </div>
  );
}

export default function CartPageClient() {
  const router = useRouter();
  const {
    items,
    loading,
    error,
    isGuest,
    totals,
    updateQty,
    removeItem,
    clearError,
    appliedPromo,
    applyPromo,
    clearPromo,
    promoError,
  } = useCart();

  // Live, admin-flagged example promo codes shown as chips under the Promo Code
  // input. Fetched once at the page level (not inside PromoCodeSection, which
  // renders twice — mobile + desktop) and passed to both instances. Starts empty
  // so no invalid mock codes ever flash; an empty result simply hides the chips.
  const [promoExamples, setPromoExamples] = useState([]);
  useEffect(() => {
    let active = true;
    fetchCartPromoExamples().then((codes) => {
      if (active) setPromoExamples(codes);
    });
    return () => {
      active = false;
    };
  }, []);

  // Did we land here from a failed checkout stock-check? Read it from the URL
  // directly (window, not useSearchParams) to avoid forcing a Suspense boundary
  // on this page — same pattern as AuthGuard / StoreProvider. A lazy useState
  // initializer (not an effect) keeps the value stable and dodges the
  // set-state-in-effect lint; the banner only renders post-fetch on the client
  // (during SSR/first paint the cart is in its loading state), so there's no
  // hydration-mismatch concern. Used only to tailor the banner copy — the
  // marking below is always-on for logged-in carts.
  const [fromCheckoutStock] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("stock") === "oos"
  );

  // Lines that would fail checkout (out of stock, or qty above what's left).
  // Guest lines carry maxQty: null and never trip this.
  const outOfStockItems = items.filter(stockShort);
  const hasOutOfStock = outOfStockItems.length > 0;

  const handleContinue = () => {
    if (hasOutOfStock) return; // can't proceed while a line would fail checkout
    router.push("/checkout");
  };
  const removeUnavailable = () => {
    outOfStockItems.forEach((it) => removeItem(it));
  };
  const onInc = (it) => updateQty(it, it.qty + 1);
  const onDec = (it) => updateQty(it, Math.max(1, it.qty - 1));
  const onRemove = (it) => removeItem(it);

  if (loading) {
    return (
      <main className="flex flex-1 flex-col bg-white">
        <CartLoading />
      </main>
    );
  }

  // Only show the empty state once we know the cart is genuinely empty (gated on
  // !loading above) so it never flashes during the fetch / login-merge window.
  if (items.length === 0) {
    return (
      <main className="flex flex-1 flex-col bg-white">
        {error ? <CartError message={error} onDismiss={clearError} /> : null}
        <EmptyCart />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col bg-white">
      {error ? <CartError message={error} onDismiss={clearError} /> : null}
      {hasOutOfStock ? (
        <OutOfStockBanner
          count={outOfStockItems.length}
          onRemoveUnavailable={removeUnavailable}
          fromCheckout={fromCheckoutStock}
        />
      ) : null}

      {/* ============== MOBILE LAYOUT ============== */}
      <div className="flex flex-col md:hidden">
        {/* Stepper header — sits below ShopHeader (sticky 56px tall on mobile) */}
        <div
          className="sticky top-14 z-10 flex h-24 flex-col items-start border-b border-[#f5f5f5] p-4"
          style={{
            backgroundColor: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
          }}
        >
          <Stepper />
        </div>

        {totals.freeShippingEnabled ? (
          <div className="px-4 pt-4">
            <FreeShippingBanner
              amountToFreeShipping={totals.amountToFreeShipping}
              freeShippingPct={totals.freeShippingPct}
              variant="mobile"
            />
          </div>
        ) : null}

        <ItemsSection
          items={items}
          onInc={onInc}
          onDec={onDec}
          onRemove={onRemove}
          variant="mobile"
        />

        <PromoCodeSection
          appliedPromo={appliedPromo}
          onApplyCode={applyPromo}
          onClear={clearPromo}
          isGuest={isGuest}
          externalError={promoError}
          variant="mobile"
          suggestedCodes={promoExamples}
          welcomeActive={totals.welcomeDiscount > 0}
        />

        <OrderTotalsBlock totals={totals} appliedPromo={appliedPromo} variant="mobile" />

        <div className="flex flex-col gap-4 px-4 pb-4 pt-4">
          <TrustBadgesRow variant="mobile" />
          <PaymentMethodsRow variant="mobile" />
        </div>

        <SupportCard variant="mobile" />

        <PoliciesFootnote />

        {/* Bottom padding so the sticky CTA doesn't cover content */}
        <div className="h-32" />

        <StickyCheckoutBar
          total={totals.total}
          onContinue={handleContinue}
          isGuest={isGuest}
          blocked={hasOutOfStock}
        />
      </div>

      {/* ============== DESKTOP LAYOUT ============== */}
      <div className="mx-auto hidden w-full max-w-[1440px] flex-col gap-12 px-8 pb-20 pt-12 md:flex">
        <Stepper />

        {/* Below lg (1024px) the two columns stack — the right summary
            drops below the items list. The pinned 426.66px right column
            plus the 901.33px left column only fit cleanly at ~940px+;
            stacking until lg keeps the page responsive all the way down
            to the md (768px) breakpoint without horizontal overflow. */}
        <div className="flex flex-col items-stretch gap-12 lg:flex-row lg:items-start lg:justify-center">
          {/* Left column: cart items */}
          <div className="flex w-full min-w-0 flex-col gap-6 lg:flex-1" style={{ maxWidth: "901.33px" }}>
            {totals.freeShippingEnabled ? (
              <FreeShippingBanner
                amountToFreeShipping={totals.amountToFreeShipping}
                freeShippingPct={totals.freeShippingPct}
                variant="desktop"
              />
            ) : null}
            <ItemsSection
              items={items}
              onInc={onInc}
              onDec={onDec}
              onRemove={onRemove}
              variant="desktop"
            />
          </div>

          {/* Right column: order summary. Full-width below lg (stacked),
              fixed 426.66px at lg+ (side-by-side). */}
          <aside className="flex w-full flex-col gap-8 lg:w-[426.66px] lg:shrink-0">
            <PromoCodeSection
              appliedPromo={appliedPromo}
              onApplyCode={applyPromo}
              onClear={clearPromo}
              isGuest={isGuest}
              externalError={promoError}
              variant="desktop"
              suggestedCodes={promoExamples}
              welcomeActive={totals.welcomeDiscount > 0}
            />
            <OrderTotalsBlock
              totals={totals}
              appliedPromo={appliedPromo}
              variant="desktop"
              onContinue={handleContinue}
              isGuest={isGuest}
              blocked={hasOutOfStock}
            />
            <TrustBadgesRow variant="desktop" />
            <PaymentMethodsRow variant="desktop" />
            <SupportCard variant="desktop" />
          </aside>
        </div>
      </div>
    </main>
  );
}

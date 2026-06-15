"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatJOD } from "@/lib/mockCart";
import { condensed } from "./CartPageClient";
import { useCart } from "@/lib/useCart";
import { useRepairStore, selectPaymentAttempt } from "@/lib/useRepairStore";

// /checkout/failed — Payment-declined screen. Mobile matches Figma
// 111:3587 exactly; desktop matches Figma 119:6627 exactly (two-column
// layout with Payment Error card + items list on the left, Action Card
// + help box on the right — no shipping address on desktop).
//
// Reached when the DEMO payment gateway (DemoPaymentGateway.jsx) reports a
// declined payment — no order was placed, so the cart is intact. The
// transaction id / attempted amount / card last4 / reason come from the
// store's transient `paymentAttempt` (set by the payment page on decline);
// the item list is the live cart. Direct nav (no attempt) falls back to a
// generic message + the current cart. When a real processor lands, this
// payload is swapped for the gateway's rejection details.

const FAIL_RED = "#ff6b6b"; // mobile error accent (Figma 111:4075)
const FAIL_RED_DESKTOP = "#ef4444"; // desktop error accent (Figma 119:6634)
const FAIL_RED_TINT_BG = "rgba(254,242,242,0.3)"; // top section bg
const FAIL_RED_TINT_BORDER = "#fef2f2";
const FAIL_RED_OUTER_BORDER = "#fee2e2";
const FAIL_RED_ICON_TILE = "rgba(239,68,68,0.1)";
const FAIL_RED_ICON_TILE_SOLID = "#fef2f2";

// ──────────────────────────────────────────────────────────────────────
// Inline glyphs.
// ──────────────────────────────────────────────────────────────────────

function XIcon({ size = 70, stroke = "#ffffff" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BangIcon({ size = 18, stroke = "#ffffff" }) {
  // Vertical exclamation glyph (Figma 111:4077 / 119:6650).
  return (
    <svg
      viewBox="0 0 4 18"
      width={size * (4 / 18)}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M2 1.5v8.5" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      <circle cx="2" cy="14.5" r="1.25" fill={stroke} />
    </svg>
  );
}

function CardOutlineIcon({ size = 22, stroke = FAIL_RED_DESKTOP }) {
  // Outlined credit-card glyph used in the desktop Action Card eyebrow
  // tile (Figma 119:6722 — 22.5 x 20 viewBox).
  return (
    <svg
      viewBox="0 0 24 22"
      width={size}
      height={size * (20 / 22)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="2"
        y="3"
        width="20"
        height="16"
        rx="2"
        stroke={stroke}
        strokeWidth="1.8"
      />
      <path d="M2 8h20" stroke={stroke} strokeWidth="1.8" />
      <path d="M6 14h4" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Fail badge — mobile uses the layered-blur disc (Figma 111:3686);
// desktop uses the flat #1a1a1a disc with a 4px red pulse ring
// (Figma 119:6630 / 119:6634).
// ──────────────────────────────────────────────────────────────────────

function FailBadge({ variant }) {
  if (variant === "desktop") {
    return (
      <div
        className="relative grid size-24 place-items-center rounded-full shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]"
        style={{ backgroundColor: "#1a1a1a" }}
      >
        <XIcon size={36} />
        <span
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ border: `4px solid ${FAIL_RED_DESKTOP}`, opacity: 0.2 }}
        />
      </div>
    );
  }
  return (
    <div className="relative size-32">
      <span
        className="pointer-events-none absolute inset-0 rounded-full blur-[20px]"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(25, 33, 38, 0.3) 0%, rgba(25, 33, 38, 0.09) 100%)",
        }}
      />
      <span
        className="pointer-events-none absolute inset-0 rounded-full blur-[12px]"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(26, 33, 38, 0.06) 0%, rgba(26, 33, 38, 0.3) 100%)",
        }}
      />
      <div
        className="relative grid size-32 place-items-center overflow-hidden rounded-full shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)]"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #11191f 0%, rgba(17,25,31,0.8) 100%)",
          border: "4px solid rgba(255,255,255,0.6)",
        }}
      >
        <XIcon size={70} />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// "Payment Declined" heading + subtitle (Figma 111:3689 / 119:6635).
// ──────────────────────────────────────────────────────────────────────

function FailHeading({ variant }) {
  const desktop = variant === "desktop";
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <h1
        className={
          desktop
            ? "font-display text-[36px] font-extrabold leading-10 tracking-[-0.9px] text-[#1a1a1a]"
            : "font-display text-[24px] font-bold leading-9 text-[#11191f]"
        }
      >
        Payment Declined
      </h1>
      <p
        className={
          desktop
            ? "max-w-[512px] text-center font-display text-[18px] leading-7 text-[#6b7280]"
            : "max-w-[331px] px-2 text-center font-body text-[16px] leading-[26px] text-[#6b7280]"
        }
        style={desktop ? undefined : condensed}
      >
        We&apos;re sorry, but your payment could not be processed. Please check
        your payment details and try again.
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Payment Error card — mobile (Figma 111:4067) and desktop (Figma
// 119:6641). Desktop variant splits into a red-tinted top section and a
// white bottom section, with a soft red outer border. Mobile keeps the
// original single-card layout with the red icon tile inside the header.
// ──────────────────────────────────────────────────────────────────────

function MobilePaymentErrorCard({ txnId, amount, last4, reason }) {
  return (
    <div
      className="mx-4 flex flex-col gap-3 overflow-hidden rounded-[4px] bg-white p-4"
      style={{ boxShadow: "0 0 10px 0 rgba(0,0,0,0.15)" }}
    >
      <div className="flex w-full items-start justify-between border-b border-[#e5e7eb] pb-4">
        <div className="flex min-w-0 flex-1 flex-col gap-[6.75px]">
          <h3 className="font-display text-[14px] font-bold leading-5 text-[#1f2937]">
            Payment Error
          </h3>
          <p
            className="font-body text-[14px] leading-normal text-[#6b7280]"
            style={condensed}
          >
            {reason}
          </p>
        </div>
        <div
          className="grid size-10 shrink-0 place-items-center rounded-[4px]"
          style={{
            backgroundColor: FAIL_RED,
            filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.05))",
          }}
        >
          <BangIcon size={18} />
        </div>
      </div>
      <div className="flex w-full flex-col gap-2">
        <MobileErrorRow label="Transaction ID" value={txnId} />
        <MobileErrorRow
          label="Attempted Amount"
          value={formatJOD(amount)}
          accent={FAIL_RED}
          valueLarger
        />
        {last4 ? <MobileErrorRow label="Card Ending" value={`•••• ${last4}`} /> : null}
      </div>
    </div>
  );
}

function MobileErrorRow({ label, value, accent, valueLarger }) {
  return (
    <div className="flex w-full items-center justify-between">
      <span
        className="font-body text-[12px] font-medium leading-4 text-[#6b7280]"
        style={condensed}
      >
        {label}
      </span>
      <span
        className={
          valueLarger
            ? "font-display text-[14px] font-bold leading-5"
            : "font-display text-[12px] font-bold leading-4"
        }
        style={{ color: accent ?? "#1f2937" }}
      >
        {value}
      </span>
    </div>
  );
}

function DesktopPaymentErrorCard({ txnId, amount, last4, reason }) {
  return (
    <div
      className="flex w-full flex-col overflow-hidden rounded-[12px] border bg-white"
      style={{
        borderColor: FAIL_RED_OUTER_BORDER,
        boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)",
      }}
    >
      {/* Top section — red-tinted */}
      <div
        className="flex w-full items-start justify-between border-b px-6 pb-[25px] pt-6"
        style={{
          backgroundColor: FAIL_RED_TINT_BG,
          borderColor: FAIL_RED_TINT_BORDER,
        }}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1 pr-6">
          <h3 className="font-display text-[20px] font-bold leading-7 text-[#1a1a1a]">
            Payment Error
          </h3>
          <p className="font-display text-[14px] leading-5 text-[#6b7280]">
            {reason}
          </p>
        </div>
        <div
          className="grid size-10 shrink-0 place-items-center rounded-[8px]"
          style={{ backgroundColor: FAIL_RED_ICON_TILE }}
        >
          <BangIcon size={18} stroke={FAIL_RED_DESKTOP} />
        </div>
      </div>
      {/* Bottom section — meta rows */}
      <div className="flex w-full flex-col gap-4 bg-white p-6">
        <DesktopErrorRow label="Transaction ID" value={txnId} />
        <DesktopErrorRow
          label="Attempted Amount"
          value={formatJOD(amount)}
          accent={FAIL_RED_DESKTOP}
        />
        {last4 ? (
          <DesktopErrorRow
            label="Card Ending"
            renderValue={() => (
              <span className="flex items-center gap-2">
                <span className="font-display text-[12px] font-bold leading-4 text-[#1a1a1a]">
                  ●●●●
                </span>
                <span className="font-display text-[14px] font-bold leading-5 text-[#1a1a1a]">
                  {last4}
                </span>
              </span>
            )}
          />
        ) : null}
      </div>
    </div>
  );
}

function DesktopErrorRow({ label, value, renderValue, accent }) {
  return (
    <div className="flex w-full items-center justify-between">
      <span className="font-display text-[14px] font-medium leading-5 text-[#6b7280]">
        {label}
      </span>
      {renderValue ? (
        renderValue()
      ) : (
        <span
          className="font-display text-[14px] font-bold leading-5"
          style={{ color: accent ?? "#1a1a1a" }}
        >
          {value}
        </span>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Items list — same row chrome as OrderSuccessClient.
// ──────────────────────────────────────────────────────────────────────

function MobileItemsSection({ items }) {
  return (
    <section className="flex w-full flex-col gap-6 p-4">
      <h2 className="font-display text-[16px] font-semibold leading-6 text-[#11191f]">
        Your Items ({items.length})
      </h2>
      <div className="flex w-full flex-col gap-6">
        {items.map((item) => (
          <div key={item.id} className="flex w-full items-start gap-3">
            <div
              className="relative h-[126px] w-[84px] shrink-0 overflow-hidden"
              style={{ boxShadow: "0 0 10px 0 rgba(0,0,0,0.05)" }}
            >
              <Image
                src={item.image}
                alt={item.name}
                fill
                sizes="84px"
                className="object-cover"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-between self-stretch py-1">
              <div className="flex flex-col gap-1">
                <p className="font-display text-[14px] font-semibold leading-[17.5px] text-[#11191f]">
                  {item.name}
                </p>
                <p
                  className="font-body text-[12px] leading-4 text-[#6b7280]"
                  style={condensed}
                >
                  {item.variantLabel}
                </p>
              </div>
              <p className="font-display text-[14px] font-bold leading-5 text-[#11191f]">
                {formatJOD(item.price * item.qty)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DesktopItemsSection({ items }) {
  return (
    <section className="flex w-full flex-col gap-6">
      <div className="flex w-full items-center gap-2">
        <h2 className="font-display text-[20px] font-bold leading-7 tracking-[-0.5px] text-[#1a1a1a]">
          Your Items
        </h2>
        <span className="font-display text-[16px] leading-6 tracking-[-0.5px] text-[#9ca3af]">
          ({items.length})
        </span>
      </div>
      <div className="flex w-full flex-col gap-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex w-full items-start gap-6 rounded-[8px] border p-4"
            style={{ backgroundColor: "#f9fafb", borderColor: "#f3f4f6" }}
          >
            <div
              className="relative h-32 w-24 shrink-0 overflow-hidden rounded-[4px]"
              style={{ backgroundColor: "#e5e7eb" }}
            >
              <Image
                src={item.image}
                alt={item.name}
                fill
                sizes="96px"
                className="object-cover"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center self-stretch">
              <p className="font-display text-[18px] font-bold leading-7 text-[#1a1a1a]">
                {item.name}
              </p>
              <p className="pt-1 font-display text-[14px] leading-5 text-[#6b7280]">
                {item.variantLabel}
              </p>
              <p className="pt-3 font-display text-[16px] font-bold leading-6 text-[#1a1a1a]">
                {formatJOD(item.price * item.qty)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Mobile action stack (Figma 111:4131) — three CTAs.
// ──────────────────────────────────────────────────────────────────────

function MobileActionStack({ onTryAnother, onRetry, onReturnToCart }) {
  return (
    <div className="mx-4 flex flex-col gap-3">
      <button
        type="button"
        onClick={onTryAnother}
        className="flex h-14 w-full items-center justify-center rounded-[4px] text-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)]"
        style={{ backgroundColor: "#11191f" }}
      >
        <span className="font-display text-[14px] font-bold leading-6 text-white">
          TRY ANOTHER METHOD
        </span>
      </button>
      <button
        type="button"
        onClick={onRetry}
        className="flex h-14 w-full items-center justify-center rounded-[4px] border-2 bg-white shadow-[0_4px_6px_0_rgba(0,0,0,0.1),0_2px_4px_0_rgba(0,0,0,0.1)]"
        style={{ borderColor: "#11191f" }}
      >
        <span className="font-display text-[14px] font-bold leading-6 text-[#11191f]">
          RETRY PAYMENT
        </span>
      </button>
      <button
        type="button"
        onClick={onReturnToCart}
        className="flex h-14 w-full items-center justify-center rounded-[4px]"
        style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.05))" }}
      >
        <span className="font-display text-[14px] font-medium leading-6 text-[#11191f]">
          RETURN TO CART
        </span>
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Desktop Action Card (Figma 119:6713) — eyebrow + heading + red card
// icon tile, attempted-method row, total amount, then 3 CTAs (filled
// dark / light-bordered / underlined text).
// ──────────────────────────────────────────────────────────────────────

function VisaChip() {
  // Mini Visa card chip used inline next to "Visa ending 4532". Matches
  // the Figma 119:6730 SVG (a small credit-card silhouette with the
  // VISA wordmark on top). Inlined to dodge the 7-day asset URL expiry.
  return (
    <span
      className="inline-flex h-[18px] w-[26px] items-center justify-center rounded-[3px]"
      style={{ backgroundColor: "#1a1f71" }}
      aria-hidden
    >
      <span
        className="text-white"
        style={{
          fontFamily: "var(--font-zalando-expanded), sans-serif",
          fontWeight: 800,
          fontStyle: "italic",
          fontSize: "8px",
          letterSpacing: "0.3px",
          lineHeight: 1,
        }}
      >
        VISA
      </span>
    </span>
  );
}

function DesktopActionCard({ brand, last4, amount, onTryAnother, onRetry, onReturnToCart }) {
  return (
    <div
      className="flex w-full flex-col gap-8 overflow-hidden rounded-[12px] border bg-white p-8"
      style={{
        borderColor: "#e5e7eb",
        boxShadow:
          "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
      }}
    >
      {/* Header: eyebrow + heading + red card-icon tile */}
      <div className="flex w-full items-start justify-between border-b border-[#f3f4f6] pb-8">
        <div className="flex flex-col gap-1">
          <p
            className="font-display text-[12px] font-bold uppercase leading-4 tracking-[0.6px]"
            style={{ color: FAIL_RED_DESKTOP }}
          >
            Action Required
          </p>
          <h2 className="font-display text-[24px] font-bold leading-8 tracking-[-0.6px] text-[#1a1a1a]">
            Payment Failed
          </h2>
        </div>
        <div
          className="grid size-12 shrink-0 place-items-center rounded-[8px]"
          style={{ backgroundColor: FAIL_RED_ICON_TILE_SOLID }}
        >
          <CardOutlineIcon size={22} stroke={FAIL_RED_DESKTOP} />
        </div>
      </div>

      {/* Body: attempted method + total amount */}
      <div className="flex w-full flex-col gap-6">
        <div className="flex w-full items-center justify-between">
          <span className="font-display text-[14px] leading-5 text-[#4b5563]">
            Attempted Method
          </span>
          <span className="flex items-center gap-2">
            <VisaChip />
            <span className="font-display text-[16px] font-medium leading-6 text-[#1a1a1a]">
              {brand}{last4 ? ` ending ${last4}` : ""}
            </span>
          </span>
        </div>
        <div className="flex w-full items-center justify-between border-t border-[#f3f4f6] pt-6">
          <span className="font-display text-[18px] leading-7 text-[#4b5563]">
            Total Amount
          </span>
          <span className="font-display text-[24px] font-bold leading-8 text-[#1a1a1a]">
            {formatJOD(amount)}
          </span>
        </div>
      </div>

      {/* CTAs — filled / outlined-light / underlined-text */}
      <div className="flex w-full flex-col gap-3 border-t border-[#f3f4f6] pt-8">
        <button
          type="button"
          onClick={onTryAnother}
          className="flex w-full items-center justify-center rounded-[2px] py-4 text-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)]"
          style={{ backgroundColor: "#111827" }}
        >
          <span className="font-display text-[16px] font-bold uppercase leading-6 tracking-[0.8px]">
            Try Another Method
          </span>
        </button>
        <button
          type="button"
          onClick={onRetry}
          className="flex w-full items-center justify-center rounded-[2px] border bg-white py-[17px]"
          style={{ borderColor: "#d1d5db" }}
        >
          <span className="font-display text-[16px] font-bold uppercase leading-6 tracking-[0.8px] text-[#1a1a1a]">
            Retry Payment
          </span>
        </button>
        <button
          type="button"
          onClick={onReturnToCart}
          className="flex w-full items-center justify-center py-2"
        >
          <span
            className="font-display text-[14px] font-medium leading-5 underline"
            style={{ color: "#666666", textDecorationColor: "#d1d5db" }}
          >
            Return to Cart
          </span>
        </button>
      </div>
    </div>
  );
}

// Desktop help box (Figma 119:6745) — "Think this is a mistake?"
// centered above two pipe-separated links.
function DesktopHelpBox() {
  return (
    <div
      className="flex w-full flex-col items-center gap-3 rounded-[8px] border px-6 py-6 text-center"
      style={{ backgroundColor: "#f9fafb", borderColor: "#e5e7eb" }}
    >
      <p className="font-display text-[14px] leading-5 text-[#6b7280]">
        Think this is a mistake?
      </p>
      <div className="flex items-center gap-3">
        <a
          href="/contact"
          className="font-display text-[14px] font-bold leading-5 text-[#111827] hover:underline"
        >
          Contact Bank Support
        </a>
        <span aria-hidden className="font-display text-[16px] leading-6 text-[#9ca3af]">
          |
        </span>
        <a
          href="/contact"
          className="font-display text-[14px] font-bold leading-5 text-[#111827] hover:underline"
        >
          Chat with Us
        </a>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Main client component.
// ──────────────────────────────────────────────────────────────────────

export default function OrderFailedClient() {
  const router = useRouter();
  const attempt = useRepairStore(selectPaymentAttempt);
  const { items } = useCart(); // order wasn't placed → cart is intact

  // Declined-attempt details from the demo gateway; sensible fallbacks for a
  // direct visit (no attempt in the store).
  const txnId = attempt?.txnId ?? "—";
  const amount = Number(attempt?.amount ?? 0);
  const last4 = attempt?.last4 ?? null;
  const brand = attempt?.brand || attempt?.methodLabel || "Card";
  const reason =
    attempt?.reason ||
    "Your payment could not be processed. Please check your payment details and try again.";

  const handleTryAnother = () => router.push("/checkout/payment");
  const handleRetry = () => router.push("/checkout/payment");
  const handleReturnToCart = () => router.push("/cart");

  return (
    <main className="flex flex-1 flex-col bg-white">
      {/* ============== MOBILE LAYOUT ============== */}
      <div className="flex flex-col md:hidden">
        <div className="flex w-full flex-col items-center gap-6 px-4 pt-8">
          <FailBadge variant="mobile" />
          <FailHeading variant="mobile" />
        </div>

        <div className="pt-8">
          <MobilePaymentErrorCard txnId={txnId} amount={amount} last4={last4} reason={reason} />
        </div>

        <MobileItemsSection items={items} />

        <div className="pt-2 pb-8">
          <MobileActionStack
            onTryAnother={handleTryAnother}
            onRetry={handleRetry}
            onReturnToCart={handleReturnToCart}
          />
        </div>
      </div>

      {/* ============== DESKTOP LAYOUT ============== */}
      <div className="mx-auto hidden w-full max-w-[1440px] flex-col gap-16 px-8 pb-20 pt-16 md:flex">
        <div className="flex w-full flex-col items-center gap-8">
          <FailBadge variant="desktop" />
          <FailHeading variant="desktop" />
        </div>

        <div className="flex w-full flex-col items-stretch gap-12 lg:flex-row lg:items-start lg:justify-center">
          {/* Left column: payment-error card + items list */}
          <div
            className="flex w-full min-w-0 flex-col gap-10 lg:flex-1"
            style={{ maxWidth: "577.33px" }}
          >
            <DesktopPaymentErrorCard txnId={txnId} amount={amount} last4={last4} reason={reason} />
            <DesktopItemsSection items={items} />
          </div>

          {/* Right column: action card + help box */}
          <aside className="flex w-full flex-col gap-8 lg:w-[398.66px] lg:shrink-0">
            <DesktopActionCard
              brand={brand}
              last4={last4}
              amount={amount}
              onTryAnother={handleTryAnother}
              onRetry={handleRetry}
              onReturnToCart={handleReturnToCart}
            />
            <DesktopHelpBox />
          </aside>
        </div>
      </div>
    </main>
  );
}

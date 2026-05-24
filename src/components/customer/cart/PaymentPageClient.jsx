"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  CART_ITEMS,
  CHECKOUT_ADDRESSES,
  DEFAULT_PAYMENT_METHOD_ID,
  PAYMENT_METHODS,
  PROMO_CODES,
  buildAddressLine,
  calcTotals,
  formatJOD,
} from "@/lib/mockCart";
import {
  Icon,
  PaymentMethodsRow,
  PoliciesFootnote,
  PromoCodeSection,
  Stepper,
  StickyCheckoutBar,
  SupportCard,
  TrustBadgesRow,
  condensed,
} from "./CartPageClient";
import AddCardDrawer from "@/components/customer/account/AddCardDrawer";
import AddAddressDrawer from "@/components/customer/account/AddAddressDrawer";

// /checkout/payment — Payment step (step 3 of cart → details → payment).
// Matches Figma mobile 84:6733 + desktop 119:5877.
//
// Most chrome is reused from `CartPageClient.jsx`: Stepper, PromoCodeSection,
// TrustBadgesRow, PaymentMethodsRow, SupportCard, PoliciesFootnote, and
// StickyCheckoutBar. New sections unique to this step:
//   - PaymentMethodSection (radio list of saved cards + Apple Pay + Google
//     Pay + Cash on Delivery + an "ADD NEW CARD" button)
//   - ShippingAddressDisplay (read-only address card with Edit link)
//   - TermsCheckbox (T&C agreement, gates the place-order CTA)
//   - PaymentOrderSummaryCard (desktop right column composite — mini items,
//     totals, T&C, "CONFIRM & PAY" CTA, policy line, secure pill)
//
// The Add-New-Card sheet/modal isn't in scope (no Figma for it yet) — the
// button is a no-op placeholder. Same for the place-order action: it just
// alerts a success placeholder until the `myAppCheckout` mutation is wired.

const DEFAULT_APPLIED_PROMO = PROMO_CODES.SUMMER25;

// ──────────────────────────────────────────────────────────────────────
// Small inline glyphs — same rationale as CheckoutDetailsClient.jsx
// (avoid Figma 7-day asset URL expiry; keep <16-line SVGs co-located
// with the components that use them).
// ──────────────────────────────────────────────────────────────────────

function EditPencilIcon({ className = "size-2.5", style }) {
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
        d="M8.5 1.5L10.5 3.5L4 10L1 11L2 8L8.5 1.5Z"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HomeFillIcon({ className = "size-5", style }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
      style={style}
    >
      <path d="M17.4 7.61L11.5 2.92a2.39 2.39 0 0 0-3 0L2.6 7.61A2.7 2.7 0 0 0 1.6 9.7v6.74A2.06 2.06 0 0 0 3.66 18.5h2.18a1 1 0 0 0 1-1v-3.95a1.16 1.16 0 0 1 1.16-1.16h3.99a1.16 1.16 0 0 1 1.16 1.16v3.95a1 1 0 0 0 1 1h2.18a2.06 2.06 0 0 0 2.07-2.06V9.7a2.7 2.7 0 0 0-1-2.09Z" />
    </svg>
  );
}


// ──────────────────────────────────────────────────────────────────────
// Radio dot (mirrors the one in CheckoutDetailsClient — kept inline so
// the file is self-contained; both pages render the same visual).
// ──────────────────────────────────────────────────────────────────────

function RadioDot({ selected }) {
  if (selected) {
    return (
      <span
        className="grid size-5 shrink-0 place-items-center rounded-full border"
        style={{ backgroundColor: "#11191f", borderColor: "#11191f" }}
      >
        <span className="size-2 rounded-full bg-white" />
      </span>
    );
  }
  return (
    <span
      className="grid size-5 shrink-0 place-items-center rounded-full border"
      style={{ borderColor: "#d1d5db" }}
    >
      <span className="size-2 rounded-full" />
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Brand tiles — inline SVGs sized to fit the 40x40 outer tile, matching
// Figma mobile 84:7671 / desktop 119:5919:
//   - Visa: light grey 40x40 with an inner dark mini-card holding the
//     "VISA" wordmark in white (looks like a credit card).
//   - Mastercard: light grey 40x40 with the two overlapping circles
//     (red + orange, lens-shaped overlap drawn explicitly). No wordmark.
//   - Apple Pay: BLACK 40x40 tile with white Apple silhouette only —
//     no "Pay" text.
//   - Google Pay: light grey 40x40 with the multicolor Google "G" only.
//   - Cash on Delivery: light grey 40x40 with a green dollar-bill icon.
// Inline so they survive Figma's 7-day asset URL expiry — same rationale
// as `customer/account/AccountIcons.jsx`.

const TILE_BASE = "grid size-10 shrink-0 place-items-center";

function VisaTile() {
  return (
    <div className={TILE_BASE} style={{ backgroundColor: "#f3f4f6", borderRadius: 8 }}>
      <div
        className="flex h-[18px] w-7 items-center justify-center"
        style={{ backgroundColor: "#11191f", borderRadius: 2 }}
      >
        <span
          className="text-white"
          style={{
            fontFamily: "var(--font-zalando-expanded), sans-serif",
            fontWeight: 800,
            fontStyle: "italic",
            fontSize: "9px",
            letterSpacing: "0.3px",
            lineHeight: 1,
          }}
        >
          VISA
        </span>
      </div>
    </div>
  );
}

function MastercardTile() {
  return (
    <div className={TILE_BASE} style={{ backgroundColor: "#f3f4f6", borderRadius: 8 }}>
      <svg
        viewBox="0 0 32 20"
        width="28"
        height="18"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <circle cx="12" cy="10" r="8" fill="#EB001B" />
        <circle cx="20" cy="10" r="8" fill="#F79E1B" />
        {/* Lens-shaped overlap drawn on top so the overlap reads orange. */}
        <path
          d="M16 4.2 A8 8 0 0 1 16 15.8 A8 8 0 0 1 16 4.2 Z"
          fill="#FF5F00"
        />
      </svg>
    </div>
  );
}

function ApplePayTile() {
  return (
    <div className={TILE_BASE} style={{ backgroundColor: "#11191f", borderRadius: 8 }}>
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        fill="#ffffff"
      >
        <path d="M17.05 12.04c-.02-2.54 2.07-3.77 2.17-3.83-1.18-1.73-3.02-1.97-3.67-1.99-1.56-.16-3.04.92-3.83.92-.79 0-2.01-.9-3.31-.87-1.7.02-3.28.99-4.15 2.51-1.77 3.06-.45 7.59 1.27 10.08.84 1.22 1.83 2.59 3.13 2.54 1.27-.05 1.74-.82 3.27-.82 1.53 0 1.95.82 3.28.79 1.36-.02 2.21-1.23 3.04-2.46.96-1.42 1.36-2.79 1.38-2.86-.03-.01-2.64-1.01-2.67-4.01zm-2.5-7.36c.71-.86 1.18-2.05 1.05-3.24-1.02.04-2.25.68-2.98 1.54-.65.76-1.22 1.97-1.06 3.13 1.13.09 2.28-.58 2.99-1.43z" />
      </svg>
    </div>
  );
}

function GooglePayTile() {
  return (
    <div className={TILE_BASE} style={{ backgroundColor: "#f3f4f6", borderRadius: 8 }}>
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          fill="#4285F4"
          d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.16c-.27 1.46-1.13 2.7-2.4 3.51v2.92h3.88c2.27-2.09 3.85-5.17 3.85-8.67z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.97-1.07 7.96-2.91l-3.88-3.01c-1.08.72-2.46 1.16-4.08 1.16-3.13 0-5.79-2.11-6.74-4.96H1.27v3.11C3.25 21.3 7.31 24 12 24z"
        />
        <path
          fill="#FBBC05"
          d="M5.26 14.29c-.25-.72-.39-1.49-.39-2.29 0-.8.14-1.57.39-2.29V6.6H1.27C.46 8.2 0 10.05 0 12c0 1.95.46 3.8 1.27 5.4l3.99-3.11z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.96 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.6l3.99 3.11c.95-2.85 3.61-4.96 6.74-4.96z"
        />
      </svg>
    </div>
  );
}

function CashOnDeliveryTile() {
  // Stylized banknote — green rectangle with a lighter green inner oval
  // and "$" glyph to read as cash. Approximation of Figma's COD icon.
  return (
    <div className={TILE_BASE} style={{ backgroundColor: "#f3f4f6", borderRadius: 8 }}>
      <svg
        viewBox="0 0 28 20"
        width="24"
        height="18"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <rect x="1" y="3" width="26" height="14" rx="2" fill="#16a34a" />
        <ellipse cx="14" cy="10" rx="6" ry="4" fill="#bbf7d0" />
        <text
          x="14"
          y="12.5"
          textAnchor="middle"
          fontSize="6"
          fontWeight="700"
          fill="#16a34a"
          fontFamily="system-ui, sans-serif"
        >
          $
        </text>
        <circle cx="4" cy="6" r="0.8" fill="#bbf7d0" />
        <circle cx="24" cy="14" r="0.8" fill="#bbf7d0" />
      </svg>
    </div>
  );
}

function PaymentMethodTile({ method }) {
  if (method.kind === "card" && method.brand === "visa") return <VisaTile />;
  if (method.kind === "card" && method.brand === "mastercard") return <MastercardTile />;
  if (method.kind === "applepay") return <ApplePayTile />;
  if (method.kind === "gpay") return <GooglePayTile />;
  return <CashOnDeliveryTile />;
}

function paymentMethodLabels(method) {
  if (method.kind === "card") {
    const brandName =
      { visa: "Visa", mastercard: "Mastercard", amex: "Amex", discover: "Discover" }[method.brand] ??
      method.brand;
    return {
      title: `${brandName} ending in ${method.last4}`,
      subtitle: `Expires ${method.expiry}`,
    };
  }
  if (method.kind === "applepay") return { title: "Apple Pay", subtitle: "Quick Payment" };
  if (method.kind === "gpay") return { title: "Google Pay", subtitle: "Quick Payment" };
  return { title: "Cash on Delivery", subtitle: "Pay when you receive" };
}

// ──────────────────────────────────────────────────────────────────────
// Payment Method section — heading + radio list + ADD NEW CARD button.
// Mobile (Figma 84:7671) and desktop (Figma 119:5919) use the same row
// shape; only the heading sizing changes by breakpoint. Selected card =
// 2px dark border + soft shadow + #f9fafb bg (mobile), 1px dark border
// (desktop). Unselected = 1px #e5e7eb border, transparent bg.
// ──────────────────────────────────────────────────────────────────────

function PaymentMethodRow({ method, selected, onSelect, variant }) {
  const desktop = variant === "desktop";
  const labels = paymentMethodLabels(method);
  const borderWidth = desktop ? 1 : selected ? 2 : 1;
  const padding = desktop ? 18 : selected ? 16 : 17;
  return (
    <button
      type="button"
      onClick={() => onSelect(method.id)}
      className="flex w-full items-center justify-between"
      style={{
        padding: `${padding}px`,
        backgroundColor: selected ? "#f9fafb" : "#ffffff",
        borderRadius: desktop ? 8 : 4,
        border: `${borderWidth}px solid ${selected ? "#11191f" : "#e5e7eb"}`,
        boxShadow: selected ? "0 1px 2px 0 rgba(0,0,0,0.05)" : "none",
      }}
    >
      <div className="flex items-center gap-4">
        <PaymentMethodTile method={method} />
        <div className="flex flex-col items-start text-left">
          <span
            className={`font-display text-[14px] leading-5 text-[#11191f] ${
              selected ? "font-bold" : "font-semibold"
            }`}
          >
            {labels.title}
          </span>
          <span
            className="pt-0.5 font-body text-[12px] leading-4 text-[#6b7280]"
            style={condensed}
          >
            {labels.subtitle}
          </span>
        </div>
      </div>
      <RadioDot selected={selected} />
    </button>
  );
}

function PaymentMethodSection({ methods, selectedId, onSelect, onAddCard, variant }) {
  const desktop = variant === "desktop";
  return (
    <section
      className={
        desktop
          ? "flex w-full flex-col gap-6"
          : "flex w-full flex-col gap-4 px-4"
      }
    >
      <h2
        className={
          desktop
            ? "font-display text-[20px] font-bold leading-7 tracking-[-0.5px] text-[#11191f]"
            : "font-display text-[16px] font-semibold leading-6 text-[#11191f]"
        }
      >
        Payment Method
      </h2>
      <div className="flex w-full flex-col gap-4">
        {methods.map((m) => (
          <PaymentMethodRow
            key={m.id}
            method={m}
            selected={m.id === selectedId}
            onSelect={onSelect}
            variant={variant}
          />
        ))}
      </div>
      {/* "ADD NEW CARD" muted button — opens AddCardDrawer from the account
          surface (Figma mobile 79:3149). Same drawer used on /account. */}
      <button
        type="button"
        onClick={onAddCard}
        className="flex w-full items-center justify-center rounded-[4px] px-[16.5px] pb-[16.5px] pt-[14.5px]"
        style={{
          backgroundColor: "#f0f1f3",
          border: "0.5px solid rgba(0,0,0,0.1)",
        }}
      >
        <span className="font-display text-[12px] font-medium leading-normal text-[#11191f]">
          ADD NEW CARD
        </span>
      </button>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Shipping Address Display — read-only card. The address selection was
// already made on the Details step; on Payment we just show the chosen
// shipping address with an Edit affordance (which would route back to
// /checkout when wired). Mobile Figma 84:7725, desktop Figma 126:5481.
// ──────────────────────────────────────────────────────────────────────

function ShippingAddressDisplay({ address, onEdit, variant }) {
  const desktop = variant === "desktop";
  if (!address) return null;
  return (
    <section
      className={
        desktop
          ? "flex w-full flex-col gap-4"
          : "flex w-full flex-col gap-4 px-4"
      }
    >
      <div className="flex w-full items-center justify-between">
        <h2
          className={
            desktop
              ? "font-display text-[20px] font-bold leading-7 tracking-[-0.5px] text-[#11191f]"
              : "font-display text-[16px] font-semibold leading-6 text-[#11191f]"
          }
        >
          Shipping Address
        </h2>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1 text-[#6b7280] hover:text-[#11191f]"
        >
          <EditPencilIcon className="size-2.5" />
          <span className="font-body text-[12px] font-medium leading-4" style={condensed}>
            Edit
          </span>
        </button>
      </div>
      <div
        className="flex w-full flex-col gap-2 bg-white p-4"
        style={{
          borderRadius: desktop ? 6 : 4,
          border: desktop ? "1px solid rgba(17,25,31,0.1)" : undefined,
          filter: desktop ? undefined : "drop-shadow(0 0 5px rgba(0,0,0,0.15))",
        }}
      >
        <div className="flex w-full items-center gap-3">
          <div className="relative inline-grid place-items-start">
            <div
              className="col-start-1 row-start-1 size-8 rounded-[4px]"
              style={{ backgroundColor: "#f0f0f0" }}
            />
            <div className="col-start-1 row-start-1 ml-[6px] mt-[6px] text-[#11191f]">
              <HomeFillIcon className="size-5" />
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <p
              className="font-body text-[12px] font-medium leading-normal text-[#11191f]"
              style={condensed}
            >
              {address.label}{" "}
              {address.isDefault ? (
                <span
                  className="text-[10px] font-normal"
                  style={{ ...condensed, color: "rgba(17,25,31,0.3)" }}
                >
                  (Default)
                </span>
              ) : null}
            </p>
          </div>
        </div>
        <div
          className="flex w-full flex-col gap-1 font-body text-[10px] leading-normal"
          style={{ ...condensed, color: "rgba(17,25,31,0.5)" }}
        >
          <p>{address.line}</p>
          <p>{address.phone}</p>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Terms checkbox — agreement with links to T&C / Privacy. Mobile Figma
// 84:7781 wraps the row inside a #fafafa pill; desktop Figma 119:6008
// is plain (no background). Both have a 16-20px checkbox + condensed
// label with two underlined Bold links.
// ──────────────────────────────────────────────────────────────────────

function TermsCheckbox({ checked, onChange, variant }) {
  const desktop = variant === "desktop";
  return (
    <label
      className={
        desktop
          ? "flex w-full cursor-pointer items-start gap-3"
          : "mx-4 flex w-full max-w-[calc(100%-2rem)] cursor-pointer items-start gap-3 rounded-[4px] p-4"
      }
      style={
        desktop
          ? undefined
          : { backgroundColor: "#fafafa", border: "1px solid #e5e7eb" }
      }
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        className={`${desktop ? "size-4 rounded-[2px]" : "size-5 rounded-[4px]"} grid shrink-0 place-items-center border bg-white`}
        style={{ borderColor: checked ? "#11191f" : "#767676" }}
      >
        {checked ? (
          <span
            className={`${desktop ? "h-[6px] w-[3px]" : "h-[8px] w-[4px]"} -translate-y-[1px] rotate-45 border-b-[1.5px] border-r-[1.5px]`}
            style={{ borderColor: "#11191f" }}
          />
        ) : null}
      </span>
      <span
        className={
          desktop
            ? "font-display text-[14px] leading-5 text-[#4b5563]"
            : "font-body text-[12px] leading-[19.5px] text-[#525252]"
        }
        style={desktop ? undefined : condensed}
      >
        I agree to the{" "}
        <a href="/#terms" className="font-bold text-[#11191f] underline">
          Terms &amp; Conditions
        </a>{" "}
        and{" "}
        <a href="/#privacy" className="font-bold text-[#11191f] underline">
          Privacy Policy
        </a>
        . I understand that my order is final and non-refundable once placed.
      </span>
    </label>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Mobile-only inline Order Total card (same shape as the cart-page
// OrderTotalsBlock mobile variant). Kept local so this page doesn't
// depend on a specific cart-page export name; the rows + discount pill
// + bordered total row mirror Figma 84:8019.
// ──────────────────────────────────────────────────────────────────────

function MobileOrderTotalCard({ totals, appliedPromo }) {
  const { subtotal, discount, shipping, tax, total, itemCount } = totals;
  return (
    <div
      className="inline-flex w-full flex-col items-start gap-4 p-4 outline outline-1"
      style={{ backgroundColor: "#f9fafb", outlineColor: "#f3f4f6", outlineOffset: "-1px" }}
    >
      <h2 className="font-display text-[14px] font-semibold uppercase leading-5 tracking-tight text-[#11191f]">
        Order Total
      </h2>
      <div className="flex w-full flex-col items-center gap-3">
        <MobileRow label={`Subtotal (${itemCount} items)`} value={formatJOD(subtotal)} />
        <MobileRow
          label="Shipping"
          value={shipping === 0 ? "Free" : formatJOD(shipping)}
          valueAccent={shipping === 0 ? "#16a34a" : undefined}
        />
        <MobileRow label="Tax (Estimated)" value={formatJOD(tax)} />
        {discount > 0 ? (
          <div
            className="flex w-full items-center justify-between rounded-[8px] px-2 py-1"
            style={{ backgroundColor: "#f0fdf4" }}
          >
            <span
              className="flex items-center gap-1.5 font-display font-medium leading-5"
              style={{ color: "#15803d" }}
            >
              <Icon name="check" className="h-3 w-2.5" />
              <span className="text-[12px]">Discount ({appliedPromo?.code})</span>
            </span>
            <span
              className="font-display text-[12px] font-bold leading-5"
              style={{ color: "#15803d" }}
            >
              -JOD{discount.toFixed(2)}
            </span>
          </div>
        ) : null}
      </div>
      <div className="flex w-full flex-col items-start border-t border-[#e5e7eb] pt-4">
        <div className="inline-flex w-full items-start justify-between">
          <span className="font-display text-[16px] font-bold leading-6 text-[#11191f]">Total</span>
          <span className="font-display text-right text-[20px] font-bold leading-8 text-[#11191f]">
            {formatJOD(total)}
          </span>
        </div>
      </div>
    </div>
  );
}

function MobileRow({ label, value, valueAccent }) {
  return (
    <div className="flex w-full items-center justify-between">
      <span className="font-body text-[14px] leading-5 text-[#4b5563]" style={condensed}>
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

// ──────────────────────────────────────────────────────────────────────
// Desktop right-column composite — same shape as the details page card
// but with an embedded T&C checkbox above the CTA and "Confirm & Pay"
// as the CTA copy.
// ──────────────────────────────────────────────────────────────────────

function MiniItem({ item }) {
  return (
    <div className="flex w-full items-start gap-4">
      <div className="relative h-24 w-16 shrink-0 overflow-hidden bg-[#f3f4f6] shadow-[0_0_12.348px_0_rgba(0,0,0,0.05)]">
        <Image src={item.image} alt={item.name} fill sizes="64px" className="object-cover" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <h4 className="font-display text-[14px] font-bold leading-5 text-[#11191f]">
          {item.name}
        </h4>
        <p className="font-body text-[12px] leading-4 text-[#6b7280]" style={condensed}>
          {item.variantLabel}
        </p>
        <p className="pt-1 font-display text-[12px] font-medium leading-4 text-[#11191f]">
          {formatJOD(item.price * item.qty)}
        </p>
      </div>
    </div>
  );
}

function DesktopRow({ label, value, valueAccent }) {
  return (
    <div className="flex w-full items-center justify-between">
      <span className="font-display text-[14px] leading-5 text-[#4b5563]">{label}</span>
      <span
        className="font-display text-[14px] font-medium leading-5"
        style={{ color: valueAccent ?? "#11191f" }}
      >
        {value}
      </span>
    </div>
  );
}

function PaymentOrderSummaryCard({
  items,
  totals,
  appliedPromo,
  termsAccepted,
  onToggleTerms,
  onPlaceOrder,
}) {
  const { subtotal, discount, shipping, tax, total, itemCount } = totals;
  return (
    <div className="flex w-full flex-col gap-4 rounded-lg border border-[#f3f4f6] bg-[#f9fafb] p-6">
      <h3 className="w-full border-b border-[#e5e7eb] pb-4 font-display text-[16px] font-bold uppercase leading-6 tracking-[0.4px] text-[#11191f]">
        Order Summary
      </h3>

      <div className="flex w-full flex-col gap-4">
        {items.map((it) => (
          <MiniItem key={it.id} item={it} />
        ))}
      </div>

      <h4 className="pt-2 font-display text-[16px] font-bold uppercase leading-6 tracking-[0.4px] text-[#11191f]">
        Order Total
      </h4>

      <div className="flex flex-col gap-4 border-b border-[#e5e7eb] pb-[25px]">
        <DesktopRow label={`Subtotal (${itemCount} items)`} value={formatJOD(subtotal)} />
        <DesktopRow
          label="Shipping"
          value={shipping === 0 ? "Free" : formatJOD(shipping)}
          valueAccent={shipping === 0 ? "#16a34a" : undefined}
        />
        <DesktopRow label="Tax (Estimated)" value={formatJOD(tax)} />
        {discount > 0 ? (
          <div
            className="flex w-full items-center justify-between rounded-[4px] p-2"
            style={{ backgroundColor: "#f0fdf4" }}
          >
            <span
              className="flex items-center gap-2 font-display text-[14px] font-medium leading-5"
              style={{ color: "#16a34a" }}
            >
              <Icon name="check-success" className="h-3 w-[10.5px]" />
              <span>Discount ({appliedPromo?.code})</span>
            </span>
            <span
              className="font-display text-[14px] font-medium leading-5"
              style={{ color: "#16a34a" }}
            >
              -{formatJOD(discount)}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex w-full items-center justify-between">
        <span className="font-display text-[18px] font-bold leading-7 text-[#11191f]">Total</span>
        <span className="font-display text-[20px] font-bold leading-8 text-[#11191f]">
          {formatJOD(total)}
        </span>
      </div>

      <TermsCheckbox checked={termsAccepted} onChange={onToggleTerms} variant="desktop" />

      <button
        type="button"
        onClick={onPlaceOrder}
        disabled={!termsAccepted}
        className="mt-2 flex h-14 w-full items-center justify-center rounded-[4px] text-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.10),0_4px_6px_-4px_rgba(0,0,0,0.10)] disabled:cursor-not-allowed"
        style={{
          backgroundColor: termsAccepted ? "#11191f" : "rgba(17,25,31,0.5)",
        }}
      >
        <span className="font-display text-[14px] font-bold uppercase leading-6 tracking-[0.8px]">
          Confirm &amp; Pay
        </span>
      </button>

      <p
        className="text-center font-body text-[10px] leading-[15px] text-[#9ca3af]"
        style={condensed}
      >
        By proceeding to payment, you agree to our{" "}
        <a href="/#terms" className="underline">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="/#privacy" className="underline">
          Privacy Policy
        </a>
        .
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
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Main client component.
// ──────────────────────────────────────────────────────────────────────

export default function PaymentPageClient() {
  const router = useRouter();
  const [items] = useState(CART_ITEMS);
  const [appliedPromo, setAppliedPromo] = useState(DEFAULT_APPLIED_PROMO);
  const [paymentMethods, setPaymentMethods] = useState(PAYMENT_METHODS);
  const [selectedPaymentId, setSelectedPaymentId] = useState(DEFAULT_PAYMENT_METHOD_ID);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [shippingAddress, setShippingAddress] = useState(
    CHECKOUT_ADDRESSES.find((a) => a.isDefault) ?? CHECKOUT_ADDRESSES[0],
  );
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [editAddressOpen, setEditAddressOpen] = useState(false);

  const totals = useMemo(() => calcTotals(items, appliedPromo), [items, appliedPromo]);

  // AddCardDrawer.onSubmit yields `{ brand, last4, expiry, holder }`. Append
  // it as a `kind: "card"` row and auto-select it so the new card is the
  // active payment method.
  const handleAddCard = (card) => {
    const id = `pm-new-${Date.now()}`;
    const row = {
      id,
      kind: "card",
      brand: (card.brand || "visa").toLowerCase(),
      last4: card.last4,
      expiry: card.expiry,
    };
    setPaymentMethods((prev) => [...prev, row]);
    setSelectedPaymentId(id);
  };

  // AddAddressDrawer.onSubmit yields the structured fields. Rebuild the
  // flat display `line` so the read-only card downstream renders it.
  const handleSaveAddress = (next) => {
    setShippingAddress((prev) => ({
      ...prev,
      ...next,
      line: buildAddressLine(next),
    }));
  };

  const handlePlaceOrder = () => {
    if (!termsAccepted) {
      if (typeof window !== "undefined") {
        window.alert("Please accept the Terms & Conditions to place your order.");
      }
      return;
    }
    // Placeholder until `myAppCheckout` is wired through. The success
    // screen reads its order metadata from `mockCart.js` so the numbers
    // line up with what was just rendered here.
    router.push("/checkout/success");
  };

  return (
    <main className="flex flex-1 flex-col bg-white">
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
          <Stepper activeStep="payment" />
        </div>

        <div className="py-4">
          <PaymentMethodSection
            methods={paymentMethods}
            selectedId={selectedPaymentId}
            onSelect={setSelectedPaymentId}
            onAddCard={() => setAddCardOpen(true)}
            variant="mobile"
          />
        </div>

        <div className="mx-4 h-px bg-[#f3f4f6]" />

        <div className="py-4">
          <ShippingAddressDisplay
            address={shippingAddress}
            onEdit={() => setEditAddressOpen(true)}
            variant="mobile"
          />
        </div>

        <div className="mx-4 h-px bg-[#f3f4f6]" />

        <PromoCodeSection
          appliedPromo={appliedPromo}
          onApply={setAppliedPromo}
          onClear={() => setAppliedPromo(null)}
          variant="mobile"
        />

        <div className="mx-4 h-px bg-[#f3f4f6]" />

        <MobileOrderTotalCard totals={totals} appliedPromo={appliedPromo} />

        <div className="py-4">
          <TermsCheckbox
            checked={termsAccepted}
            onChange={() => setTermsAccepted((v) => !v)}
            variant="mobile"
          />
        </div>

        <div className="flex flex-col gap-4 px-4 pb-4 pt-2">
          <TrustBadgesRow variant="mobile" />
          <PaymentMethodsRow variant="mobile" />
        </div>

        <SupportCard variant="mobile" />

        <PoliciesFootnote />

        {/* Bottom padding so the sticky CTA doesn't cover content */}
        <div className="h-32" />

        <StickyCheckoutBar
          total={totals.total}
          onContinue={handlePlaceOrder}
          ctaText="PAY & CONFIRM ORDER"
        />
      </div>

      {/* ============== DESKTOP LAYOUT ============== */}
      <div className="mx-auto hidden w-full max-w-[1440px] flex-col gap-12 px-8 pb-20 pt-12 md:flex">
        <Stepper activeStep="payment" />

        <div className="flex flex-col items-stretch gap-12 lg:flex-row lg:items-start lg:justify-center">
          {/* Left column: payment methods + shipping address display */}
          <div
            className="flex w-full min-w-0 flex-col gap-8 lg:flex-1"
            style={{ maxWidth: "901.33px" }}
          >
            <PaymentMethodSection
              methods={paymentMethods}
              selectedId={selectedPaymentId}
              onSelect={setSelectedPaymentId}
              onAddCard={() => setAddCardOpen(true)}
              variant="desktop"
            />
            <ShippingAddressDisplay
              address={shippingAddress}
              onEdit={() => setEditAddressOpen(true)}
              variant="desktop"
            />
          </div>

          {/* Right column: promo, order summary card (with embedded T&C +
              CONFIRM & PAY CTA), trust + payments + support */}
          <aside className="flex w-full flex-col gap-6 lg:w-[426.66px] lg:shrink-0">
            <PromoCodeSection
              appliedPromo={appliedPromo}
              onApply={setAppliedPromo}
              onClear={() => setAppliedPromo(null)}
              variant="desktop"
            />
            <PaymentOrderSummaryCard
              items={items}
              totals={totals}
              appliedPromo={appliedPromo}
              termsAccepted={termsAccepted}
              onToggleTerms={() => setTermsAccepted((v) => !v)}
              onPlaceOrder={handlePlaceOrder}
            />
            <TrustBadgesRow variant="desktop" />
            <PaymentMethodsRow variant="desktop" />
            <SupportCard variant="desktop" />
          </aside>
        </div>
      </div>

      {/* Drawers — same components used from /account so the visual
          language and animation stay consistent across the app. */}
      <AddCardDrawer
        open={addCardOpen}
        onClose={() => setAddCardOpen(false)}
        onSubmit={handleAddCard}
      />
      <AddAddressDrawer
        open={editAddressOpen}
        onClose={() => setEditAddressOpen(false)}
        onSubmit={handleSaveAddress}
        initial={shippingAddress}
      />
    </main>
  );
}

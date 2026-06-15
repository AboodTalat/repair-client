"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { formatJOD } from "@/lib/mockCart";
import {
  BackStepLink,
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
import { useCart } from "@/lib/useCart";
import { useAddresses } from "@/lib/useAddresses";
import { useCommerceSettings } from "@/lib/useCommerceSettings";
import DemoPaymentGateway from "./DemoPaymentGateway";
import AddCardDrawer from "@/components/customer/account/AddCardDrawer";
import { fetchCartPromoExamples } from "@/lib/promo";
import { repairCall } from "@/lib/repairAuthedApi";
import {
  useRepairStore,
  selectIsLoggedIn,
  selectCheckoutInfo,
  selectPaymentCards,
} from "@/lib/useRepairStore";

// /checkout/payment — Payment step (step 3 of cart → details → payment).
// Matches Figma mobile 84:6733 + desktop 119:5877.
//
// Wired to real data:
//   - useCart             → cart items + method-aware totals (the SAME math
//                           myAppCheckout charges, for the shipping method the
//                           customer chose on the details step).
//   - useCommerceSettings → the admin-managed payment methods (enabled only —
//                           the card/wallet/COD options the store turns on in
//                           the admin Settings page).
//   - useAddresses        → the saved shipping address selected on /checkout.
//
// "Confirm & Pay" places the order via myAppCheckout (transactional, decrements
// stock, clears the cart server-side), persists the result to the store's
// lastOrder, and routes to /checkout/success. Recoverable failures (out of
// stock, promo no longer valid, a disabled method) surface inline so the user
// can fix them — there's no payment processor that can "decline", so we don't
// route to the /checkout/failed screen.
//
// The shared chrome (Stepper, PromoCodeSection, trust/payment/support rows,
// sticky mobile CTA) comes from CartPageClient so the visual language stays
// identical across the three steps.


// ──────────────────────────────────────────────────────────────────────
// Small inline glyphs — same rationale as CheckoutDetailsClient.jsx
// (avoid Figma 7-day asset URL expiry; keep <16-line SVGs co-located).
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
// Figma mobile 84:7671 / desktop 119:5919. Inline so they survive Figma's
// 7-day asset URL expiry — same rationale as AccountIcons.jsx.
// ──────────────────────────────────────────────────────────────────────

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
        <path d="M16 4.2 A8 8 0 0 1 16 15.8 A8 8 0 0 1 16 4.2 Z" fill="#FF5F00" />
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
      <svg viewBox="0 0 24 24" width="22" height="22" xmlns="http://www.w3.org/2000/svg" aria-hidden>
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
  return (
    <div className={TILE_BASE} style={{ backgroundColor: "#f3f4f6", borderRadius: 8 }}>
      <svg viewBox="0 0 28 20" width="24" height="18" xmlns="http://www.w3.org/2000/svg" aria-hidden>
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

// Map an admin payment-method `key` (visa / mastercard / applepay / googlepay /
// cod — migration 0003 seeds visa/applepay/googlepay/cod) to its brand tile.
// Unknown keys fall back to the generic card tile.
function PaymentMethodTile({ pmKey }) {
  const k = String(pmKey || "").toLowerCase();
  if (k === "mastercard") return <MastercardTile />;
  if (k === "applepay") return <ApplePayTile />;
  if (k === "googlepay" || k === "gpay") return <GooglePayTile />;
  if (k === "cod") return <CashOnDeliveryTile />;
  return <VisaTile />;
}

function brandName(brand) {
  return (
    { visa: "Visa", mastercard: "Mastercard", amex: "Amex", discover: "Discover" }[
      String(brand || "").toLowerCase()
    ] || "Card"
  );
}

// ──────────────────────────────────────────────────────────────────────
// Payment Method section — heading + radio list + "ADD NEW CARD" button.
// Each row is a unified "option": a saved card, a wallet (Apple/Google
// Pay), or Cash on Delivery — whichever the admin commerce settings have
// enabled. Mobile (Figma 84:7671) and desktop (Figma 119:5919) share the
// row shape; only the heading sizing changes by breakpoint.
// ──────────────────────────────────────────────────────────────────────

function PaymentMethodRow({ option, selected, onSelect, variant }) {
  const desktop = variant === "desktop";
  const borderWidth = desktop ? 1 : selected ? 2 : 1;
  const padding = desktop ? 18 : selected ? 16 : 17;
  return (
    <button
      type="button"
      onClick={() => onSelect(option.id)}
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
        <PaymentMethodTile pmKey={option.tileKey} />
        <div className="flex flex-col items-start text-left">
          <span
            className={`font-display text-[14px] leading-5 text-[#11191f] ${
              selected ? "font-bold" : "font-semibold"
            }`}
          >
            {option.title}
          </span>
          <span className="pt-0.5 font-body text-[12px] leading-4 text-[#6b7280]" style={condensed}>
            {option.subtitle}
          </span>
        </div>
      </div>
      <RadioDot selected={selected} />
    </button>
  );
}

function AddNewCardButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center rounded-[4px] px-[16.5px] pb-[16.5px] pt-[14.5px]"
      style={{ backgroundColor: "#f0f1f3", border: "0.5px solid rgba(0,0,0,0.1)" }}
    >
      <span className="font-display text-[12px] font-medium leading-normal text-[#11191f]">ADD NEW CARD</span>
    </button>
  );
}

function PaymentMethodSection({ options, selectedId, onSelect, onAddCard, cardEnabled, hasCards, loading, variant }) {
  const desktop = variant === "desktop";
  return (
    <section className={desktop ? "flex w-full flex-col gap-6" : "flex w-full flex-col gap-4 px-4"}>
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
        {loading ? (
          <p className="font-body text-[13px] leading-5 text-[#9ca3af]" style={condensed}>
            Loading payment options…
          </p>
        ) : (
          <>
            {cardEnabled && !hasCards ? (
              <p className="font-body text-[13px] leading-5 text-[#6b7280]" style={condensed}>
                No saved cards yet — add one below to pay by card.
              </p>
            ) : null}
            {options.map((o) => (
              <PaymentMethodRow
                key={o.id}
                option={o}
                selected={o.id === selectedId}
                onSelect={onSelect}
                variant={variant}
              />
            ))}
          </>
        )}
      </div>
      {cardEnabled && !loading ? <AddNewCardButton onClick={onAddCard} /> : null}
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Shipping Address Display — read-only card. The address was selected on
// the Details step; the Edit affordance routes back to /checkout to change
// it (or the delivery method). Mobile Figma 84:7725, desktop Figma 126:5481.
// ──────────────────────────────────────────────────────────────────────

function ShippingAddressDisplay({ address, onEdit, variant }) {
  const desktop = variant === "desktop";
  if (!address) return null;
  return (
    <section className={desktop ? "flex w-full flex-col gap-4" : "flex w-full flex-col gap-4 px-4"}>
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
            <p className="font-body text-[12px] font-medium leading-normal text-[#11191f]" style={condensed}>
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
          {address.full_name ? <p className="font-medium text-[#11191f]">{address.full_name}</p> : null}
          <p>{address.line}</p>
          <p>{address.phone}</p>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Terms checkbox — agreement with links to T&C / Privacy. Mobile Figma
// 84:7781 wraps the row inside a #fafafa pill; desktop Figma 119:6008 is
// plain. Both gate the place-order CTA.
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
      style={desktop ? undefined : { backgroundColor: "#fafafa", border: "1px solid #e5e7eb" }}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
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
        <Link href="/terms" className="font-bold text-[#11191f] underline">
          Terms &amp; Conditions
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="font-bold text-[#11191f] underline">
          Privacy Policy
        </Link>
        . I understand that my order is final and non-refundable once placed.
      </span>
    </label>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Mobile-only inline Order Total card (Figma 84:8019).
// ──────────────────────────────────────────────────────────────────────

function MobileOrderTotalCard({ totals, appliedPromo }) {
  const { subtotal, discount, shipping, tax, total, itemCount } = totals;
  const taxInclusive = !!totals.taxInclusive;
  const taxLabel = taxInclusive ? "Tax (included)" : "Tax (Estimated)";
  const taxValue = taxInclusive ? totals.taxIncludedAmount ?? 0 : tax;
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
        <MobileRow label={taxLabel} value={formatJOD(taxValue)} />
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
            <span className="font-display text-[12px] font-bold leading-5" style={{ color: "#15803d" }}>
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
// Desktop right-column composite — embedded T&C checkbox above the CTA.
// ──────────────────────────────────────────────────────────────────────

function MiniItem({ item }) {
  return (
    <div className="flex w-full items-start gap-4">
      <div className="relative h-24 w-16 shrink-0 overflow-hidden bg-[#f3f4f6] shadow-[0_0_12.348px_0_rgba(0,0,0,0.05)]">
        <Image src={item.image} alt={item.name} fill sizes="64px" className="object-cover" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <h4 className="font-display text-[14px] font-bold leading-5 text-[#11191f]">{item.name}</h4>
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
  submitting,
}) {
  const { subtotal, discount, shipping, tax, total, itemCount } = totals;
  const taxInclusive = !!totals.taxInclusive;
  const taxLabel = taxInclusive ? "Tax (included)" : "Tax (Estimated)";
  const taxValue = taxInclusive ? totals.taxIncludedAmount ?? 0 : tax;
  const disabled = !termsAccepted || submitting;
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
        <DesktopRow label={taxLabel} value={formatJOD(taxValue)} />
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
            <span className="font-display text-[14px] font-medium leading-5" style={{ color: "#16a34a" }}>
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
        disabled={disabled}
        className="mt-2 flex h-14 w-full items-center justify-center rounded-[4px] text-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.10),0_4px_6px_-4px_rgba(0,0,0,0.10)] disabled:cursor-not-allowed"
        style={{ backgroundColor: disabled ? "rgba(17,25,31,0.5)" : "#11191f" }}
      >
        <span className="font-display text-[14px] font-bold uppercase leading-6 tracking-[0.8px]">
          {submitting ? "Processing…" : "Confirm & Pay"}
        </span>
      </button>

      <p className="text-center font-body text-[10px] leading-[15px] text-[#9ca3af]" style={condensed}>
        By proceeding to payment, you agree to our{" "}
        <Link href="/terms" className="underline">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
        .
      </p>

      <div
        className="flex items-center justify-center gap-2 rounded-[4px] py-1.5"
        style={{ backgroundColor: "#f3f4f6" }}
      >
        <Icon name="lock-sm" className="h-3 w-[10.5px]" />
        <span className="font-display text-[10px] leading-[15px] text-[#6b7280]">Encrypted &amp; Secure</span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Loading / empty / error gates.
// ──────────────────────────────────────────────────────────────────────

function CheckoutLoading() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-[#e5e7eb] border-t-[#11191f]" />
        <p className="font-body text-[14px] text-[#6b7280]" style={condensed}>
          Loading checkout…
        </p>
      </div>
    </div>
  );
}

function EmptyCheckout() {
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
        Add a few pieces from the shop before checking out.
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

function ErrorBanner({ message }) {
  return (
    <div
      role="alert"
      className="mx-4 mt-4 flex items-center gap-3 rounded-[4px] border border-[#fecaca] px-4 py-3 md:mx-8"
      style={{ backgroundColor: "#fef2f2" }}
    >
      <span className="font-body text-[13px] leading-5 text-[#b91c1c]" style={condensed}>
        {message}
      </span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Main client component.
// ──────────────────────────────────────────────────────────────────────

export default function PaymentPageClient() {
  const router = useRouter();
  const isLoggedIn = useRepairStore(selectIsLoggedIn);
  const checkoutInfo = useRepairStore(selectCheckoutInfo);

  // Gate on store rehydration (skipHydration) — without this, a logged-in user
  // who refreshes /checkout/payment would read isLoggedIn=false on the first
  // frame and get bounced to /cart before the persisted auth state loads.
  const [hydrated, setHydrated] = useState(() => useRepairStore.persist.hasHydrated());
  useEffect(() => {
    if (hydrated) return undefined;
    const unsub = useRepairStore.persist.onFinishHydration(() => setHydrated(true));
    if (useRepairStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, [hydrated]);

  // Checkout requires an account (guests register on the details step). Only
  // evaluate AFTER hydration so a real session isn't misread as logged-out.
  useEffect(() => {
    if (hydrated && !isLoggedIn) router.replace("/cart");
  }, [hydrated, isLoggedIn, router]);

  const settings = useCommerceSettings();

  // The shipping method chosen on the details step drives the totals math.
  // checkoutInfo is NOT persisted, so a hard refresh of this page resets it to
  // "standard" (and clears the address selection below) — the displayed total
  // still matches what's charged because the server recomputes from the same key.
  const shippingKey = checkoutInfo.selectedShippingMethodKey || "standard";

  const {
    items,
    loading: cartLoading,
    error: cartError,
    totals,
    appliedPromo,
    applyPromo,
    clearPromo,
    promoError,
  } = useCart({ shippingMethodKey: shippingKey });

  const { addresses, loading: addrLoading } = useAddresses();

  // Resolve the address to charge: the one selected on /checkout, else the
  // default, else the first saved. Derived (no effect) so it can't race the
  // async address load. Null when the user has no saved address.
  const resolvedAddress = useMemo(() => {
    if (!addresses.length) return null;
    return (
      addresses.find((a) => String(a.id) === String(checkoutInfo.selectedAddressId)) ??
      addresses.find((a) => a.isDefault) ??
      addresses[0]
    );
  }, [addresses, checkoutInfo.selectedAddressId]);

  // The admin commerce settings decide WHICH payment-method TYPES are available
  // (enabled only; the admin patch refuses to leave zero enabled). The user's
  // saved cards (demo, client-side) fill the "card" type — added via
  // AddCardDrawer, so a freshly-registered user can add one and pay by card.
  const enabledPayments = useMemo(
    () => (Array.isArray(settings?.paymentMethods) ? settings.paymentMethods.filter((m) => m.enabled) : []),
    [settings]
  );
  const isCardKey = (k) => k === "visa" || k === "mastercard" || k === "card";
  const cardMethod = enabledPayments.find((m) => isCardKey(m.key));
  const cardEnabled = !!cardMethod;
  const savedCards = useRepairStore(selectPaymentCards);

  // Unified, selectable option list: each saved card (when card payment is on)
  // + each enabled wallet + Cash on Delivery.
  const options = useMemo(() => {
    const list = [];
    if (cardEnabled) {
      for (const c of savedCards) {
        list.push({
          id: `card:${c.id}`,
          kind: "card",
          paymentKey: cardMethod.key,
          tileKey: c.brand,
          title: `${brandName(c.brand)} ending ${c.last4}`,
          subtitle: c.expiry ? `Expires ${c.expiry}` : "Saved card",
          card: c,
        });
      }
    }
    for (const m of enabledPayments) {
      const k = String(m.key).toLowerCase();
      if (k === "applepay" || k === "googlepay") {
        list.push({ id: `method:${k}`, kind: k, paymentKey: m.key, tileKey: k, title: m.name, subtitle: "Quick payment" });
      } else if (k === "cod") {
        list.push({ id: "method:cod", kind: "cod", paymentKey: m.key, tileKey: "cod", title: m.name, subtitle: "Pay when you receive" });
      }
    }
    return list;
  }, [cardEnabled, cardMethod, savedCards, enabledPayments]);

  // Derived selection (no effect): the previously-chosen option if still
  // present, else the default saved card, else the first option.
  const [chosenOptionId, setChosenOptionId] = useState(null);
  const selectedOption =
    options.find((o) => o.id === chosenOptionId) ??
    options.find((o) => o.kind === "card" && o.card?.isDefault) ??
    options[0] ??
    null;

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [gatewayOpen, setGatewayOpen] = useState(false);
  const [addCardOpen, setAddCardOpen] = useState(false);

  // Add a demo card (AddCardDrawer returns brand/last4/expiry/holder — no PAN)
  // and auto-select it.
  const handleAddCard = (card) => {
    const id = useRepairStore.getState().addPaymentCard(card);
    setChosenOptionId(`card:${id}`);
  };

  // Live, admin-flagged example promo codes (same source as /cart).
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

  // ── Place order ───────────────────────────────────────────────────────
  // The actual order placement — runs AFTER a (simulated) payment approval, or
  // directly for Cash on Delivery (nothing to authorize). myAppCheckout is
  // transactional + decrements stock, so guard against double-submit.
  const placeOrder = async (paymentKey) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const data = await repairCall(
        "myAppCheckout",
        {
          addressId: resolvedAddress.id,
          promoCode: appliedPromo?.code ?? undefined,
          paymentMethod: paymentKey,
          shippingMethodKey: shippingKey,
        },
        { isQuery: false }
      );
      // Persist the AUTHORITATIVE result (server-computed total) so the success
      // page shows the charged figure, then clear the in-progress selections and
      // refresh the (now server-cleared) cart badge. Keep `submitting` true so
      // the empty-cart gate doesn't flash before we navigate.
      const store = useRepairStore.getState();
      store.setLastPlacedOrder({
        order_id: data?.order_id,
        order_number: data?.order_number,
        total: data?.total,
      });
      store.clearCheckout();
      store.syncCart();
      router.push("/checkout/success");
    } catch (err) {
      const raw = String(err?.message || "");
      const msg = raw.replace(/^repairClientApi \S+:\s*/, "") || "Checkout failed, please try again.";
      setFormError(msg);
      setSubmitting(false);
    }
  };

  // CTA entry point: validate, then either place the order directly (Cash on
  // Delivery — nothing to authorize) or open the DEMO payment gateway for
  // card / wallet methods. The gateway is a placeholder until a real processor
  // is integrated — see DemoPaymentGateway.jsx.
  const startPayment = () => {
    if (submitting || gatewayOpen) return;
    setFormError(null);
    if (!termsAccepted) {
      setFormError("Please accept the Terms & Conditions to place your order.");
      return;
    }
    if (!resolvedAddress) {
      setFormError("Please add a shipping address before placing your order.");
      return;
    }
    if (!selectedOption) {
      setFormError(
        cardEnabled
          ? "Add a card (or pick a payment method) to continue."
          : "Please choose a payment method."
      );
      return;
    }
    // Cash on Delivery: nothing to authorize → place the order directly.
    if (selectedOption.kind === "cod") {
      placeOrder(selectedOption.paymentKey);
      return;
    }
    // Card / wallet → simulate the gateway authorizing the on-file instrument.
    setGatewayOpen(true);
  };

  // DEMO gateway approved → place the real order with the selected method.
  const handleGatewayApprove = () => {
    setGatewayOpen(false);
    if (selectedOption) placeOrder(selectedOption.paymentKey);
  };

  // DEMO gateway declined → record the attempt + show /checkout/failed. No
  // order is created and stock is untouched (the failure happens BEFORE
  // myAppCheckout, so there's nothing to roll back).
  const handleGatewayDecline = ({ reason }) => {
    setGatewayOpen(false);
    const card = selectedOption?.card;
    useRepairStore.getState().setPaymentAttempt({
      amount: totals.total,
      last4: card?.last4 ?? null,
      brand: card ? brandName(card.brand) : selectedOption?.title ?? "Payment",
      methodLabel: selectedOption?.title ?? "Payment",
      reason: reason || "Your payment could not be processed.",
      txnId: `TXN-${Date.now()}-${Math.floor(Math.random() * 100000).toString().padStart(5, "0")}`,
    });
    router.push("/checkout/failed");
  };

  const goEditAddress = () => router.push("/checkout");

  // ── Loading / empty gates ──────────────────────────────────────────────
  if (!hydrated || !isLoggedIn) {
    return (
      <main className="flex flex-1 flex-col bg-white">
        <CheckoutLoading />
      </main>
    );
  }
  if (cartLoading || addrLoading) {
    return (
      <main className="flex flex-1 flex-col bg-white">
        <CheckoutLoading />
      </main>
    );
  }
  if (items.length === 0 && !submitting) {
    return (
      <main className="flex flex-1 flex-col bg-white">
        <EmptyCheckout />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col bg-white">
      {formError ? <ErrorBanner message={formError} /> : null}
      {cartError ? <ErrorBanner message={cartError} /> : null}

      {/* ============== MOBILE LAYOUT ============== */}
      <div className="flex flex-col md:hidden">
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

        <div className="px-4 pt-4">
          <BackStepLink activeStep="payment" />
        </div>

        <div className="py-4">
          <PaymentMethodSection
            options={options}
            selectedId={selectedOption?.id ?? null}
            onSelect={setChosenOptionId}
            onAddCard={() => setAddCardOpen(true)}
            cardEnabled={cardEnabled}
            hasCards={savedCards.length > 0}
            loading={!settings}
            variant="mobile"
          />
        </div>

        <div className="mx-4 h-px bg-[#f3f4f6]" />

        <div className="py-4">
          <ShippingAddressDisplay address={resolvedAddress} onEdit={goEditAddress} variant="mobile" />
        </div>

        <div className="mx-4 h-px bg-[#f3f4f6]" />

        <PromoCodeSection
          appliedPromo={appliedPromo}
          onApplyCode={applyPromo}
          onClear={clearPromo}
          isGuest={false}
          externalError={promoError}
          variant="mobile"
          suggestedCodes={promoExamples}
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
          onContinue={startPayment}
          ctaText={submitting ? "Processing…" : "PAY & CONFIRM ORDER"}
        />
      </div>

      {/* ============== DESKTOP LAYOUT ============== */}
      <div className="mx-auto hidden w-full max-w-[1440px] flex-col gap-12 px-8 pb-20 pt-12 md:flex">
        <BackStepLink activeStep="payment" />
        <Stepper activeStep="payment" />

        <div className="flex flex-col items-stretch gap-12 lg:flex-row lg:items-start lg:justify-center">
          {/* Left column: payment methods + shipping address display */}
          <div className="flex w-full min-w-0 flex-col gap-8 lg:flex-1" style={{ maxWidth: "901.33px" }}>
            <PaymentMethodSection
              options={options}
              selectedId={selectedOption?.id ?? null}
              onSelect={setChosenOptionId}
              onAddCard={() => setAddCardOpen(true)}
              cardEnabled={cardEnabled}
              hasCards={savedCards.length > 0}
              loading={!settings}
              variant="desktop"
            />
            <ShippingAddressDisplay address={resolvedAddress} onEdit={goEditAddress} variant="desktop" />
          </div>

          {/* Right column: promo, order summary card (with embedded T&C +
              Confirm & Pay CTA), trust + payments + support */}
          <aside className="flex w-full flex-col gap-6 lg:w-[426.66px] lg:shrink-0">
            <PromoCodeSection
              appliedPromo={appliedPromo}
              onApplyCode={applyPromo}
              onClear={clearPromo}
              isGuest={false}
              externalError={promoError}
              variant="desktop"
              suggestedCodes={promoExamples}
            />
            <PaymentOrderSummaryCard
              items={items}
              totals={totals}
              appliedPromo={appliedPromo}
              termsAccepted={termsAccepted}
              onToggleTerms={() => setTermsAccepted((v) => !v)}
              onPlaceOrder={startPayment}
              submitting={submitting}
            />
            <TrustBadgesRow variant="desktop" />
            <PaymentMethodsRow variant="desktop" />
            <SupportCard variant="desktop" />
          </aside>
        </div>
      </div>

      {/* Add a (demo) card — reuses the account drawer; on submit it stores the
          card and auto-selects it. */}
      <AddCardDrawer open={addCardOpen} onClose={() => setAddCardOpen(false)} onSubmit={handleAddCard} />

      {/* DEMO payment gateway — mounted only while open so each launch starts
          fresh. Placeholder until a real processor is integrated. */}
      {gatewayOpen && selectedOption ? (
        <DemoPaymentGateway
          amount={totals.total}
          summary={selectedOption.title}
          last4={selectedOption.card?.last4 ?? null}
          brand={selectedOption.card ? brandName(selectedOption.card.brand) : selectedOption.title}
          onApprove={handleGatewayApprove}
          onDecline={handleGatewayDecline}
          onClose={() => setGatewayOpen(false)}
        />
      ) : null}
    </main>
  );
}

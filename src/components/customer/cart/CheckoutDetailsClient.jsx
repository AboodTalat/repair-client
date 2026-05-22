"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  CART_ITEMS,
  CHECKOUT_ADDRESSES,
  CHECKOUT_CONTACT,
  DEFAULT_SHIPPING_METHOD_ID,
  PROMO_CODES,
  SHIPPING_METHODS,
  buildAddressLine,
  calcTotals,
  formatJOD,
} from "@/lib/mockCart";
import AddAddressDrawer from "@/components/customer/account/AddAddressDrawer";
import {
  FreeShippingBanner,
  Icon,
  ItemsSection,
  PaymentMethodsRow,
  PoliciesFootnote,
  PromoCodeSection,
  OrderTotalsBlock,
  Stepper,
  StickyCheckoutBar,
  SupportCard,
  TrustBadgesRow,
  condensed,
} from "./CartPageClient";

// /checkout — Details step (step 2 of the cart→details→payment flow).
// Matches Figma mobile 82:3618 + desktop 119:5592. Renders shared chrome
// (Stepper, FreeShippingBanner, ItemsSection, PromoCodeSection,
// OrderTotalsBlock, trust badges, payment-methods row, support card,
// sticky CTA on mobile) from `CartPageClient.jsx` so the visual language
// stays identical across the two checkout pages. New surfaces unique to
// this step — contact info, shipping address, shipping/delivery method,
// the collapsed Order Summary toggle (mobile), and the right-column
// Order Summary card with the mini items list (desktop) — live in this
// file.

const DEFAULT_APPLIED_PROMO = PROMO_CODES.SUMMER25;

// Inline SVG glyphs — small one-off icons that aren't worth adding to
// /public/cart/. Same rationale as `customer/account/AccountIcons.jsx`:
// inline SVGs survive the Figma 7-day asset URL expiry and keep colors
// controllable via `currentColor`. (The larger payment / shield / lock /
// return / headset icons stay in /public/cart/ since they're reused via
// the cart-page `<Icon>` helper.)

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

function ChevronDownIcon({ className = "size-3", style }) {
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
        d="M3 4.5L6 7.5L9 4.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlusGlyph({ className = "size-3", style }) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
      style={style}
    >
      <path d="M6 2V10M2 6H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function HomeFillIcon({ className = "size-5", style }) {
  // vuesax/bold/home-2 — simplified single-path version (Figma 77:2439).
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

function BuildingIcon({ className = "size-[14px]", style }) {
  return (
    <svg
      viewBox="0 0 14 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
      style={style}
    >
      <rect x="1.5" y="1.5" width="11" height="15" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 5h2M4 8h2M4 11h2M8 5h2M8 8h2M8 11h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M5 16.5v-3h4v3" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Mobile-only: Order Summary toggle bar (Figma 82:3732). Tapping it
// scrolls down to the "Your Items" section so the items list is visible
// without leaving the page — there's no separate collapsed/expanded
// state, the items are always rendered below.
// ──────────────────────────────────────────────────────────────────────

function OrderSummaryToggle({ itemCount, subtotal, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between border-y border-[#f3f4f6] px-4 py-4 text-left"
      style={{ backgroundColor: "rgba(249,250,251,0.5)" }}
    >
      <div className="flex items-center gap-3">
        <div className="grid size-8 place-items-center rounded-[4px] border border-[#e5e7eb] bg-white text-[#11191f]">
          <Icon name="check-step" className="h-3 w-[10.5px]" />
        </div>
        <div className="flex flex-col items-start">
          <span className="font-display text-[14px] font-medium leading-5 text-[#11191f]">
            Order Summary
          </span>
          <span className="font-body text-[12px] leading-4 text-[#6b7280]" style={condensed}>
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-center font-display text-[14px] font-semibold leading-5 text-[#11191f]">
          {formatJOD(subtotal)}
        </span>
        <ChevronDownIcon className="size-3 text-[#11191f]" />
      </div>
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Section heading shared by Contact, Shipping Address, Delivery Method.
// Variant differs by breakpoint: mobile uses the smaller 16/24 semibold,
// desktop uses the bigger 20/28 bold tracking-[-0.5px]. The optional
// rightSlot renders the matching action (Edit / Add More / Log in link).
// ──────────────────────────────────────────────────────────────────────

function SectionHeading({ title, rightSlot, variant }) {
  const desktop = variant === "desktop";
  return (
    <div className="flex w-full items-center justify-between">
      <h2
        className={
          desktop
            ? "font-display text-[20px] font-bold leading-7 tracking-[-0.5px] text-[#11191f]"
            : "font-display text-[16px] font-semibold leading-6 text-[#11191f]"
        }
      >
        {title}
      </h2>
      {rightSlot}
    </div>
  );
}

function EditButton({ onClick, label = "Edit" }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      className="flex items-center gap-1 text-[#6b7280] hover:text-[#11191f]"
    >
      <EditPencilIcon className="size-2.5" />
      <span className="font-body text-[12px] font-medium leading-4" style={condensed}>
        {label}
      </span>
    </button>
  );
}

function AddMoreButton({ onClick }) {
  // Desktop "Add More" button matching Figma 126:5176 — uppercase Bold
  // 12/16, tracking-[0.6px], with a plus glyph on the left.
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 text-[#11191f] hover:opacity-80"
    >
      <PlusGlyph className="size-3" />
      <span className="font-display text-[12px] font-bold uppercase leading-4 tracking-[0.6px]">
        Add More
      </span>
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Contact Information section. Mobile (Figma 82:3751) has two inline
// dark-bordered fields (email + phone with dial-code prefix). Desktop
// (Figma 119:5623) is a single grey email field plus a checkbox row.
// Both render a "Keep me updated" checkbox under the form.
// ──────────────────────────────────────────────────────────────────────

function ContactInformationSection({ contact, variant }) {
  const desktop = variant === "desktop";
  const [keepUpdated, setKeepUpdated] = useState(true);

  if (desktop) {
    return (
      <section className="flex w-full flex-col gap-6">
        <SectionHeading
          title="Contact Information"
          variant="desktop"
          rightSlot={
            <p className="font-display text-[14px] leading-5 text-[#6b7280]">
              Already have an account?{" "}
              <Link href="/sign-in" className="font-medium text-[#11191f] underline">
                Log in
              </Link>
            </p>
          }
        />
        <div className="flex w-full flex-col gap-4">
          <input
            type="email"
            defaultValue={contact.email}
            placeholder="Email address"
            aria-label="Email address"
            className="w-full rounded-[2px] border border-[#e5e7eb] bg-[#f9fafb] px-[17px] py-[19px] font-display text-[16px] leading-normal text-[#11191f] placeholder:text-[#9ca3af] focus:border-[#11191f] focus:outline-none"
          />
          <Checkbox
            checked={keepUpdated}
            onChange={() => setKeepUpdated((v) => !v)}
            label="Email me with news and offers"
            size="desktop"
          />
        </div>
      </section>
    );
  }

  return (
    <section className="flex w-full flex-col gap-4 px-4">
      <SectionHeading
        title="Contact Information"
        variant="mobile"
        rightSlot={<EditButton />}
      />
      <div className="flex w-full flex-col gap-2 drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
        <div className="flex h-10 items-center rounded-[2px] border border-[#11191f] bg-white px-3 py-2">
          <input
            type="email"
            defaultValue={contact.email}
            aria-label="Email"
            className="w-full bg-transparent font-display text-[10px] leading-normal text-[#11191f] focus:outline-none"
          />
        </div>
        <div className="flex h-10 items-center gap-2 rounded-[2px] border border-[#11191f] bg-white px-3 py-2">
          <span className="font-display text-[10px] leading-normal text-[#11191f]">
            {contact.dialCode}
          </span>
          <span className="h-2 w-px bg-[#11191f]" />
          <input
            type="tel"
            defaultValue={contact.phone}
            aria-label="Phone"
            className="w-full bg-transparent font-display text-[10px] leading-normal text-[#11191f] focus:outline-none"
          />
        </div>
      </div>
      <Checkbox
        checked={keepUpdated}
        onChange={() => setKeepUpdated((v) => !v)}
        label="Email me with news and offers"
        size="mobile"
      />
    </section>
  );
}

function Checkbox({ checked, onChange, label, size }) {
  const desktop = size === "desktop";
  return (
    <label className="flex w-full cursor-pointer items-start gap-3">
      <span className="relative flex shrink-0 items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="peer sr-only"
        />
        <span
          className={`${
            desktop ? "size-4 rounded-[2px]" : "size-5 rounded-[4px]"
          } grid place-items-center border bg-white`}
          style={{ borderColor: checked ? "#11191f" : desktop ? "#d1d5db" : "#11191f" }}
        >
          {checked ? (
            <span
              className={`${desktop ? "h-[6px] w-[3px]" : "h-[8px] w-[4px]"} -translate-y-[1px] rotate-45 border-b-[1.5px] border-r-[1.5px]`}
              style={{ borderColor: "#11191f" }}
            />
          ) : null}
        </span>
      </span>
      <span
        className={
          desktop
            ? "font-display text-[14px] leading-5 text-[#4b5563]"
            : "font-body text-[12px] leading-[19.5px] text-[#4b5563]"
        }
        style={desktop ? undefined : condensed}
      >
        {label}
      </span>
    </label>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Shipping Address section. Mobile (Figma 82:3804) shows the default
// address card in a soft drop-shadow box + an "ADD NEW CARD" muted
// button. Desktop (Figma 126:5172) shows ALL saved addresses as a
// radio-style list with the selected one bordered dark + filled radio
// and the others bordered light + outlined radio; the action sits in
// the heading row as "Add More".
// ──────────────────────────────────────────────────────────────────────

function AddressKindIcon({ kind, className = "size-5" }) {
  if (kind === "office") return <BuildingIcon className={className} />;
  return <HomeFillIcon className={className} />;
}

function ShippingAddressSection({ addresses, selectedId, onSelect, onEdit, onAdd, variant }) {
  const desktop = variant === "desktop";

  if (desktop) {
    return (
      <section className="flex w-full flex-col">
        <div className="py-6">
          <SectionHeading
            title="SHIPPING ADDRESS"
            variant="desktop"
            rightSlot={<AddMoreButton onClick={onAdd} />}
          />
        </div>
        <div className="flex w-full flex-col gap-4">
          {addresses.map((addr) => {
            const isSelected = addr.id === selectedId;
            return (
              <button
                key={addr.id}
                type="button"
                onClick={() => onSelect(addr.id)}
                className="flex w-full items-start justify-between bg-white p-6 text-left"
                style={{
                  borderRadius: 6,
                  border: `1px solid ${isSelected ? "#11191f" : "rgba(17,25,31,0.1)"}`,
                  filter: isSelected
                    ? "drop-shadow(0 2px 2px rgba(0,0,0,0.06)) drop-shadow(0 4px 3px rgba(0,0,0,0.1))"
                    : undefined,
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="grid size-10 shrink-0 place-items-center rounded-[8px] text-[#11191f]"
                    style={{ backgroundColor: "#f3f4f6" }}
                  >
                    <AddressKindIcon kind={addr.kind} className="size-4" />
                  </div>
                  <div className="flex flex-col items-start gap-[3px]">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-[14px] font-bold leading-5 text-[#11191f]">
                        {addr.label}
                      </h3>
                      {addr.isDefault ? (
                        <span
                          className="font-body text-[10px] leading-[15px] text-[#9ca3af]"
                          style={condensed}
                        >
                          (Default)
                        </span>
                      ) : null}
                    </div>
                    <p
                      className="max-w-[512px] font-body text-[14px] leading-[22.75px] text-[#6b7280]"
                      style={condensed}
                    >
                      {addr.line}
                    </p>
                    <p
                      className="font-body text-[14px] font-medium leading-5 text-[#6b7280]"
                      style={condensed}
                    >
                      {addr.phone}
                    </p>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit?.(addr);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          onEdit?.(addr);
                        }
                      }}
                      className="mt-[8.5px] cursor-pointer font-display text-[11px] font-bold uppercase leading-[16.5px] tracking-[0.55px] text-[#11191f]"
                    >
                      Edit Details
                    </span>
                  </div>
                </div>
                <RadioDot selected={isSelected} />
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  // Mobile: just one card (the default one) + ADD NEW CARD button below.
  const selected = addresses.find((a) => a.id === selectedId) ?? addresses[0];
  return (
    <section className="flex w-full flex-col gap-4 px-4">
      <SectionHeading
        title="Shipping Address"
        variant="mobile"
        rightSlot={<EditButton onClick={() => onEdit?.(selected)} />}
      />
      <div
        className="flex w-full flex-col gap-2 bg-white p-4"
        style={{
          borderRadius: 4,
          filter: "drop-shadow(0 0 5px rgba(0,0,0,0.15))",
        }}
      >
        <div className="flex w-full items-center gap-3">
          <div className="relative inline-grid place-items-start">
            <div
              className="col-start-1 row-start-1 size-8 rounded-[4px]"
              style={{ backgroundColor: "#f0f0f0" }}
            />
            <div className="col-start-1 row-start-1 ml-[6px] mt-[6px] text-[#11191f]">
              <AddressKindIcon kind={selected.kind} className="size-5" />
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <p
              className="font-body text-[12px] font-medium leading-normal text-[#11191f]"
              style={condensed}
            >
              {selected.label}{" "}
              {selected.isDefault ? (
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
          <p>{selected.line}</p>
          <p>{selected.phone}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onAdd}
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

function RadioDot({ selected }) {
  // Outer ring 20×20. Selected = filled dark with white inner dot;
  // unselected = grey outline ring only. Used by both address and
  // shipping/delivery method radio cards.
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
// Shipping / Delivery Method section. Three radio cards. The selected
// card has a 2px dark border + soft shadow + bg-[#f9fafb]; unselected
// cards have a 1px grey border. Mobile (Figma 82:3923) labels the
// section "Shipping Method" + Standard/Express/Next Day. Desktop
// (Figma 119:5701) labels it "Delivery Method" + Standard/Express/
// Store Pickup (Free in green). Each row uses the shared RadioDot.
// ──────────────────────────────────────────────────────────────────────

function DeliveryMethodRow({ method, selected, onSelect, variant }) {
  const desktop = variant === "desktop";
  const isFree = method.price === 0;
  // Border + padding all inline because Tailwind v4 + Turbopack
  // silently drops arbitrary `rounded-[Npx]` / `border-[#hex]` / even
  // `border-2` in some scans — see repair/CLAUDE.md "Tailwind v4 +
  // Turbopack gotcha". Mobile selected uses a 2px dark border with
  // p-[18px] (Figma 82:3927), unselected uses 1px grey border with
  // p-[17px] (Figma 82:3939). Desktop is 1px on both breakpoints with
  // p-[21px] (Figma 119:5705 / 119:5717) — the dark/grey color is the
  // only thing that changes.
  const borderWidth = desktop ? 1 : selected ? 2 : 1;
  const padding = desktop ? 21 : selected ? 18 : 17;
  return (
    <button
      type="button"
      onClick={() => onSelect(method.id)}
      className="flex w-full items-center justify-between"
      style={{
        padding: `${padding}px`,
        backgroundColor: selected ? "#f9fafb" : "transparent",
        borderRadius: desktop ? 8 : 4,
        border: `${borderWidth}px solid ${selected ? "#11191f" : "#e5e7eb"}`,
        boxShadow: selected ? "0 1px 2px 0 rgba(0,0,0,0.05)" : "none",
      }}
    >
      <div className="flex items-center gap-4">
        <RadioDot selected={selected} />
        <div className="flex flex-col items-start text-left">
          <span
            className={`font-display text-[14px] leading-5 text-[#11191f] ${
              desktop ? "font-bold" : selected ? "font-semibold" : "font-medium"
            }`}
          >
            {method.label}
          </span>
          <span
            className="pt-1 font-body text-[12px] leading-4 text-[#6b7280]"
            style={condensed}
          >
            {method.description}
          </span>
        </div>
      </div>
      <span
        className="font-display text-[14px] font-bold leading-5"
        style={{ color: isFree ? "#16a34a" : "#11191f" }}
      >
        {isFree ? "Free" : formatJOD(method.price)}
      </span>
    </button>
  );
}

function DeliveryMethodSection({
  methods,
  selectedId,
  onSelect,
  variant,
  freeShippingBanner,
}) {
  const desktop = variant === "desktop";
  return (
    <section
      className={
        desktop
          ? "flex w-full flex-col gap-6 border-t border-[#f3f4f6] pt-[33px]"
          : "flex w-full flex-col gap-4 px-4"
      }
    >
      <SectionHeading
        title={desktop ? "Delivery Method" : "Shipping Method"}
        variant={variant}
      />
      <div className="flex w-full flex-col gap-3">
        {methods.map((m) => (
          <DeliveryMethodRow
            key={m.id}
            method={m}
            selected={m.id === selectedId}
            onSelect={onSelect}
            variant={variant}
          />
        ))}
      </div>
      {/* Mobile also tucks the free-shipping progress banner inside this
          section directly below the radios — Figma 82:3966. */}
      {!desktop && freeShippingBanner ? freeShippingBanner : null}
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Desktop right column: mini items list + composed Order Summary card.
// The card holds: ORDER SUMMARY heading + items list + ORDER TOTAL
// breakdown + Total row + Continue CTA + policy line + Encrypted &
// Secure pill. (Cart-page OrderTotalsBlock can't slot a mini-items list
// in above the totals without an API change, so this card is built
// from scratch — it shares the row/discount/total styling with cart by
// matching the Figma spec rather than by code reuse.)
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

function MiniItemsList({ items }) {
  return (
    <div className="flex w-full flex-col gap-4">
      {items.map((it) => (
        <MiniItem key={it.id} item={it} />
      ))}
    </div>
  );
}

function TotalsRowSimple({ label, value, valueAccent }) {
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

function DesktopOrderSummaryCard({ items, totals, appliedPromo, onContinue }) {
  const { subtotal, discount, shipping, tax, total, itemCount } = totals;
  return (
    <div className="flex w-full flex-col gap-4 rounded-lg border border-[#f3f4f6] bg-[#f9fafb] p-6">
      <h3 className="w-full border-b border-[#e5e7eb] pb-4 font-display text-[16px] font-bold uppercase leading-6 tracking-[0.4px] text-[#11191f]">
        Order Summary
      </h3>

      <MiniItemsList items={items} />

      <h4 className="pt-2 font-display text-[16px] font-bold uppercase leading-6 tracking-[0.4px] text-[#11191f]">
        Order Total
      </h4>

      <div className="flex flex-col gap-4 border-b border-[#e5e7eb] pb-[25px]">
        <TotalsRowSimple
          label={`Subtotal (${itemCount} items)`}
          value={formatJOD(subtotal)}
        />
        <TotalsRowSimple
          label="Shipping"
          value={shipping === 0 ? "Free" : formatJOD(shipping)}
          valueAccent={shipping === 0 ? "#16a34a" : undefined}
        />
        <TotalsRowSimple label="Tax (Estimated)" value={formatJOD(tax)} />
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

      <button
        type="button"
        onClick={onContinue}
        className="mt-2 flex h-14 w-full items-center justify-center rounded-[4px] text-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.10),0_4px_6px_-4px_rgba(0,0,0,0.10)]"
        style={{ backgroundColor: "#11191f" }}
      >
        <span className="font-display text-[14px] font-bold uppercase leading-6 tracking-[0.8px]">
          Continue to Next Step
        </span>
      </button>

      <p
        className="text-center font-body text-[10px] leading-[15px] text-[#9ca3af]"
        style={condensed}
      >
        By proceeding to payment, you agree to our{" "}
        <a href="#" className="underline">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="#" className="underline">
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
// Main client component. Mirrors CartPageClient's overall shape but with
// the new sections in place of "Your Items" (still rendered, lower on
// mobile per Figma 82:3618 — "Your Items" sits below the Promo Code on
// the details mobile flow).
// ──────────────────────────────────────────────────────────────────────

export default function CheckoutDetailsClient() {
  const router = useRouter();
  const [items, setItems] = useState(CART_ITEMS);
  const [appliedPromo, setAppliedPromo] = useState(DEFAULT_APPLIED_PROMO);
  const [selectedShippingId, setSelectedShippingId] = useState(DEFAULT_SHIPPING_METHOD_ID);
  const [addressList, setAddressList] = useState(CHECKOUT_ADDRESSES);
  const [selectedAddressId, setSelectedAddressId] = useState(
    CHECKOUT_ADDRESSES.find((a) => a.isDefault)?.id ?? CHECKOUT_ADDRESSES[0]?.id,
  );
  // `addressDrawer.initial` discriminates edit-mode (truthy = existing row)
  // vs new-mode (null) — same convention AddAddressDrawer uses on /account.
  const [addressDrawer, setAddressDrawer] = useState({ open: false, initial: null });
  const itemsRef = useRef(null);

  const openAddAddress = () => setAddressDrawer({ open: true, initial: null });
  const openEditAddress = (addr) => setAddressDrawer({ open: true, initial: addr });
  const closeAddressDrawer = () => setAddressDrawer((s) => ({ ...s, open: false }));

  // Same pattern as PaymentPageClient — rebuild the flat display `line`
  // from the structured fields the drawer returns.
  const handleSaveAddress = (next) => {
    const isEdit = !!addressDrawer.initial?.id;
    const line = buildAddressLine(next);
    if (isEdit) {
      const targetId = addressDrawer.initial.id;
      setAddressList((prev) =>
        prev.map((a) => (a.id === targetId ? { ...a, ...next, line } : a)),
      );
    } else {
      const id = `addr-new-${Date.now()}`;
      setAddressList((prev) => [
        ...prev,
        {
          id,
          phone: "",
          isDefault: false,
          ...next,
          line,
        },
      ]);
      setSelectedAddressId(id);
    }
  };

  // For now, totals.shipping comes from the cart's free-shipping math
  // (flat 8 until threshold). The selected delivery method is reflected
  // in the radio UI but not yet plumbed into `calcTotals` — that swap
  // happens when the backend shipping-rate resolver lands.
  const totals = useMemo(() => calcTotals(items, appliedPromo), [items, appliedPromo]);

  const handleContinue = () => {
    router.push("/checkout/payment");
  };

  const scrollToItems = () => {
    if (itemsRef.current && typeof itemsRef.current.scrollIntoView === "function") {
      itemsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const freeShippingMobile = (
    <FreeShippingBanner
      amountToFreeShipping={totals.amountToFreeShipping}
      freeShippingPct={totals.freeShippingPct}
      variant="mobile"
    />
  );

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
          <Stepper activeStep="details" />
        </div>

        <OrderSummaryToggle
          itemCount={totals.itemCount}
          subtotal={totals.subtotal}
          onToggle={scrollToItems}
        />

        <div className="flex flex-col gap-4 py-4">
          <ContactInformationSection contact={CHECKOUT_CONTACT} variant="mobile" />
        </div>

        <ShippingAddressSection
          addresses={addressList}
          selectedId={selectedAddressId}
          onSelect={setSelectedAddressId}
          onEdit={openEditAddress}
          onAdd={openAddAddress}
          variant="mobile"
        />

        <div className="my-4 h-px w-full" />
        <div className="mx-4 h-px bg-[#f3f4f6]" />

        <DeliveryMethodSection
          methods={SHIPPING_METHODS}
          selectedId={selectedShippingId}
          onSelect={setSelectedShippingId}
          variant="mobile"
          freeShippingBanner={freeShippingMobile}
        />

        <div className="mx-4 mt-4 h-px bg-[#f3f4f6]" />

        <PromoCodeSection
          appliedPromo={appliedPromo}
          onApply={setAppliedPromo}
          onClear={() => setAppliedPromo(null)}
          variant="mobile"
        />

        <div className="mx-4 h-px bg-[#f3f4f6]" />

        <div ref={itemsRef}>
          <ItemsSection items={items} setItems={setItems} variant="mobile" />
        </div>

        <div className="mx-4 h-px bg-[#f3f4f6]" />

        <OrderTotalsBlock totals={totals} appliedPromo={appliedPromo} variant="mobile" />

        <div className="flex flex-col gap-4 px-4 pb-4 pt-4">
          <TrustBadgesRow variant="mobile" />
          <PaymentMethodsRow variant="mobile" />
        </div>

        <SupportCard variant="mobile" />

        <PoliciesFootnote />

        {/* Bottom padding so the sticky CTA doesn't cover content */}
        <div className="h-32" />

        <StickyCheckoutBar total={totals.total} onContinue={handleContinue} />
      </div>

      {/* ============== DESKTOP LAYOUT ============== */}
      <div className="mx-auto hidden w-full max-w-[1440px] flex-col gap-12 px-8 pb-20 pt-12 md:flex">
        <Stepper activeStep="details" />

        {/* Same responsive pattern as the cart page — stacked below lg
            (1024px), side-by-side at lg+ where the 901.33 + 426.66 px
            Figma column geometry fits cleanly. */}
        <div className="flex flex-col items-stretch gap-12 lg:flex-row lg:items-start lg:justify-center">
          {/* Left column: contact, address, delivery method */}
          <div
            className="flex w-full min-w-0 flex-col gap-8 lg:flex-1"
            style={{ maxWidth: "901.33px" }}
          >
            <ContactInformationSection contact={CHECKOUT_CONTACT} variant="desktop" />
            <ShippingAddressSection
              addresses={addressList}
              selectedId={selectedAddressId}
              onSelect={setSelectedAddressId}
              onEdit={openEditAddress}
              onAdd={openAddAddress}
              variant="desktop"
            />
            <DeliveryMethodSection
              methods={SHIPPING_METHODS}
              selectedId={selectedShippingId}
              onSelect={setSelectedShippingId}
              variant="desktop"
            />
          </div>

          {/* Right column: promo, order summary card, trust + payments + support */}
          <aside
            className="flex w-full flex-col gap-6 lg:w-[426.66px] lg:shrink-0"
          >
            <PromoCodeSection
              appliedPromo={appliedPromo}
              onApply={setAppliedPromo}
              onClear={() => setAppliedPromo(null)}
              variant="desktop"
            />
            <DesktopOrderSummaryCard
              items={items}
              totals={totals}
              appliedPromo={appliedPromo}
              onContinue={handleContinue}
            />
            <TrustBadgesRow variant="desktop" />
            <PaymentMethodsRow variant="desktop" />
            <SupportCard variant="desktop" />
          </aside>
        </div>
      </div>

      {/* Reused from /account so the visual + animation language stays
          consistent across the app. `initial` discriminates edit (row
          passed in) vs add-new (null). */}
      <AddAddressDrawer
        open={addressDrawer.open}
        onClose={closeAddressDrawer}
        onSubmit={handleSaveAddress}
        initial={addressDrawer.initial}
      />
    </main>
  );
}

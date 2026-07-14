"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { buildAddressLine, formatJOD } from "@/lib/mockCart";
import AddAddressDrawer from "@/components/customer/account/AddAddressDrawer";
import CountryCodePicker from "@/components/customer/contact/CountryCodePicker";
import { useCommerceSettings } from "@/lib/useCommerceSettings";
import { useCart } from "@/lib/useCart";
import { useAddresses } from "@/lib/useAddresses";
import { buildDeliveryMethods } from "@/lib/cartTotals";
import { validateEmail, validatePassword, normalizePhone } from "@/lib/authValidation";
import { DEFAULT_COUNTRY } from "@/lib/countryCodes";
import { fetchCartPromoExamples } from "@/lib/promo";
import { graphqlFetch } from "@/lib/repairClientApi";
import { repairCall } from "@/lib/repairAuthedApi";
import { buildSignInRedirect } from "@/lib/authRedirect";
import {
  useRepairStore,
  selectIsLoggedIn,
  selectUser,
  selectCheckoutInfo,
  isWelcomeBannerDismissedOnDevice,
  markWelcomeBannerDismissedOnDevice,
} from "@/lib/useRepairStore";
import {
  BackStepLink,
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
//
// Wired to real data via:
//   - useCart            → cart items + method-aware totals (guest or DB cart)
//   - useAddresses       → the logged-in user's saved shipping addresses
//   - useCommerceSettings → live delivery methods + shipping/tax rules
//
// Two modes branch on auth:
//   - Guest  → contact section is a REGISTRATION form (email + phone +
//              password); the address is collected locally. "Continue" creates
//              the account (myAppSignUp — email/phone dedup), merges the guest
//              cart, saves the address, then proceeds to /checkout/payment.
//   - Logged-in → email shown read-only; saved addresses managed via the
//              AddAddressDrawer; "Continue" records the selection and proceeds.
//
// The shared chrome (Stepper, FreeShippingBanner, ItemsSection, PromoCodeSection,
// OrderTotalsBlock, trust/payment/support, sticky mobile CTA) comes from
// CartPageClient so the visual language stays identical across the two pages.

// ──────────────────────────────────────────────────────────────────────
// Inline SVG glyphs — small one-off icons not worth adding to /public/cart/.
// inline SVGs survive the Figma 7-day asset URL expiry and keep colors
// controllable via `currentColor`.
// ──────────────────────────────────────────────────────────────────────

function EditPencilIcon({ className = "size-2.5", style }) {
  return (
    <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden className={className} style={style}>
      <path d="M8.5 1.5L10.5 3.5L4 10L1 11L2 8L8.5 1.5Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDownIcon({ className = "size-3", style }) {
  return (
    <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden className={className} style={style}>
      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function PlusGlyph({ className = "size-3", style }) {
  return (
    <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden className={className} style={style}>
      <path d="M6 2V10M2 6H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function HomeFillIcon({ className = "size-5", style }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden className={className} style={style}>
      <path d="M17.4 7.61L11.5 2.92a2.39 2.39 0 0 0-3 0L2.6 7.61A2.7 2.7 0 0 0 1.6 9.7v6.74A2.06 2.06 0 0 0 3.66 18.5h2.18a1 1 0 0 0 1-1v-3.95a1.16 1.16 0 0 1 1.16-1.16h3.99a1.16 1.16 0 0 1 1.16 1.16v3.95a1 1 0 0 0 1 1h2.18a2.06 2.06 0 0 0 2.07-2.06V9.7a2.7 2.7 0 0 0-1-2.09Z" />
    </svg>
  );
}

function BuildingIcon({ className = "size-[14px]", style }) {
  return (
    <svg viewBox="0 0 14 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden className={className} style={style}>
      <rect x="1.5" y="1.5" width="11" height="15" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 5h2M4 8h2M4 11h2M8 5h2M8 8h2M8 11h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M5 16.5v-3h4v3" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Mobile-only: Order Summary toggle bar (Figma 82:3732). Tapping it scrolls
// to the "Your Items" section.
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
          <span className="font-display text-[14px] font-medium leading-5 text-[#11191f]">Order Summary</span>
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
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-2 text-[#11191f] hover:opacity-80">
      <PlusGlyph className="size-3" />
      <span className="font-display text-[12px] font-bold uppercase leading-4 tracking-[0.6px]">Add More</span>
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Contact Information section.
//   Logged-in → read-only account email.
//   Guest     → registration form: email + phone (country picker + digits) +
//               password. All state is lifted to the parent so the mobile and
//               desktop renders share one source of truth.
// ──────────────────────────────────────────────────────────────────────

function GuestPhoneField({ country, onCountryChange, value, onChange, variant }) {
  const desktop = variant === "desktop";
  return (
    <div
      className={
        desktop
          ? "flex h-[50px] w-full items-center gap-2 rounded-[2px] border border-[#e5e7eb] bg-[#f9fafb] px-4 focus-within:border-[#11191f]"
          : "flex h-10 w-full items-center gap-2 rounded-[2px] border border-[#11191f] bg-white px-3"
      }
    >
      <CountryCodePicker value={country} onChange={onCountryChange} />
      <span aria-hidden className={desktop ? "h-3 w-px bg-[#d1d5db]" : "h-2 w-px bg-[#11191f]"} />
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        onKeyDown={(e) => {
          if (e.key.length === 1 && !/\d/.test(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault();
        }}
        placeholder="Phone number"
        aria-label="Phone number"
        className={
          desktop
            ? "h-full w-full bg-transparent font-display text-[16px] leading-normal text-[#11191f] placeholder:text-[#9ca3af] focus:outline-none"
            : "h-full w-full bg-transparent font-display text-[10px] leading-normal text-[#11191f] focus:outline-none"
        }
      />
    </div>
  );
}

function ContactInformationSection({
  variant,
  isGuest,
  userEmail,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  phoneCountry,
  onPhoneCountryChange,
  phoneLocal,
  onPhoneLocalChange,
}) {
  const desktop = variant === "desktop";

  // Logged-in: just the account email, read-only.
  if (!isGuest) {
    return (
      <section className={desktop ? "flex w-full flex-col gap-6" : "flex w-full flex-col gap-4 px-4"}>
        <SectionHeading title="Contact Information" variant={variant} />
        <div
          className={
            desktop
              ? "flex w-full items-center rounded-[2px] border border-[#e5e7eb] bg-[#f9fafb] px-[17px] py-[19px]"
              : "flex h-10 w-full items-center rounded-[2px] border border-[#11191f] bg-white px-3 py-2"
          }
        >
          <span
            className={
              desktop
                ? "font-display text-[16px] leading-normal text-[#11191f]"
                : "font-display text-[10px] leading-normal text-[#11191f]"
            }
          >
            {userEmail}
          </span>
        </div>
      </section>
    );
  }

  // Guest: registration form. The dark-input mobile / grey-input desktop chrome
  // mirrors the original contact section so the page reads the same.
  const inputCls = desktop
    ? "w-full rounded-[2px] border border-[#e5e7eb] bg-[#f9fafb] px-[17px] py-[16px] font-display text-[16px] leading-normal text-[#11191f] placeholder:text-[#9ca3af] focus:border-[#11191f] focus:outline-none"
    : "h-10 w-full rounded-[2px] border border-[#11191f] bg-white px-3 font-display text-[10px] leading-normal text-[#11191f] placeholder:text-[#9ca3af] focus:outline-none";

  return (
    <section className={desktop ? "flex w-full flex-col gap-6" : "flex w-full flex-col gap-4 px-4"}>
      <SectionHeading
        title="Contact Information"
        variant={variant}
        rightSlot={
          <p className={desktop ? "font-display text-[14px] leading-5 text-[#6b7280]" : "font-body text-[11px] leading-4 text-[#6b7280]"} style={desktop ? undefined : condensed}>
            Already have an account?{" "}
            <Link href={buildSignInRedirect("/checkout")} className="font-medium text-[#11191f] underline">
              Log in
            </Link>
          </p>
        }
      />
      <div className="flex w-full flex-col gap-3">
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="Email address"
          aria-label="Email address"
          className={inputCls}
        />
        <GuestPhoneField
          country={phoneCountry}
          onCountryChange={onPhoneCountryChange}
          value={phoneLocal}
          onChange={onPhoneLocalChange}
          variant={variant}
        />
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder="Create a password (min. 8 characters)"
          aria-label="Password"
          className={inputCls}
        />
        <p className={desktop ? "font-display text-[12px] leading-4 text-[#6b7280]" : "font-body text-[10px] leading-4 text-[#6b7280]"} style={desktop ? undefined : condensed}>
          We&rsquo;ll create an account for you so you can track this order.
        </p>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Shipping Address section. Renders a saved-address list (logged-in) or a
// single locally-held address (guest). Empty → just the add CTA.
// ──────────────────────────────────────────────────────────────────────

function AddressKindIcon({ kind, className = "size-5" }) {
  if (kind === "office") return <BuildingIcon className={className} />;
  return <HomeFillIcon className={className} />;
}

function RadioDot({ selected }) {
  if (selected) {
    return (
      <span className="grid size-5 shrink-0 place-items-center rounded-full border" style={{ backgroundColor: "#11191f", borderColor: "#11191f" }}>
        <span className="size-2 rounded-full bg-white" />
      </span>
    );
  }
  return (
    <span className="grid size-5 shrink-0 place-items-center rounded-full border" style={{ borderColor: "#d1d5db" }}>
      <span className="size-2 rounded-full" />
    </span>
  );
}

function AddAddressButton({ onClick, variant }) {
  const desktop = variant === "desktop";
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        desktop
          ? "flex w-full items-center justify-center gap-2 rounded-[6px] border border-dashed border-[#d1d5db] bg-white px-6 py-8 text-[#11191f] hover:border-[#11191f]"
          : "flex w-full items-center justify-center gap-2 rounded-[4px] px-[16.5px] pb-[16.5px] pt-[14.5px]"
      }
      style={desktop ? undefined : { backgroundColor: "#f0f1f3", border: "0.5px solid rgba(0,0,0,0.1)" }}
    >
      <PlusGlyph className="size-3" />
      <span className={desktop ? "font-display text-[13px] font-bold uppercase tracking-[0.6px]" : "font-display text-[12px] font-medium leading-normal text-[#11191f]"}>
        Add Shipping Address
      </span>
    </button>
  );
}

function ShippingAddressSection({ addresses, selectedId, onSelect, onEdit, onAdd, variant, allowAddMore }) {
  const desktop = variant === "desktop";
  const isEmpty = addresses.length === 0;

  if (desktop) {
    return (
      <section className="flex w-full flex-col">
        <div className="py-6">
          <SectionHeading
            title="SHIPPING ADDRESS"
            variant="desktop"
            rightSlot={!isEmpty && allowAddMore ? <AddMoreButton onClick={onAdd} /> : null}
          />
        </div>
        {isEmpty ? (
          <AddAddressButton onClick={onAdd} variant="desktop" />
        ) : (
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
                    <div className="grid size-10 shrink-0 place-items-center rounded-[8px] text-[#11191f]" style={{ backgroundColor: "#f3f4f6" }}>
                      <AddressKindIcon kind={addr.kind} className="size-4" />
                    </div>
                    <div className="flex flex-col items-start gap-[3px]">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-[14px] font-bold leading-5 text-[#11191f]">{addr.label}</h3>
                        {addr.isDefault ? (
                          <span className="font-body text-[10px] leading-[15px] text-[#9ca3af]" style={condensed}>(Default)</span>
                        ) : null}
                      </div>
                      {addr.full_name ? (
                        <p className="font-body text-[13px] font-medium leading-5 text-[#11191f]" style={condensed}>{addr.full_name}</p>
                      ) : null}
                      <p className="max-w-[512px] font-body text-[14px] leading-[22.75px] text-[#6b7280]" style={condensed}>{addr.line}</p>
                      <p className="font-body text-[14px] font-medium leading-5 text-[#6b7280]" style={condensed}>{addr.phone}</p>
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
        )}
      </section>
    );
  }

  // Mobile.
  const selected = addresses.find((a) => a.id === selectedId) ?? addresses[0];
  return (
    <section className="flex w-full flex-col gap-4 px-4">
      <SectionHeading
        title="Shipping Address"
        variant="mobile"
        rightSlot={!isEmpty ? <EditButton onClick={() => onEdit?.(selected)} /> : null}
      />
      {selected ? (
        <div className="flex w-full flex-col gap-2 bg-white p-4" style={{ borderRadius: 4, filter: "drop-shadow(0 0 5px rgba(0,0,0,0.15))" }}>
          <div className="flex w-full items-center gap-3">
            <div className="relative inline-grid place-items-start">
              <div className="col-start-1 row-start-1 size-8 rounded-[4px]" style={{ backgroundColor: "#f0f0f0" }} />
              <div className="col-start-1 row-start-1 ml-[6px] mt-[6px] text-[#11191f]">
                <AddressKindIcon kind={selected.kind} className="size-5" />
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="font-body text-[12px] font-medium leading-normal text-[#11191f]" style={condensed}>
                {selected.label}{" "}
                {selected.isDefault ? (
                  <span className="text-[10px] font-normal" style={{ ...condensed, color: "rgba(17,25,31,0.3)" }}>(Default)</span>
                ) : null}
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-1 font-body text-[10px] leading-normal" style={{ ...condensed, color: "rgba(17,25,31,0.5)" }}>
            {selected.full_name ? <p className="font-medium text-[#11191f]">{selected.full_name}</p> : null}
            <p>{selected.line}</p>
            <p>{selected.phone}</p>
          </div>
        </div>
      ) : null}
      {isEmpty || allowAddMore ? <AddAddressButton onClick={onAdd} variant="mobile" /> : null}
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Shipping / Delivery Method section. Methods + prices come from the live
// commerce settings (buildDeliveryMethods); the selected method drives the
// order-summary shipping line.
// ──────────────────────────────────────────────────────────────────────

function DeliveryMethodRow({ method, selected, onSelect, variant }) {
  const desktop = variant === "desktop";
  const isFree = method.price === 0;
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
          <span className={`font-display text-[14px] leading-5 text-[#11191f] ${desktop ? "font-bold" : selected ? "font-semibold" : "font-medium"}`}>
            {method.label}
          </span>
          {method.description ? (
            <span className="pt-1 font-body text-[12px] leading-4 text-[#6b7280]" style={condensed}>{method.description}</span>
          ) : null}
        </div>
      </div>
      <span className="font-display text-[14px] font-bold leading-5" style={{ color: isFree ? "#16a34a" : "#11191f" }}>
        {isFree ? "Free" : formatJOD(method.price)}
      </span>
    </button>
  );
}

function DeliveryMethodSection({ methods, selectedId, onSelect, variant, freeShippingBanner }) {
  const desktop = variant === "desktop";
  return (
    <section className={desktop ? "flex w-full flex-col gap-6 border-t border-[#f3f4f6] pt-[33px]" : "flex w-full flex-col gap-4 px-4"}>
      <SectionHeading title={desktop ? "Delivery Method" : "Shipping Method"} variant={variant} />
      <div className="flex w-full flex-col gap-3">
        {methods.length === 0 ? (
          <p className="font-body text-[13px] leading-5 text-[#9ca3af]" style={condensed}>Loading delivery options…</p>
        ) : (
          methods.map((m) => (
            <DeliveryMethodRow key={m.id} method={m} selected={m.id === selectedId} onSelect={onSelect} variant={variant} />
          ))
        )}
      </div>
      {!desktop && freeShippingBanner ? freeShippingBanner : null}
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Desktop right column: mini items list + composed Order Summary card.
// ──────────────────────────────────────────────────────────────────────

function MiniItem({ item }) {
  return (
    <div className="flex w-full items-start gap-4">
      <div className="relative h-24 w-16 shrink-0 overflow-hidden bg-[#f3f4f6] shadow-[0_0_12.348px_0_rgba(0,0,0,0.05)]">
        <Image src={item.image} alt={item.name} fill sizes="64px" className="object-cover" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <h4 className="font-display text-[14px] font-bold leading-5 text-[#11191f]">{item.name}</h4>
        <p className="font-body text-[12px] leading-4 text-[#6b7280]" style={condensed}>{item.variantLabel}</p>
        <p className="pt-1 font-display text-[12px] font-medium leading-4 text-[#11191f]">{formatJOD(item.price * item.qty)}</p>
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
      <span className="font-display text-[14px] font-medium leading-5" style={{ color: valueAccent ?? "#11191f" }}>{value}</span>
    </div>
  );
}

function DesktopOrderSummaryCard({ items, totals, appliedPromo, onContinue, submitting }) {
  const { subtotal, discount, shipping, tax, total, itemCount } = totals;
  const taxInclusive = !!totals.taxInclusive;
  const taxLabel = taxInclusive ? "Tax (included)" : "Tax (Estimated)";
  const taxValue = taxInclusive ? totals.taxIncludedAmount ?? 0 : tax;
  return (
    <div className="flex w-full flex-col gap-4 rounded-lg border border-[#f3f4f6] bg-[#f9fafb] p-6">
      <h3 className="w-full border-b border-[#e5e7eb] pb-4 font-display text-[16px] font-bold uppercase leading-6 tracking-[0.4px] text-[#11191f]">
        Order Summary
      </h3>
      <MiniItemsList items={items} />
      <h4 className="pt-2 font-display text-[16px] font-bold uppercase leading-6 tracking-[0.4px] text-[#11191f]">Order Total</h4>
      <div className="flex flex-col gap-4 border-b border-[#e5e7eb] pb-[25px]">
        <TotalsRowSimple label={`Subtotal (${itemCount} items)`} value={formatJOD(subtotal)} />
        <TotalsRowSimple label="Shipping" value={shipping === 0 ? "Free" : formatJOD(shipping)} valueAccent={shipping === 0 ? "#16a34a" : undefined} />
        <TotalsRowSimple label={taxLabel} value={formatJOD(taxValue)} />
        {discount > 0 ? (
          <div className="flex w-full items-center justify-between rounded-[4px] p-2" style={{ backgroundColor: "#f0fdf4" }}>
            <span className="flex items-center gap-2 font-display text-[14px] font-medium leading-5" style={{ color: "#16a34a" }}>
              <Icon name="check-success" className="h-3 w-[10.5px]" />
              <span>Discount ({appliedPromo?.code})</span>
            </span>
            <span className="font-display text-[14px] font-medium leading-5" style={{ color: "#16a34a" }}>-{formatJOD(discount)}</span>
          </div>
        ) : null}
      </div>
      <div className="flex w-full items-center justify-between">
        <span className="font-display text-[18px] font-bold leading-7 text-[#11191f]">Total</span>
        <span className="font-display text-[20px] font-bold leading-8 text-[#11191f]">{formatJOD(total)}</span>
      </div>
      <button
        type="button"
        onClick={onContinue}
        disabled={submitting}
        className="mt-2 flex h-14 w-full items-center justify-center rounded-[4px] text-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.10),0_4px_6px_-4px_rgba(0,0,0,0.10)] disabled:opacity-60"
        style={{ backgroundColor: "#11191f" }}
      >
        <span className="font-display text-[14px] font-bold uppercase leading-6 tracking-[0.8px]">
          {submitting ? "Processing…" : "Continue to Next Step"}
        </span>
      </button>
      <p className="text-center font-body text-[10px] leading-[15px] text-[#9ca3af]" style={condensed}>
        By proceeding to payment, you agree to our{" "}
        <a href="/terms" className="underline">Terms of Service</a> and{" "}
        <a href="/privacy" className="underline">Privacy Policy</a>.
      </p>
      <div className="flex items-center justify-center gap-2 rounded-[4px] py-1.5" style={{ backgroundColor: "#f3f4f6" }}>
        <Icon name="lock-sm" className="h-3 w-[10.5px]" />
        <span className="font-display text-[10px] leading-[15px] text-[#6b7280]">Encrypted &amp; Secure</span>
      </div>
    </div>
  );
}

function CheckoutLoading() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-[#e5e7eb] border-t-[#11191f]" />
        <p className="font-body text-[14px] text-[#6b7280]" style={condensed}>Loading checkout…</p>
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
      <h2 className="font-display text-[20px] font-bold uppercase leading-7 tracking-[-0.5px] text-[#11191f]">Your cart is empty</h2>
      <p className="max-w-[320px] font-body text-[14px] leading-5 text-[#6b7280]" style={condensed}>
        Add a few pieces from the shop before checking out.
      </p>
      <Link href="/shop" className="mt-2 flex h-12 items-center justify-center rounded-[4px] bg-[#11191f] px-8 font-display text-[14px] font-bold uppercase leading-5 text-white tracking-[0.7px]">
        Continue Shopping
      </Link>
    </div>
  );
}

function ErrorBanner({ message, signInLink }) {
  return (
    <div role="alert" className="mx-4 mt-4 flex items-center justify-between gap-3 rounded-[4px] border border-[#fecaca] px-4 py-3 md:mx-8" style={{ backgroundColor: "#fef2f2" }}>
      <span className="font-body text-[13px] leading-5 text-[#b91c1c]" style={condensed}>{message}</span>
      {signInLink ? (
        <Link href={signInLink} className="shrink-0 font-display text-[12px] font-bold uppercase tracking-wide text-[#b91c1c] underline">
          Sign in
        </Link>
      ) : null}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Main client component.
// ──────────────────────────────────────────────────────────────────────

export default function CheckoutDetailsClient() {
  const router = useRouter();
  const isLoggedIn = useRepairStore(selectIsLoggedIn);
  const user = useRepairStore(selectUser);
  const checkoutInfo = useRepairStore(selectCheckoutInfo);
  const isGuest = !isLoggedIn;

  // Selected delivery method (key). Seeded from the store so a back/forward
  // round-trip keeps the choice; reconciled to the first available method once
  // the live list loads.
  const [selectedShippingId, setSelectedShippingId] = useState(
    checkoutInfo.selectedShippingMethodKey || "standard"
  );

  const settings = useCommerceSettings();
  const {
    items,
    loading: cartLoading,
    error: cartError,
    totals,
    updateQty,
    removeItem,
    appliedPromo,
    applyPromo,
    clearPromo,
    promoError,
  } = useCart({ shippingMethodKey: selectedShippingId });

  const { addresses: savedAddresses, loading: addrLoading, saveAddress } = useAddresses();

  // Live delivery methods (enabled only, priced for the current subtotal).
  const methods = useMemo(
    () => buildDeliveryMethods(settings, totals.afterPromo),
    [settings, totals.afterPromo]
  );
  // Keep the selection valid against the live list.
  useEffect(() => {
    if (methods.length === 0) return;
    if (!methods.some((m) => m.id === selectedShippingId)) {
      setSelectedShippingId(methods[0].id);
    }
  }, [methods, selectedShippingId]);

  // Address selection. Logged-in → a saved-address id; guest → the local id.
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [guestAddress, setGuestAddress] = useState(null);
  useEffect(() => {
    if (!isLoggedIn) return;
    // Default to the saved default (or first) address once they load.
    if (savedAddresses.length > 0 && !savedAddresses.some((a) => a.id === selectedAddressId)) {
      const def = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
      setSelectedAddressId(def.id);
    }
  }, [isLoggedIn, savedAddresses, selectedAddressId]);

  const addressList = isLoggedIn ? savedAddresses : guestAddress ? [guestAddress] : [];
  const effectiveSelectedAddressId = isLoggedIn ? selectedAddressId : guestAddress?.id ?? null;

  // Guest registration form state (lifted so mobile + desktop share it).
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneCountry, setPhoneCountry] = useState(DEFAULT_COUNTRY);
  const [phoneLocal, setPhoneLocal] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [signInLink, setSignInLink] = useState(null);

  // Address drawer.
  const [addressDrawer, setAddressDrawer] = useState({ open: false, initial: null });
  const openAddAddress = () => setAddressDrawer({ open: true, initial: null });
  const openEditAddress = (addr) => setAddressDrawer({ open: true, initial: addr });
  const closeAddressDrawer = () => setAddressDrawer((s) => ({ ...s, open: false }));

  const handleSaveAddress = async (next) => {
    // `next` = { label, kind, full_name, phone, country, city, neighborhood,
    //            street, building, apartment }
    if (isLoggedIn) {
      const editingId = addressDrawer.initial?.id;
      try {
        const id = await saveAddress(next, { id: editingId });
        if (id) setSelectedAddressId(id);
      } catch (e) {
        setFormError(String(e?.message || "").replace(/^repairClientApi \S+:\s*/, "") || "Could not save the address");
      }
      return;
    }
    // Guest: hold locally; persisted to the DB after registration.
    const line = buildAddressLine(next);
    const id = addressDrawer.initial?.id ?? "guest-addr";
    setGuestAddress({ id, isDefault: true, line, kind: next.kind, ...next });
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

  const itemsRef = useRef(null);
  const scrollToItems = () => {
    itemsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  const onInc = (it) => updateQty(it, it.qty + 1);
  const onDec = (it) => updateQty(it, Math.max(1, it.qty - 1));
  const onRemove = (it) => removeItem(it);

  // ── Continue ────────────────────────────────────────────────────────
  const proceedToPayment = () => {
    useRepairStore.getState().setShippingMethod(selectedShippingId);
    router.push("/checkout/payment");
  };

  const handleContinue = async () => {
    if (submitting) return;
    setFormError(null);
    setSignInLink(null);

    if (isLoggedIn) {
      if (!effectiveSelectedAddressId) {
        setFormError("Please add a shipping address to continue.");
        return;
      }
      useRepairStore.getState().setSelectedAddress(effectiveSelectedAddressId);
      proceedToPayment();
      return;
    }

    // ── Guest: validate, register, merge, save address, then proceed. ──
    const emailErr = validateEmail(email);
    if (emailErr) return setFormError(emailErr);
    const { phone, error: phoneErr } = normalizePhone(phoneLocal, phoneCountry.dial, phoneCountry.iso2);
    if (phoneErr) return setFormError(phoneErr);
    const pwErr = validatePassword(password);
    if (pwErr) return setFormError(pwErr);
    if (!guestAddress) return setFormError("Please add a shipping address to continue.");

    setSubmitting(true);
    try {
      // welcomeClaimedOnDevice: block a fresh guest-checkout signup on a device
      // that already took the first-order welcome offer (register→redeem is the
      // main abuse vector). Server can only DOWNGRADE eligibility from this.
      const data = await graphqlFetch(
        "myAppSignUp",
        {
          email: email.trim(),
          password,
          phone,
          welcomeClaimedOnDevice: isWelcomeBannerDismissedOnDevice(),
        },
        { token: null, isQuery: false, tableName: "users" }
      );
      // This device has now taken the welcome offer.
      markWelcomeBannerDismissedOnDevice();
      const store = useRepairStore.getState();
      store.setAuthInfo(data);
      // Wait for the guest cart to land in the DB before navigating so the
      // payment step reads a complete cart.
      await store.mergeGuestCartThenSync();
      store.syncWishlist();

      // Persist the address the guest entered; select it for the order.
      const saved = await repairCall(
        "myAppAddAddress",
        {
          label: guestAddress.label,
          full_name: guestAddress.full_name,
          phone: guestAddress.phone,
          country: guestAddress.country,
          city: guestAddress.city,
          neighborhood: guestAddress.neighborhood,
          street: guestAddress.street,
          building: guestAddress.building,
          apartment: guestAddress.apartment,
          is_default: true,
        },
        { isQuery: false }
      );
      const newAddressId = saved?.address?.id ?? null;
      if (newAddressId) store.setSelectedAddress(newAddressId);

      store.setShippingMethod(selectedShippingId);
      router.push("/checkout/payment");
    } catch (err) {
      const raw = err?.message ?? "";
      const msg = raw.split(":").slice(1).join(":").trim() || "Something went wrong, please try again.";
      setFormError(msg);
      // "Email is already in use" / "Phone is already in use" → offer sign-in.
      if (/already in use/i.test(msg)) {
        setFormError(`${msg} Sign in to continue with this account.`);
        setSignInLink(buildSignInRedirect("/checkout"));
      }
      setSubmitting(false);
    }
  };

  // ── Loading / empty gates ────────────────────────────────────────────
  if (cartLoading || (isLoggedIn && addrLoading)) {
    return (
      <main className="flex flex-1 flex-col bg-white">
        <CheckoutLoading />
      </main>
    );
  }
  if (items.length === 0) {
    return (
      <main className="flex flex-1 flex-col bg-white">
        <EmptyCheckout />
      </main>
    );
  }

  const freeShippingMobile = totals.freeShippingEnabled ? (
    <FreeShippingBanner amountToFreeShipping={totals.amountToFreeShipping} freeShippingPct={totals.freeShippingPct} variant="mobile" />
  ) : null;

  const contactProps = {
    isGuest,
    userEmail: user?.email ?? "",
    email,
    onEmailChange: setEmail,
    password,
    onPasswordChange: setPassword,
    phoneCountry,
    onPhoneCountryChange: setPhoneCountry,
    phoneLocal,
    onPhoneLocalChange: setPhoneLocal,
  };

  return (
    <main className="flex flex-1 flex-col bg-white">
      {formError ? <ErrorBanner message={formError} signInLink={signInLink} /> : null}
      {cartError ? <ErrorBanner message={cartError} /> : null}

      {/* ============== MOBILE LAYOUT ============== */}
      <div className="flex flex-col md:hidden">
        <div
          className="sticky top-14 z-10 flex h-24 flex-col items-start border-b border-[#f5f5f5] p-4"
          style={{ backgroundColor: "rgba(255,255,255,0.9)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
        >
          <Stepper activeStep="details" />
        </div>

        <div className="px-4 pt-4">
          <BackStepLink activeStep="details" />
        </div>

        <OrderSummaryToggle itemCount={totals.itemCount} subtotal={totals.subtotal} onToggle={scrollToItems} />

        <div className="flex flex-col gap-4 py-4">
          <ContactInformationSection variant="mobile" {...contactProps} />
        </div>

        <ShippingAddressSection
          addresses={addressList}
          selectedId={effectiveSelectedAddressId}
          onSelect={setSelectedAddressId}
          onEdit={openEditAddress}
          onAdd={openAddAddress}
          variant="mobile"
          allowAddMore={isLoggedIn}
        />

        <div className="mx-4 my-4 h-px bg-[#f3f4f6]" />

        <DeliveryMethodSection
          methods={methods}
          selectedId={selectedShippingId}
          onSelect={setSelectedShippingId}
          variant="mobile"
          freeShippingBanner={freeShippingMobile}
        />

        <div className="mx-4 mt-4 h-px bg-[#f3f4f6]" />

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

        <div className="mx-4 h-px bg-[#f3f4f6]" />

        <div ref={itemsRef}>
          <ItemsSection items={items} onInc={onInc} onDec={onDec} onRemove={onRemove} variant="mobile" />
        </div>

        <div className="mx-4 h-px bg-[#f3f4f6]" />

        <OrderTotalsBlock totals={totals} appliedPromo={appliedPromo} variant="mobile" />

        <div className="flex flex-col gap-4 px-4 pb-4 pt-4">
          <TrustBadgesRow variant="mobile" />
          <PaymentMethodsRow variant="mobile" />
        </div>

        <SupportCard variant="mobile" />
        <PoliciesFootnote />

        <div className="h-32" />

        <StickyCheckoutBar total={totals.total} onContinue={handleContinue} ctaText={submitting ? "Processing…" : "Continue to Next Step"} />
      </div>

      {/* ============== DESKTOP LAYOUT ============== */}
      <div className="mx-auto hidden w-full max-w-[1440px] flex-col gap-12 px-8 pb-20 pt-12 md:flex">
        <BackStepLink activeStep="details" />
        <Stepper activeStep="details" />

        <div className="flex flex-col items-stretch gap-12 lg:flex-row lg:items-start lg:justify-center">
          <div className="flex w-full min-w-0 flex-col gap-8 lg:flex-1" style={{ maxWidth: "901.33px" }}>
            <ContactInformationSection variant="desktop" {...contactProps} />
            <ShippingAddressSection
              addresses={addressList}
              selectedId={effectiveSelectedAddressId}
              onSelect={setSelectedAddressId}
              onEdit={openEditAddress}
              onAdd={openAddAddress}
              variant="desktop"
              allowAddMore={isLoggedIn}
            />
            <DeliveryMethodSection
              methods={methods}
              selectedId={selectedShippingId}
              onSelect={setSelectedShippingId}
              variant="desktop"
            />
          </div>

          <aside className="flex w-full flex-col gap-6 lg:w-[426.66px] lg:shrink-0">
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
            <DesktopOrderSummaryCard
              items={items}
              totals={totals}
              appliedPromo={appliedPromo}
              onContinue={handleContinue}
              submitting={submitting}
            />
            <TrustBadgesRow variant="desktop" />
            <PaymentMethodsRow variant="desktop" />
            <SupportCard variant="desktop" />
          </aside>
        </div>
      </div>

      <AddAddressDrawer
        open={addressDrawer.open}
        onClose={closeAddressDrawer}
        onSubmit={handleSaveAddress}
        initial={addressDrawer.initial}
      />
    </main>
  );
}

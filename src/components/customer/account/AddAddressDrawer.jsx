"use client";

import { useEffect, useState } from "react";
import { BuildingIcon, HomeIcon, LocationIcon } from "./AccountIcons";
import { JORDAN_CITIES } from "@/lib/jordanCities";
import CountryCodePicker from "@/components/customer/contact/CountryCodePicker";
import { DEFAULT_COUNTRY, parseE164, phoneLengthFor } from "@/lib/countryCodes";
import useDelayedUnmount from "@/lib/useDelayedUnmount";

// Strip a leading trunk-0 and any duplicated dial code, returning just the
// national digits we measure + send. Same contract as SignUpForm /
// EditProfileDrawer — the wire format is E.164 (`+<dial><national>`), and the
// backend converts +962 numbers to Thunder's local 10-digit form at dispatch.
function normalizeNational(localDigits, dial) {
  let n = String(localDigits || "").replace(/\D/g, "");
  if (dial && n.startsWith(dial) && n.length > dial.length) n = n.slice(dial.length);
  n = n.replace(/^0+/, "");
  return n;
}

const KIND_OPTIONS = [
  { id: "home", label: "Home", Icon: HomeIcon },
  { id: "office", label: "Office", Icon: BuildingIcon },
  { id: "other", label: "Other", Icon: LocationIcon },
];

// ADD NEW ADDRESS drawer — Figma mobile 79:4500 (frame 79:4413).
//
// Layout (mobile):
//   - Backdrop scrim rgba(17,25,31,0.50).
//   - Floating white card, bottom-anchored, w:361 (clamped to viewport-32),
//     radius:8, padding:24, gap:16.
//   - Header row: "ADD NEW ADDRESS" 12px Zalando Expanded Bold + 24x24
//     outlined close square.
//   - Form (gap:8): Country, City, Neighborhood, Street, [Building |
//     Apartment] row. Each field is 40px tall, rounded-2, 1px #11191f border,
//     px-3 py-2, placeholder Zalando Expanded Medium 10px rgba(17,25,31,0.5).
//   - Footer: [CANCEL outlined | ADD ADDRESS filled] row, each h:32, radius-2,
//     10px Zalando Expanded Bold. ADD ADDRESS is rgba(17,25,31,0.5) when the
//     form isn't valid yet, solid #11191f when ready.
//
// Desktop mirrors AddCardDrawer's `.right-drawer` floating card pattern
// (387px wide, 32px margins, radius-8) — no separate desktop Figma frame
// for this drawer exists.

const EXIT_MS = 320;

// `initial` triggers edit mode. When present the drawer pre-fills the form,
// retitles the header to "EDIT ADDRESS", and renames the submit button to
// "SAVE CHANGES". Caller receives the same shape on submit either way and
// decides whether to insert or update.
export default function AddAddressDrawer({ open, onClose, onSubmit, initial }) {
  const { render, dataState } = useDelayedUnmount(open, EXIT_MS);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!render) return null;
  // Re-key on the editing target so each invocation gets a fresh form-state
  // bucket (no stale fields if the user opens edit-on-A, cancels, opens
  // edit-on-B).
  return (
    <DrawerBody
      key={initial?.id ?? "new"}
      onClose={onClose}
      onSubmit={onSubmit}
      dataState={dataState}
      initial={initial}
    />
  );
}

function DrawerBody({ onClose, onSubmit, dataState, initial }) {
  const editing = !!initial;
  const [label, setLabel] = useState(initial?.label ?? "");
  const [kind, setKind] = useState(initial?.kind ?? "home");
  // Recipient name + phone — required by the backend (myAppAddAddress rejects an
  // address missing full_name/phone). `full_name` accepts the mock `fullName`
  // alias too so an edit pre-fills regardless of which side built the row.
  const [fullName, setFullName] = useState(initial?.full_name ?? initial?.fullName ?? "");
  // Phone is stored as one E.164 string ("+962791234567"). Split it back into
  // { country, local } to prefill the country picker + national field; rebuild
  // "+<dial><national>" on submit. A legacy plain-digit phone (from the old
  // free-text input) parses to no country → fall back to Jordan default and let
  // normalizeNational clean the digits.
  const parsedPhone = parseE164(initial?.phone || "");
  const [phoneCountry, setPhoneCountry] = useState(parsedPhone.country || DEFAULT_COUNTRY);
  const [phoneLocal, setPhoneLocal] = useState(parsedPhone.local || "");
  const [country, setCountry] = useState(initial?.country ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [neighborhood, setNeighborhood] = useState(initial?.neighborhood ?? "");
  const [street, setStreet] = useState(initial?.street ?? "");
  const [building, setBuilding] = useState(initial?.building ?? "");
  const [apartment, setApartment] = useState(initial?.apartment ?? "");

  // Per-country phone length (Jordan = 9 subscriber digits, etc.). The number
  // must clear its country's min/max AFTER stripping the trunk-0 + dup dial.
  const phoneLen = phoneLengthFor(phoneCountry.iso2);
  const phoneNational = normalizeNational(phoneLocal, phoneCountry.dial);
  const phoneValid = phoneNational.length >= phoneLen.min && phoneNational.length <= phoneLen.max;

  function handlePhoneCountryChange(c) {
    const next = phoneLengthFor(c.iso2);
    setPhoneLocal((v) => v.replace(/\D/g, "").slice(0, next.max + 1));
    setPhoneCountry(c);
  }

  // Apartment is optional — title + every other field must be non-empty, and
  // the phone must be a valid number for the selected country.
  const valid =
    label.trim().length > 0 &&
    fullName.trim().length > 0 &&
    phoneValid &&
    country.trim().length > 0 &&
    city.trim().length > 0 &&
    neighborhood.trim().length > 0 &&
    street.trim().length > 0 &&
    building.trim().length > 0;

  function handleSubmit(e) {
    e?.preventDefault?.();
    if (!valid) return;
    onSubmit?.({
      label: label.trim(),
      kind,
      full_name: fullName.trim(),
      // E.164 wire format — `+<dial><national>`.
      phone: `+${phoneCountry.dial}${phoneNational}`,
      country: country.trim(),
      city: city.trim(),
      neighborhood: neighborhood.trim(),
      street: street.trim(),
      building: building.trim(),
      apartment: apartment.trim(),
    });
    onClose?.();
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        data-state={dataState}
        className="drawer-backdrop fixed inset-0 z-40"
        style={{ backgroundColor: "rgba(17,25,31,0.50)" }}
      />

      {/* Mobile bottom card */}
      <aside
        role="dialog"
        aria-label={editing ? "Edit address" : "Add new address"}
        data-state={dataState}
        className="bottom-card fixed left-0 right-0 mx-auto bottom-6 z-50 flex w-[361px] max-w-[calc(100vw-32px)] flex-col gap-4 bg-white shadow-xl md:hidden"
        style={{ borderRadius: 8, padding: 24 }}
      >
        <DrawerHeader onClose={onClose} editing={editing} />
        <AddressForm
          label={label}
          setLabel={setLabel}
          kind={kind}
          setKind={setKind}
          fullName={fullName}
          setFullName={setFullName}
          phoneCountry={phoneCountry}
          onPhoneCountryChange={handlePhoneCountryChange}
          phoneLocal={phoneLocal}
          setPhoneLocal={setPhoneLocal}
          phoneValid={phoneValid}
          country={country}
          setCountry={setCountry}
          city={city}
          setCity={setCity}
          neighborhood={neighborhood}
          setNeighborhood={setNeighborhood}
          street={street}
          setStreet={setStreet}
          building={building}
          setBuilding={setBuilding}
          apartment={apartment}
          setApartment={setApartment}
          inputHeight={40}
          fontSize={10}
        />
        <FooterButtons
          valid={valid}
          editing={editing}
          onCancel={onClose}
          onSubmit={handleSubmit}
          height={32}
          fontSize={10}
        />
      </aside>

      {/* Desktop right drawer */}
      <aside
        role="dialog"
        aria-label={editing ? "Edit address" : "Add new address"}
        data-state={dataState}
        className="right-drawer drawer-scroll fixed right-8 top-8 bottom-8 z-50 hidden w-[387px] flex-col gap-6 overflow-y-auto bg-white shadow-2xl md:flex"
        style={{ padding: 24, borderRadius: 8 }}
      >
        <DrawerHeader onClose={onClose} editing={editing} desktop />
        <AddressForm
          label={label}
          setLabel={setLabel}
          kind={kind}
          setKind={setKind}
          fullName={fullName}
          setFullName={setFullName}
          phoneCountry={phoneCountry}
          onPhoneCountryChange={handlePhoneCountryChange}
          phoneLocal={phoneLocal}
          setPhoneLocal={setPhoneLocal}
          phoneValid={phoneValid}
          country={country}
          setCountry={setCountry}
          city={city}
          setCity={setCity}
          neighborhood={neighborhood}
          setNeighborhood={setNeighborhood}
          street={street}
          setStreet={setStreet}
          building={building}
          setBuilding={setBuilding}
          apartment={apartment}
          setApartment={setApartment}
          inputHeight={48}
          fontSize={13}
        />
        <div className="flex-1" />
        <FooterButtons
          valid={valid}
          editing={editing}
          onCancel={onClose}
          onSubmit={handleSubmit}
          height={48}
          fontSize={14}
        />
      </aside>
    </>
  );
}

function DrawerHeader({ onClose, desktop = false, editing = false }) {
  return (
    <header className="flex w-full items-center justify-between">
      <h2
        className="font-display"
        style={{
          fontWeight: 700,
          fontSize: desktop ? 14 : 12,
          color: "#11191F",
          margin: 0,
          lineHeight: 1,
          letterSpacing: "0.02em",
        }}
      >
        {editing ? "EDIT ADDRESS" : "ADD NEW ADDRESS"}
      </h2>
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
          aria-hidden="true"
        >
          <path d="M7 7l10 10M17 7L7 17" strokeLinecap="round" />
        </svg>
      </button>
    </header>
  );
}

function AddressForm({
  label,
  setLabel,
  kind,
  setKind,
  fullName,
  setFullName,
  phoneCountry,
  onPhoneCountryChange,
  phoneLocal,
  setPhoneLocal,
  phoneValid,
  country,
  setCountry,
  city,
  setCity,
  neighborhood,
  setNeighborhood,
  street,
  setStreet,
  building,
  setBuilding,
  apartment,
  setApartment,
  inputHeight,
  fontSize,
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      <DrawerInput
        value={label}
        onChange={setLabel}
        placeholder="Address Title (e.g. Home, Office)"
        autoComplete="off"
        height={inputHeight}
        fontSize={fontSize}
        aria-label="Address title"
      />
      <KindPicker kind={kind} setKind={setKind} height={inputHeight} fontSize={fontSize} />
      <DrawerInput
        value={fullName}
        onChange={setFullName}
        placeholder="Recipient Full Name"
        autoComplete="name"
        height={inputHeight}
        fontSize={fontSize}
        aria-label="Recipient full name"
      />
      <PhoneField
        country={phoneCountry}
        onCountryChange={onPhoneCountryChange}
        local={phoneLocal}
        setLocal={setPhoneLocal}
        valid={phoneValid}
        height={inputHeight}
        fontSize={fontSize}
      />
      <DrawerInput
        value={country}
        onChange={setCountry}
        placeholder="Country"
        autoComplete="country-name"
        height={inputHeight}
        fontSize={fontSize}
        aria-label="Country"
      />
      <DrawerSelect
        value={city}
        onChange={setCity}
        placeholder="City"
        options={JORDAN_CITIES}
        height={inputHeight}
        fontSize={fontSize}
        aria-label="City"
      />
      <DrawerInput
        value={neighborhood}
        onChange={setNeighborhood}
        placeholder="Neighborhood"
        autoComplete="address-level3"
        height={inputHeight}
        fontSize={fontSize}
        aria-label="Neighborhood"
      />
      <DrawerInput
        value={street}
        onChange={setStreet}
        placeholder="Street"
        autoComplete="address-line1"
        height={inputHeight}
        fontSize={fontSize}
        aria-label="Street"
      />
      <div className="flex w-full gap-2">
        <div className="flex-1">
          <DrawerInput
            value={building}
            onChange={setBuilding}
            placeholder="Building"
            autoComplete="address-line2"
            height={inputHeight}
            fontSize={fontSize}
            aria-label="Building"
          />
        </div>
        <div className="flex-1">
          <DrawerInput
            value={apartment}
            onChange={setApartment}
            placeholder="Apartment"
            autoComplete="address-line3"
            height={inputHeight}
            fontSize={fontSize}
            aria-label="Apartment"
          />
        </div>
      </div>
    </div>
  );
}

function KindPicker({ kind, setKind, height, fontSize }) {
  // Three equal-width tiles matching the input row visuals: 1px #11191f
  // border, 2px radius. Selected tile fills with #f0f0f0 + dark icon; the
  // others stay outlined. Sized to the same height as the surrounding inputs
  // so the form reads as one stack.
  return (
    <div className="flex w-full gap-2" role="radiogroup" aria-label="Address type">
      {KIND_OPTIONS.map(({ id, label: optLabel, Icon }) => {
        const selected = kind === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={optLabel}
            onClick={() => setKind(id)}
            className="flex flex-1 items-center justify-center gap-2 rounded-[2px] border border-[#11191f] text-[#11191f] transition-colors"
            style={{
              height,
              fontSize,
              fontWeight: 700,
              letterSpacing: "0.02em",
              backgroundColor: selected ? "#f0f0f0" : "white",
            }}
          >
            <Icon size={fontSize >= 13 ? 18 : 14} />
            <span className="font-display uppercase">{optLabel}</span>
          </button>
        );
      })}
    </div>
  );
}

// Recipient phone — country-code picker (default Jordan) + digit-only national
// number. Any country is allowed at entry; the stored value is E.164 and the
// backend converts +962 numbers to Thunder's local 10-digit form at dispatch.
// Matches the surrounding inputs' height / 2px radius / #11191f border, with an
// inline error once the user has typed something invalid.
function PhoneField({ country, onCountryChange, local, setLocal, valid, height, fontSize }) {
  const inputMax = phoneLengthFor(country.iso2).max + 1; // +1 absorbs the trunk-0
  return (
    <div className="flex w-full flex-col gap-1">
      <div
        className="flex w-full items-center rounded-[2px] border border-[#11191f] bg-white"
        style={{ height }}
      >
        <div className="flex h-full shrink-0 items-center pl-3">
          <CountryCodePicker value={country} onChange={onCountryChange} />
          <span aria-hidden className="ml-2 h-3 w-px shrink-0 bg-[#d1d5db]" />
        </div>
        <input
          type="tel"
          value={local}
          onChange={(e) => setLocal(e.target.value.replace(/\D/g, "").slice(0, inputMax))}
          onKeyDown={(e) => {
            if (e.key.length === 1 && !/\d/.test(e.key) && !e.ctrlKey && !e.metaKey) {
              e.preventDefault();
            }
          }}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={inputMax}
          autoComplete="tel-national"
          aria-label="Phone number"
          placeholder="Phone Number"
          className="add-card-input h-full w-full bg-transparent pl-3 pr-3 font-display font-medium text-[#11191f] outline-none"
          style={{ fontSize }}
        />
      </div>
      {!valid && local.trim() !== "" ? (
        <span className="font-body text-[11px] text-[#b91c1c]" style={{ fontStretch: "75%" }}>
          Enter a valid phone number for the selected country.
        </span>
      ) : null}
    </div>
  );
}

function DrawerInput({ value, onChange, placeholder, height, fontSize, ...rest }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="add-card-input font-display w-full rounded-[2px] border border-[#11191f] bg-white px-3 py-2 text-[#11191f] outline-none focus:ring-1 focus:ring-[#11191f]"
      style={{
        height,
        fontSize,
        fontWeight: 500,
      }}
      {...rest}
    />
  );
}

// City picker — a controlled <select> over the Jordan-cities list. The empty
// placeholder option keeps the form's `city.trim().length > 0` validity check
// honest (nothing chosen → invalid). A legacy free-text city on an existing
// address (not in `options`) is injected as a selected fallback option so
// edit-mode prefill still shows it until the user re-picks.
function DrawerSelect({ value, onChange, placeholder, options, height, fontSize, ...rest }) {
  const hasLegacy = value && !options.includes(value);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="add-card-input font-display w-full rounded-[2px] border border-[#11191f] bg-white px-3 py-2 text-[#11191f] outline-none focus:ring-1 focus:ring-[#11191f]"
      style={{
        height,
        fontSize,
        fontWeight: 500,
        color: value ? "#11191f" : "rgba(17,25,31,0.5)",
      }}
      {...rest}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {hasLegacy ? <option value={value}>{value}</option> : null}
      {options.map((opt) => (
        <option key={opt} value={opt} style={{ color: "#11191f" }}>
          {opt}
        </option>
      ))}
    </select>
  );
}

function FooterButtons({ valid, editing = false, onCancel, onSubmit, height, fontSize }) {
  return (
    <div className="flex w-full items-center gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="font-display flex-1 rounded-[2px] border border-[#11191f] bg-white text-[#11191f]"
        style={{
          height,
          fontSize,
          fontWeight: 700,
          letterSpacing: "0.02em",
        }}
      >
        CANCEL
      </button>
      <button
        type="button"
        disabled={!valid}
        onClick={onSubmit}
        className="font-display flex-1 rounded-[2px] text-white transition-colors"
        style={{
          height,
          fontSize,
          fontWeight: 700,
          letterSpacing: "0.02em",
          backgroundColor: valid ? "#11191F" : "rgba(17,25,31,0.5)",
          cursor: valid ? "pointer" : "not-allowed",
        }}
      >
        {editing ? "SAVE CHANGES" : "ADD ADDRESS"}
      </button>
    </div>
  );
}

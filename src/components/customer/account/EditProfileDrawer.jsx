"use client";

import { useEffect, useState } from "react";
import CountryCodePicker from "@/components/customer/contact/CountryCodePicker";
import { DEFAULT_COUNTRY, parseE164, phoneLengthFor } from "@/lib/countryCodes";
import useDelayedUnmount from "@/lib/useDelayedUnmount";

// EDIT PERSONAL INFO drawer — lets the signed-in user update their phone
// (with a country-code picker) and date of birth. Email stays read-only
// (changing it would need server-side dedup + session revocation, out of
// scope). Mirrors AddAddressDrawer's chrome: mobile bottom-card + desktop
// right-drawer, the shared .drawer-backdrop / .bottom-card / .right-drawer
// animation classes, a local useDelayedUnmount, and Escape-to-close.
//
// Phone is stored server-side as one E.164 string ("+962791234567"). We split
// it back into { country, local } with parseE164 to prefill, and rebuild
// "+<dial><national>" on submit — stripping a leading trunk-0 and any
// duplicated dial code first, the same contract the auth forms use.

const EXIT_MS = 320;

// Strip a leading trunk-0 and any duplicated dial code, returning just the
// national digits we measure + send.
function normalizeNational(localDigits, dial) {
  let n = String(localDigits || "").replace(/\D/g, "");
  if (dial && n.startsWith(dial) && n.length > dial.length) n = n.slice(dial.length);
  n = n.replace(/^0+/, "");
  return n;
}

export default function EditProfileDrawer({ open, onClose, onSubmit, email, initialPhone, initialDob }) {
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
  // Re-key on the prefill so reopening always starts from the freshest values.
  return (
    <DrawerBody
      key={`${initialPhone ?? ""}|${initialDob ?? ""}`}
      onClose={onClose}
      onSubmit={onSubmit}
      dataState={dataState}
      email={email}
      initialPhone={initialPhone}
      initialDob={initialDob}
    />
  );
}

function DrawerBody({ onClose, onSubmit, dataState, email, initialPhone, initialDob }) {
  const parsed = parseE164(initialPhone || "");
  const [country, setCountry] = useState(parsed.country || DEFAULT_COUNTRY);
  const [local, setLocal] = useState(parsed.local || "");
  const [dob, setDob] = useState(initialDob || "");

  const len = phoneLengthFor(country.iso2);
  const inputMax = len.max + 1; // +1 absorbs the national trunk-0
  const national = normalizeNational(local, country.dial);
  const phoneValid = national.length >= len.min && national.length <= len.max;

  // DOB is optional; the native picker's `max` blocks future dates. Compute
  // today on the client (this drawer only mounts after a user interaction, so
  // there's no SSR hydration concern).
  const todayStr = new Date().toISOString().slice(0, 10);
  const dobValid = !dob || dob <= todayStr;

  const valid = phoneValid && dobValid;

  function handleCountryChange(c) {
    const next = phoneLengthFor(c.iso2);
    setLocal((v) => v.slice(0, next.max + 1));
    setCountry(c);
  }

  function handleSubmit(e) {
    e?.preventDefault?.();
    if (!valid) return;
    onSubmit?.({
      phone: `+${country.dial}${national}`,
      date_of_birth: dob || "",
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
        aria-label="Edit personal information"
        data-state={dataState}
        className="bottom-card fixed left-0 right-0 mx-auto bottom-6 z-50 flex w-[361px] max-w-[calc(100vw-32px)] flex-col gap-4 bg-white shadow-xl md:hidden"
        style={{ borderRadius: 8, padding: 24 }}
      >
        <DrawerHeader onClose={onClose} />
        <ProfileForm
          email={email}
          country={country}
          onCountryChange={handleCountryChange}
          local={local}
          setLocal={setLocal}
          inputMax={inputMax}
          dob={dob}
          setDob={setDob}
          todayStr={todayStr}
          phoneValid={phoneValid}
          inputHeight={40}
          fontSize={12}
        />
        <FooterButtons valid={valid} onCancel={onClose} onSubmit={handleSubmit} height={32} fontSize={10} />
      </aside>

      {/* Desktop right drawer */}
      <aside
        role="dialog"
        aria-label="Edit personal information"
        data-state={dataState}
        className="right-drawer drawer-scroll fixed right-8 top-8 bottom-8 z-50 hidden w-[387px] flex-col gap-6 overflow-y-auto bg-white shadow-2xl md:flex"
        style={{ padding: 24, borderRadius: 8 }}
      >
        <DrawerHeader onClose={onClose} desktop />
        <ProfileForm
          email={email}
          country={country}
          onCountryChange={handleCountryChange}
          local={local}
          setLocal={setLocal}
          inputMax={inputMax}
          dob={dob}
          setDob={setDob}
          todayStr={todayStr}
          phoneValid={phoneValid}
          inputHeight={48}
          fontSize={14}
        />
        <div className="flex-1" />
        <FooterButtons valid={valid} onCancel={onClose} onSubmit={handleSubmit} height={48} fontSize={14} />
      </aside>
    </>
  );
}

function DrawerHeader({ onClose, desktop = false }) {
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
        EDIT PERSONAL INFO
      </h2>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="grid place-items-center"
        style={{ width: 24, height: 24, borderRadius: 2, border: "1px solid #11191F", backgroundColor: "transparent" }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#11191F" strokeWidth="1.5" width="14" height="14" aria-hidden="true">
          <path d="M7 7l10 10M17 7L7 17" strokeLinecap="round" />
        </svg>
      </button>
    </header>
  );
}

function ProfileForm({
  email,
  country,
  onCountryChange,
  local,
  setLocal,
  inputMax,
  dob,
  setDob,
  todayStr,
  phoneValid,
  inputHeight,
  fontSize,
}) {
  return (
    <div className="flex w-full flex-col gap-4">
      {/* Email — read-only context (not editable here). */}
      {email ? (
        <div className="flex w-full flex-col gap-1.5">
          <FieldLabel>Email Address</FieldLabel>
          <div
            className="flex w-full items-center rounded-[2px] border border-[#e5e7eb] bg-[#f9fafb] px-3"
            style={{ height: inputHeight }}
          >
            <span className="font-display text-[#6b7280]" style={{ fontSize }}>
              {email}
            </span>
          </div>
        </div>
      ) : null}

      {/* Phone — country picker + national number. */}
      <div className="flex w-full flex-col gap-1.5">
        <FieldLabel>Phone Number</FieldLabel>
        <div
          className="flex w-full items-center rounded-[2px] border border-[#11191f]"
          style={{ height: inputHeight }}
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
            placeholder="7 9123 4567"
            className="add-card-input h-full w-full bg-transparent pl-3 pr-3 font-display font-medium text-[#11191f] outline-none"
            style={{ fontSize }}
          />
        </div>
        {!phoneValid && local.trim() !== "" ? (
          <span className="font-body text-[11px] text-[#b91c1c]" style={{ fontStretch: "75%" }}>
            Enter a valid phone number for the selected country.
          </span>
        ) : null}
      </div>

      {/* Date of birth — optional, native picker, no future dates. */}
      <div className="flex w-full flex-col gap-1.5">
        <FieldLabel>Date of Birth</FieldLabel>
        <input
          type="date"
          value={dob}
          max={todayStr}
          onChange={(e) => setDob(e.target.value)}
          aria-label="Date of birth"
          className="add-card-input font-display w-full rounded-[2px] border border-[#11191f] bg-white px-3 font-medium text-[#11191f] outline-none"
          style={{ height: inputHeight, fontSize }}
        />
      </div>
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <label
      className="font-body uppercase text-[#6b7280]"
      style={{ fontStretch: "75%", fontWeight: 600, fontSize: 11, letterSpacing: "0.02em" }}
    >
      {children}
    </label>
  );
}

function FooterButtons({ valid, onCancel, onSubmit, height, fontSize }) {
  return (
    <div className="flex w-full items-center gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="font-display flex-1 rounded-[2px] border border-[#11191f] bg-white text-[#11191f]"
        style={{ height, fontSize, fontWeight: 700, letterSpacing: "0.02em" }}
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
        SAVE CHANGES
      </button>
    </div>
  );
}

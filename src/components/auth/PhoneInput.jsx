"use client";

import { useId, useState } from "react";
import CountryCodePicker from "@/components/customer/contact/CountryCodePicker";
import { DEFAULT_COUNTRY, phoneLengthFor } from "@/lib/countryCodes";

// Phone input for the auth surfaces — same floating-label chrome as before,
// but the hardcoded "+962" prefix is replaced with the contact form's
// `CountryCodePicker` so the user can pick any country. Two hidden inputs
// (`${name}DialCode` and `${name}Iso2`) ride alongside the visible phone
// field so a parent reading FormData sees the chosen country.
//
// Digit-only enforcement is preserved: onKeyDown blocks non-digit single
// characters and onChange strips anything that slipped through (e.g. paste).
// inputMode="numeric" gives the numeric keypad on mobile.

export default function PhoneInput({ name = "phone", required = false }) {
  const id = useId();
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [value, setValue] = useState("");
  const isFloating = value !== "";
  const len = phoneLengthFor(country.iso2);
  // Allow one extra digit so the natural national-trunk-zero form (e.g.
  // Jordan's "0791234567" = 10 chars when max-after-stripping-0 is 9) types
  // through cleanly. Validation strips the leading 0 before measuring.
  const inputMax = len.max + 1;

  // When the country changes, trim the value down to the new max so the
  // user isn't stuck holding a too-long number from the previous country.
  const handleCountryChange = (c) => {
    const next = phoneLengthFor(c.iso2);
    setValue((v) => v.slice(0, next.max + 1));
    setCountry(c);
  };

  return (
    <div className="relative h-[50px] w-full border border-[#11191f]">
      <div className="flex h-full items-center">
        <div className="flex h-full shrink-0 items-center pl-4">
          <CountryCodePicker value={country} onChange={handleCountryChange} />
          <span
            aria-hidden
            className="ml-2 h-3 w-px shrink-0 bg-[#d1d5db]"
          />
        </div>
        <div className="relative h-full flex-1">
          <label
            htmlFor={id}
            className={`pointer-events-none absolute font-display text-[14px] font-medium uppercase tracking-[0.7px] text-[#11191f]/50 transition-all duration-150 ${
              isFloating
                ? "left-3 top-0 -translate-y-1/2 bg-white px-1 text-[10px] tracking-[0.5px]"
                : "left-3 top-1/2 -translate-y-1/2"
            }`}
          >
            Phone Number
          </label>
          <input
            id={id}
            type="tel"
            name={name}
            value={value}
            onChange={(e) =>
              setValue(e.target.value.replace(/\D/g, "").slice(0, inputMax))
            }
            onKeyDown={(e) => {
              // Block non-digit single-character keys. Multi-character keys
              // (Backspace, Tab, ArrowLeft, etc.) have key.length > 1 and
              // pass through. Modifier combos (Ctrl/Cmd+V, Ctrl/Cmd+A) also
              // pass through so paste + select-all still work; the onChange
              // filter strips anything non-digit that arrives via paste.
              if (e.key.length === 1 && !/\d/.test(e.key) && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
              }
            }}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={inputMax}
            autoComplete="tel-national"
            required={required}
            className="h-full w-full bg-transparent pl-3 pr-4 font-display text-[14px] font-medium tracking-[0.7px] text-[#11191f] outline-none"
          />
        </div>
      </div>
      <input type="hidden" name={`${name}DialCode`} value={country.dial} />
      <input type="hidden" name={`${name}Iso2`} value={country.iso2} />
    </div>
  );
}

// Shared, pure auth-form validators.
//
// Extracted so the guest-registration form on /checkout reuses the EXACT same
// email / phone / password rules the sign-up form enforces, instead of drifting
// its own copy. Pure functions — no React, no store, no side effects — so they
// can run in event handlers and be unit-tested in isolation.
//
// (SignUpForm.jsx still inlines its own copy of this logic; adopting these
// helpers there is a safe follow-up but intentionally not done here to avoid
// touching a working auth path.)

import { phoneLengthFor } from "@/lib/countryCodes";

// Standard "local@domain.tld" shape — rejects spaces, missing @, missing TLD,
// and stray @ signs. The server (myAppSignUp) runs the same regex as defense in
// depth.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** @returns {string|null} error message, or null when valid. */
export function validateEmail(email) {
  const value = String(email ?? "").trim();
  if (!value) return "Email is required.";
  if (!EMAIL_RE.test(value)) return "Please enter a valid email address.";
  return null;
}

/** @returns {string|null} error message, or null when valid. */
export function validatePassword(password) {
  if (!password || password.length < 8) return "Password must be at least 8 characters.";
  return null;
}

/**
 * Normalize + validate a phone number for the selected country.
 *
 * Strips the national-trunk-zero (e.g. Jordan's "0791234567" → "791234567") AND
 * any dial code the user duplicated into the local field BEFORE measuring the
 * subscriber-digit length, so the per-country spec compares apples to apples —
 * exactly the sequence SignUpForm uses.
 *
 * @param {string} localInput  raw value of the visible phone field
 * @param {string} dialCode    e.g. "962" (no leading +)
 * @param {string} iso2        e.g. "JO" — drives the expected length
 * @returns {{ phone: string|null, error: string|null }}
 *          phone is the E.164 string "+<dial><digits>" when valid.
 */
export function normalizePhone(localInput, dialCode, iso2) {
  const local = String(localInput ?? "").trim();
  const dial = String(dialCode ?? "").trim();
  if (!local) return { phone: null, error: "Phone number is required." };
  if (!dial) return { phone: null, error: "Please select a country code." };

  const localDigits = local
    .replace(/\D/g, "")
    .replace(/^0+/, "")
    .replace(new RegExp(`^${dial}`), "");

  const { min, max } = phoneLengthFor(iso2);
  if (localDigits.length < min || localDigits.length > max) {
    const expected = min === max ? `${min} digits` : `${min}–${max} digits`;
    return { phone: null, error: `Phone number must be ${expected} for the selected country.` };
  }
  return { phone: `+${dial}${localDigits}`, error: null };
}

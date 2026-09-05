"use client";

import { useState } from "react";
import CountryCodePicker from "./CountryCodePicker";
import { DEFAULT_COUNTRY, phoneLengthFor } from "@/lib/countryCodes";
import { repairCall } from "@/lib/repairAuthedApi";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Mirrors MAX_MESSAGE_LEN / MAX_NAME_LEN in resolvers/contact.ts.
//
// These are the only limits the server enforced that the client did not, and
// the gap was a dead end rather than a rough edge: the catch below rewrites
// every server failure as "Something went wrong — please try again", so a
// 4001-character message produced a retry prompt for a condition that retrying
// can never fix. Keep them in step with the resolver.
const MAX_MESSAGE_LEN = 4000;
const MAX_NAME_LEN = 100;

// Contact form — Figma 66:2449. Wired to the public `myAppSendContactMessage`
// mutation on the repair sub-server (no auth required; the guest's null token
// is harmless — same pattern as NewsletterSignup). Client-side validation below
// is the contract the server also enforces.
//
// Field chrome per Figma: 1px #11191f border, 2px radius, Zalando Sans
// Expanded Medium placeholders @ rgba(17,25,31,0.5). The `.contact-input`
// class in globals.css pins font-family + placeholder color so the native
// input doesn't fall back to the body's Arial.
//
// Responsive ramp: at md+ the field heights, placeholder size, and button
// size step up to read comfortably on tablet/desktop while preserving the
// mobile Figma proportions below md.

const FIELD =
  "contact-input w-full rounded-[2px] border border-[#11191f] bg-transparent text-[#11191f] outline-none focus:ring-1 focus:ring-[#11191f]" +
  " h-10 px-3 text-[10px] tracking-[0.4px]" +
  " md:h-12 md:px-4 md:text-[12px]";

export default function ContactForm() {
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    message: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const phoneLen = phoneLengthFor(country.iso2);

  const onChange = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  // Strip non-digits on every keystroke and clamp to the selected country's
  // max length, same approach as the auth PhoneInput.
  const onPhoneChange = (e) =>
    setForm((f) => ({
      ...f,
      phone: e.target.value.replace(/\D/g, "").slice(0, phoneLen.max),
    }));

  // When the country changes, trim the existing phone down to the new max
  // so the user isn't stuck holding a too-long number from the previous
  // country.
  const onCountryChange = (c) => {
    const next = phoneLengthFor(c.iso2);
    setForm((f) => ({ ...f, phone: f.phone.slice(0, next.max) }));
    setCountry(c);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError("");
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("Please enter your first and last name.");
      return;
    }
    if (form.firstName.trim().length > MAX_NAME_LEN || form.lastName.trim().length > MAX_NAME_LEN) {
      setError(`Names must be ${MAX_NAME_LEN} characters or fewer.`);
      return;
    }
    if (!EMAIL_RE.test(form.email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    // Strip the national-trunk-zero AND any duplicated dial code BEFORE
    // measuring length, so the spec compares subscriber digits only.
    const localDigits = form.phone
      .replace(/\D/g, "")
      .replace(/^0+/, "")
      .replace(new RegExp(`^${country.dial}`), "");
    if (localDigits.length < phoneLen.min || localDigits.length > phoneLen.max) {
      const expected =
        phoneLen.min === phoneLen.max ? `${phoneLen.min} digits` : `${phoneLen.min}–${phoneLen.max} digits`;
      setError(`Phone number must be ${expected} for the selected country.`);
      return;
    }
    if (!form.message.trim()) {
      setError("Please enter a message.");
      return;
    }
    if (form.message.trim().length > MAX_MESSAGE_LEN) {
      setError(`Message must be ${MAX_MESSAGE_LEN} characters or fewer.`);
      return;
    }

    // Wire format: full E.164 phone (`+<dial><local>`), matching the auth forms.
    setSubmitting(true);
    try {
      await repairCall(
        "myAppSendContactMessage",
        {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: `+${country.dial}${localDigits}`,
          message: form.message.trim(),
        },
        { isQuery: false }
      );
      setSent(true);
      setForm({ firstName: "", lastName: "", email: "", phone: "", message: "" });
    } catch {
      // Never surface the raw thrown "repairClientApi …" message — client-side
      // validation already caught bad input, so a failure here is network/server.
      setError("Something went wrong — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      className="flex w-full flex-col gap-4 md:gap-5"
      onSubmit={onSubmit}
      noValidate
    >
      <label className="sr-only" htmlFor="contact-first-name">
        First name
      </label>
      <input
        id="contact-first-name"
        type="text"
        name="firstName"
        autoComplete="given-name"
        placeholder="First Name"
        value={form.firstName}
        onChange={onChange("firstName")}
        maxLength={MAX_NAME_LEN}
        className={FIELD}
      />

      <label className="sr-only" htmlFor="contact-last-name">
        Last name
      </label>
      <input
        id="contact-last-name"
        type="text"
        name="lastName"
        autoComplete="family-name"
        placeholder="Last Name"
        value={form.lastName}
        onChange={onChange("lastName")}
        maxLength={MAX_NAME_LEN}
        className={FIELD}
      />

      <label className="sr-only" htmlFor="contact-email">
        Email
      </label>
      <input
        id="contact-email"
        type="email"
        name="email"
        autoComplete="email"
        placeholder="Email"
        value={form.email}
        onChange={onChange("email")}
        className={FIELD}
      />

      <div className="flex h-10 w-full items-center gap-2 rounded-[2px] border border-[#11191f] px-3 md:h-12 md:gap-3 md:px-4">
        <CountryCodePicker value={country} onChange={onCountryChange} />
        <span
          aria-hidden
          className="h-2 w-px shrink-0 bg-[rgba(17,25,31,0.5)] md:h-3"
        />
        <label className="sr-only" htmlFor="contact-phone">
          Phone number
        </label>
        <input
          id="contact-phone"
          type="tel"
          name="phone"
          autoComplete="tel-national"
          placeholder="Phone Number"
          value={form.phone}
          onChange={onPhoneChange}
          onKeyDown={(e) => {
            if (e.key.length === 1 && !/\d/.test(e.key) && !e.ctrlKey && !e.metaKey) {
              e.preventDefault();
            }
          }}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={phoneLen.max}
          className="contact-input h-full w-full bg-transparent text-[10px] tracking-[0.4px] text-[#11191f] outline-none md:text-[12px]"
        />
      </div>

      <label className="sr-only" htmlFor="contact-message">
        Message
      </label>
      <textarea
        id="contact-message"
        name="message"
        rows={6}
        placeholder="Message"
        value={form.message}
        onChange={onChange("message")}
        maxLength={MAX_MESSAGE_LEN}
        className="contact-input w-full resize-none rounded-[2px] border border-[#11191f] bg-transparent p-3 text-[10px] tracking-[0.4px] text-[#11191f] outline-none focus:ring-1 focus:ring-[#11191f] h-[147px] md:h-[180px] md:p-4 md:text-[12px]"
      />

      {error ? (
        <p
          role="alert"
          aria-live="polite"
          className="font-display text-[10px] uppercase tracking-[0.4px] md:text-[12px]"
          style={{ color: "#A50013" }}
        >
          {error}
        </p>
      ) : sent ? (
        <p
          role="status"
          aria-live="polite"
          className="font-display text-[10px] uppercase tracking-[0.4px] md:text-[12px]"
          style={{ color: "#15803d" }}
        >
          Message sent — we&apos;ll get back to you soon.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 flex h-12 w-full items-center justify-center rounded-[6px] border border-[#11191f] font-display text-[14px] font-bold uppercase tracking-[0.6px] text-white disabled:opacity-60 md:h-14 md:text-[15px]"
        style={{ backgroundColor: "#11191f" }}
      >
        {submitting ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}

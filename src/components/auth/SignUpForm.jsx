"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthInput from "@/components/auth/AuthInput";
import PasswordInput from "@/components/auth/PasswordInput";
import PhoneInput from "@/components/auth/PhoneInput";
import AuthButton from "@/components/auth/AuthButton";
import { graphqlFetch } from "@/lib/repairClientApi";
import {
  useRepairStore,
  isWelcomeBannerDismissedOnDevice,
  markWelcomeBannerDismissedOnDevice,
} from "@/lib/useRepairStore";
import { phoneLengthFor } from "@/lib/countryCodes";
import { postAuthDestination } from "@/lib/authRedirect";

export default function SignUpForm() {
  const router = useRouter();
  // Honor `?next=` round-trip from AuthGuard / session-expired flow.
  // The page wraps the form in <Suspense> so useSearchParams is safe here.
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setError("");

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const phoneLocal = String(fd.get("phone") ?? "").trim();
    const phoneDial = String(fd.get("phoneDialCode") ?? "").trim();
    const phoneIso2 = String(fd.get("phoneIso2") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const confirmPassword = String(fd.get("confirmPassword") ?? "");

    if (!email) {
      setError("Email is required.");
      return;
    }
    // Standard "local@domain.tld" shape — rejects spaces, missing @,
    // missing TLD, and stray @ signs. Server still does its own checks.
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!EMAIL_RE.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!phoneLocal) {
      setError("Phone number is required.");
      return;
    }
    if (!phoneDial) {
      setError("Please select a country code.");
      return;
    }
    // Strip the national-trunk-zero (e.g. Jordan's "0791234567" → "791234567")
    // AND any duplicated dial code typed by the user BEFORE measuring length,
    // so the length spec compares apples to apples (subscriber digits only).
    const localDigits = phoneLocal
      .replace(/\D/g, "")
      .replace(/^0+/, "")
      .replace(new RegExp(`^${phoneDial}`), "");
    // Per-country length spec — Jordan is exactly 9, Saudi exactly 9, US/Canada
    // exactly 10, etc. Unmapped countries fall back to 7–14 (E.164 practical).
    const { min, max } = phoneLengthFor(phoneIso2);
    if (localDigits.length < min || localDigits.length > max) {
      const expected = min === max ? `${min} digits` : `${min}–${max} digits`;
      setError(`Phone number must be ${expected} for the selected country.`);
      return;
    }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const phone = `+${phoneDial}${localDigits}`;

    setSubmitting(true);
    try {
      // myAppSignUp is the one surviving generic-shaped mutation — it requires
      // tableName: "users" and the server hardcodes role: "customer".
      // welcomeClaimedOnDevice: if this device already took the first-order
      // welcome offer (registered/redeemed before), tell the server so it
      // creates the account WITHOUT the 10% eligibility — a casual re-signup
      // deterrent. The signal can only DOWNGRADE eligibility server-side.
      const data = await graphqlFetch(
        "myAppSignUp",
        { email, password, phone, welcomeClaimedOnDevice: isWelcomeBannerDismissedOnDevice() },
        { token: null, isQuery: false, tableName: "users" }
      );
      // This device has now taken the welcome offer — block re-signups from
      // re-claiming it (also hides the guest "GET 10% OFF" banner).
      markWelcomeBannerDismissedOnDevice();
      const store = useRepairStore.getState();
      store.setAuthInfo(data);
      // Merge a pre-signup guest cart into the DB, then reconcile the badge.
      store.mergeGuestCartThenSync();
      store.syncWishlist();
      router.push(postAuthDestination({ searchParams, role: data?.user?.role }));
    } catch (err) {
      const raw = err?.message ?? "";
      const after = raw.split(":").slice(1).join(":").trim();
      setError(after || "Something went wrong, please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form className="flex w-full flex-col gap-5" onSubmit={onSubmit} noValidate>
      <AuthInput label="Email Address" type="email" name="email" autoComplete="email" required />
      <PhoneInput name="phone" required />
      <PasswordInput label="Password" name="password" autoComplete="new-password" required />
      <PasswordInput label="Confirm Password" name="confirmPassword" autoComplete="new-password" required />
      {error ? (
        <p
          role="alert"
          aria-live="polite"
          className="font-display text-[12px] uppercase tracking-[0.3px] text-[#A50013]"
        >
          {error}
        </p>
      ) : null}
      <AuthButton disabled={submitting} aria-busy={submitting}>
        {submitting ? "Signing up…" : "Sign Up"}
      </AuthButton>
    </form>
  );
}

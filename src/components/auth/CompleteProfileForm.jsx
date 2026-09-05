"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PhoneInput from "@/components/auth/PhoneInput";
import AuthButton from "@/components/auth/AuthButton";
import { graphqlFetch } from "@/lib/repairClientApi";
import {
  useRepairStore,
  isWelcomeBannerDismissedOnDevice,
  markWelcomeBannerDismissedOnDevice,
} from "@/lib/useRepairStore";
import { phoneLengthFor } from "@/lib/countryCodes";
import { homeForRole, isSameOriginPath } from "@/lib/authRedirect";

const PENDING_GOOGLE_SIGNUP_KEY = "pendingGoogleSignup";

export default function CompleteProfileForm() {
  const router = useRouter();
  // Read the stashed signup in a LAZY INITIALISER, not an effect. sessionStorage
  // is available synchronously on the client, so there is nothing to wait for —
  // and setting it from an effect rendered one pass with `pending: null`, which
  // is the same state as "no pending signup". The effect below then only does
  // the genuinely effectful part: navigating away.
  const [pending] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.sessionStorage.getItem(PENDING_GOOGLE_SIGNUP_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data?.signupToken ? data : null;
    } catch {
      return null;
    }
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // No pending signup — the user shouldn't be here.
    if (!pending) router.replace("/sign-up");
  }, [pending, router]);

  async function onSubmit(e) {
    e.preventDefault();
    if (submitting || !pending?.signupToken) return;
    setError("");

    const fd = new FormData(e.currentTarget);
    const phoneLocal = String(fd.get("phone") ?? "").trim();
    const phoneDial = String(fd.get("phoneDialCode") ?? "").trim();
    const phoneIso2 = String(fd.get("phoneIso2") ?? "").trim();
    if (!phoneLocal) {
      setError("Phone number is required.");
      return;
    }
    if (!phoneDial) {
      setError("Please select a country code.");
      return;
    }
    // Strip the national-trunk-zero AND any duplicated dial code BEFORE
    // measuring length, so the spec compares subscriber digits only.
    const localDigits = phoneLocal
      .replace(/\D/g, "")
      .replace(/^0+/, "")
      .replace(new RegExp(`^${phoneDial}`), "");
    const { min, max } = phoneLengthFor(phoneIso2);
    if (localDigits.length < min || localDigits.length > max) {
      const expected = min === max ? `${min} digits` : `${min}–${max} digits`;
      setError(`Phone number must be ${expected} for the selected country.`);
      return;
    }
    const phone = `+${phoneDial}${localDigits}`;

    setSubmitting(true);
    try {
      // welcomeClaimedOnDevice: a Google signup on a device that already took
      // the first-order welcome offer is created without the 10% eligibility.
      // Downgrade-only server-side; a fresh device (flag false) still gets it.
      const data = await graphqlFetch(
        "myAppCompleteGoogleSignUp",
        {
          signupToken: pending.signupToken,
          phone,
          welcomeClaimedOnDevice: isWelcomeBannerDismissedOnDevice(),
        },
        { token: null, isQuery: false }
      );
      // This device has now taken the welcome offer.
      markWelcomeBannerDismissedOnDevice();
      try {
        window.sessionStorage.removeItem(PENDING_GOOGLE_SIGNUP_KEY);
      } catch {
        /* ignore */
      }
      const store = useRepairStore.getState();
      store.setAuthInfo(data);
      // Merge a pre-signup guest cart into the DB, then reconcile the badge.
      store.mergeGuestCartThenSync();
      store.syncWishlist();
      // Honor the `?next=` round-trip that GoogleSignInButton stashed along
      // with the signupToken — falls back to the role's home if absent or
      // unsafe (the sessionStorage payload could have been tampered with).
      const next = isSameOriginPath(pending?.next) ? pending.next : null;
      router.push(next ?? homeForRole(data?.user?.role));
    } catch (err) {
      const raw = err?.message ?? "";
      const after = raw.split(":").slice(1).join(":").trim();
      setError(after || "Could not finish sign-up. Try again.");
      setSubmitting(false);
    }
  }

  if (!pending) return null;

  return (
    <form className="flex w-full flex-col gap-5" onSubmit={onSubmit} noValidate>
      {pending.email ? (
        <p className="font-display text-[12px] uppercase tracking-[0.3px] text-[#11191f]/60">
          Signing up as <span className="text-[#11191f]">{pending.email}</span>
        </p>
      ) : null}
      <PhoneInput name="phone" required />
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
        {submitting ? "Creating account…" : "Continue"}
      </AuthButton>
    </form>
  );
}

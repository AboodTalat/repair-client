"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthInput from "@/components/auth/AuthInput";
import PasswordInput from "@/components/auth/PasswordInput";
import AuthButton from "@/components/auth/AuthButton";
import { graphqlFetch } from "@/lib/repairClientApi";
import { useRepairStore } from "@/lib/useRepairStore";
import { postAuthDestination } from "@/lib/authRedirect";

export default function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Set by /reset-password after a successful password update so the user
  // returns here with a "your password is updated" confirmation.
  const justReset = searchParams.get("reset") === "1";
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setError("");

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setSubmitting(true);
    try {
      // myAppLogin is a Query on the repair sub-server.
      const data = await graphqlFetch(
        "myAppLogin",
        { email, password },
        { token: null, isQuery: true }
      );
      const store = useRepairStore.getState();
      store.setAuthInfo(data);
      // Merge any guest cart built before sign-in into the DB, then reconcile
      // the badge (mergeGuestCartThenSync seeds the count first so it doesn't
      // blink). Fire-and-forget — don't block the redirect on it.
      store.mergeGuestCartThenSync();
      store.syncWishlist();
      // Honor `?next=` round-trip from AuthGuard / session-expired flow.
      // Falls back to the role's home (customer → /shop, admin → console, etc.).
      router.push(postAuthDestination({ searchParams, role: data?.user?.role }));
    } catch (err) {
      const raw = err?.message ?? "";
      const after = raw.split(":").slice(1).join(":").trim();
      setError(after || "Invalid email or password.");
      setSubmitting(false);
    }
  }

  return (
    <form className="flex w-full flex-col gap-5" onSubmit={onSubmit} noValidate>
      {justReset ? (
        <p
          role="status"
          aria-live="polite"
          className="border border-[#16a34a] bg-[#dcfce7] px-3 py-2 font-display text-[12px] font-semibold uppercase tracking-[0.3px] text-[#166534]"
        >
          Password updated. Sign in with your new password.
        </p>
      ) : null}
      <AuthInput label="Email Address" type="email" name="email" autoComplete="email" required />
      <PasswordInput label="Password" name="password" autoComplete="current-password" required />
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
        {submitting ? "Signing in…" : "Sign In"}
      </AuthButton>
    </form>
  );
}

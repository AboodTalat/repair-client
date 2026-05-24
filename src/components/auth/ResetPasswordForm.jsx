"use client";

/**
 * ResetPasswordForm — reads ?token=... from the URL, validates the new
 * password, calls myAppConfirmPasswordReset (mutation), and routes to
 * /sign-in?reset=1 on success so the sign-in page can flash a success
 * banner above the form.
 *
 * Token validation is lazy: we render the form for everyone and let the
 * server reject bad/expired/used tokens. The inline error explains the
 * outcome and points the user back to /email-sent to request a fresh link.
 *
 * On success, the server revokes every refresh token for the user (see
 * revokeAllRefreshTokensForUser in resolvers/auth.ts), so any session that
 * may have been active on a compromised device is kicked at the same moment
 * the password rotates.
 */

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PasswordInput from "@/components/auth/PasswordInput";
import AuthButton from "@/components/auth/AuthButton";
import { graphqlFetch } from "@/lib/repairClientApi";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = (searchParams.get("token") ?? "").trim();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setError("");

    if (!token) {
      setError("This reset link is invalid. Request a new one.");
      return;
    }

    const fd = new FormData(e.currentTarget);
    const newPassword = String(fd.get("newPassword") ?? "");
    const confirmNewPassword = String(fd.get("confirmNewPassword") ?? "");

    if (!newPassword || newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await graphqlFetch(
        "myAppConfirmPasswordReset",
        { token, newPassword },
        { token: null, isQuery: false }
      );
      router.push("/sign-in?reset=1");
    } catch (err) {
      const raw = err?.message ?? "";
      const after = raw.split(":").slice(1).join(":").trim();
      setError(after || "Could not reset password. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <form
        className="flex w-full flex-col gap-5"
        onSubmit={onSubmit}
        noValidate
      >
        <PasswordInput
          label="New Password"
          name="newPassword"
          autoComplete="new-password"
          required
        />
        <PasswordInput
          label="Confirm New Password"
          name="confirmNewPassword"
          autoComplete="new-password"
          required
        />
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
          {submitting ? "Updating…" : "Reset Password"}
        </AuthButton>
      </form>

      <div className="flex items-center justify-center gap-1 pt-2">
        <span className="font-display text-[12px] font-semibold uppercase leading-[16px] tracking-[0.3px] text-[#11191f]">
          Didn&apos;t receive link?
        </span>
        <Link
          href="/email-sent"
          className="font-display text-[12px] font-semibold uppercase leading-[16px] tracking-[0.3px] text-[#11191f] underline"
        >
          Resend Link
        </Link>
      </div>
    </>
  );
}

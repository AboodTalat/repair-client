"use client";

/**
 * RequestPasswordResetForm — calls myAppRequestPasswordReset (mutation) and
 * swaps to an inline "check your inbox" state on success.
 *
 * The server returns a distinct "Email is not registered" error when the
 * address isn't on file — that flows through to the inline error below,
 * and the success state is only reached for confirmed-registered accounts.
 * (This is a deliberate departure from anti-enumeration in favour of UX
 * clarity; see the matching note in resolvers/auth.ts.)
 *
 * Server-side rate limit: 5/min/IP via sensitiveOpLimiter. Per-user, prior
 * unused tokens are invalidated on each request, so resends are safe — the
 * user just clicks the most recent link they received.
 */

import { useState } from "react";
import AuthInput from "@/components/auth/AuthInput";
import AuthButton from "@/components/auth/AuthButton";
import { graphqlFetch } from "@/lib/repairClientApi";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function RequestPasswordResetForm() {
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function send(addr) {
    if (submitting) return;
    setError("");
    if (!EMAIL_RE.test(addr)) {
      setError("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    try {
      await graphqlFetch(
        "myAppRequestPasswordReset",
        { email: addr },
        { token: null, isQuery: false }
      );
      setSubmittedEmail(addr);
      setSent(true);
    } catch (err) {
      const raw = err?.message ?? "";
      const after = raw.split(":").slice(1).join(":").trim();
      setError(after || "Could not send reset link. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    send(String(fd.get("email") ?? "").trim());
  }

  if (sent) {
    return (
      <div className="flex w-full max-w-[384px] flex-col gap-4">
        <h1 className="font-display text-[18px] font-bold uppercase leading-[normal] tracking-[0.75px] text-[#11191f]">
          Check Your Inbox
        </h1>
        <p className="font-display text-[12px] font-medium uppercase tracking-[0.3px] text-[#11191f]/60">
          A password reset link has been sent to{" "}
          <span className="text-[#11191f]">{submittedEmail}</span>. The link
          expires in 1 hour.
        </p>
        {error ? (
          <p
            role="alert"
            aria-live="polite"
            className="font-display text-[12px] uppercase tracking-[0.3px] text-[#A50013]"
          >
            {error}
          </p>
        ) : null}
        <div className="flex items-center gap-1 pt-2">
          <span className="font-display text-[12px] font-semibold uppercase tracking-[0.3px] text-[#11191f]">
            Didn&apos;t receive it?
          </span>
          <button
            type="button"
            onClick={() => send(submittedEmail)}
            disabled={submitting}
            className="font-display text-[12px] font-semibold uppercase tracking-[0.3px] text-[#11191f] underline disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Resend"}
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setError("");
          }}
          className="self-start font-display text-[12px] font-semibold uppercase tracking-[0.3px] text-[#11191f]/60 underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-[384px] flex-col gap-4">
      <h1 className="font-display text-[18px] font-bold uppercase leading-[normal] tracking-[0.75px] text-[#11191f]/50 md:text-[#11191f]">
        Reset Password
      </h1>
      <form className="flex w-full flex-col gap-6" onSubmit={onSubmit} noValidate>
        <AuthInput
          label="Email Address"
          type="email"
          name="email"
          autoComplete="email"
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
          {submitting ? "Sending…" : "Send Link"}
        </AuthButton>
      </form>
    </div>
  );
}

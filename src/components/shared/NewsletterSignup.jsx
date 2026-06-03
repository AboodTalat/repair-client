"use client";

/**
 * NewsletterSignup — the "Stay in the loop" footer subscribe form, wired to the
 * repair sub-server's public `myAppSubscribeNewsletter` mutation.
 *
 * Lives in shared/ because two domains consume it: the landing `Footer.jsx`
 * (light tone, white surface) and the storefront `ShopFooter.jsx` (dark tone,
 * #11191f surface). The static heading + description stay in those server
 * components — only the interactive form is this client island, so the footers
 * remain server-rendered.
 *
 * Backend contract (Server/servers/repair/src/graphql/resolvers/newsletter.ts):
 *   - Public, no auth required. Idempotent (revives unsubscribed rows).
 *   - Validates the email server-side and queues a welcome email on a NEW
 *     subscribe. We also validate client-side so an obviously-bad address never
 *     reaches the wire.
 *   - Returns `{ message }` on success; a plain string on failure.
 *
 * Conventions honoured:
 *   - All client mutations go through `repairCall` (the single auth-aware
 *     surface). This op is public, so the guest's null token is harmless and
 *     the 401-refresh-retry path never fires.
 *   - Status-message colours use inline `style` (not conditional arbitrary
 *     Tailwind classes), per the Tailwind v4 + Turbopack scanner gotcha for
 *     conditionally-rendered elements.
 */

import Image from "next/image";
import { useState } from "react";
import { repairCall } from "@/lib/repairAuthedApi";

// Same shape the auth forms validate against (SignUpForm / RequestPasswordResetForm).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const TONE = {
  light: {
    input:
      "min-w-0 flex-1 rounded border border-[#11191f] bg-white p-[13px] font-body text-[14px] text-[#232323] placeholder:text-[#232323]/50 focus:outline-none disabled:opacity-60",
    inputStyle: { fontStretch: "75%" },
    button: "grid shrink-0 place-items-center rounded bg-[#11191f] px-5 disabled:opacity-60",
    successColor: "#15803d",
    errorColor: "#b91c1c",
  },
  dark: {
    input:
      "min-w-0 flex-1 border border-white/20 bg-white/10 px-[17px] py-[14px] font-body text-[14px] text-white placeholder:text-[#6b7280] focus:outline-none focus:border-white/40 disabled:opacity-60",
    inputStyle: undefined,
    button:
      "grid shrink-0 place-items-center bg-white px-6 py-[13px] disabled:opacity-60",
    successColor: "#86efac",
    errorColor: "#fca5a5",
  },
};

function SendIcon({ tone }) {
  if (tone === "light") {
    return <Image src="/home/icon-send.svg" alt="" width={12} height={14} />;
  }
  // Shop footer uses an inline arrow glyph (dark stroke on the white button).
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="#11191f"
      strokeWidth="1.6"
      className="size-4"
      aria-hidden
    >
      <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function NewsletterSignup({ tone = "light", source = "footer" }) {
  const t = TONE[tone] ?? TONE.light;
  const [email, setEmail] = useState("");
  // status: "idle" | "submitting" | "success" | "error"
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const submitting = status === "submitting";

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;

    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    setStatus("submitting");
    setMessage("");
    try {
      const res = await repairCall(
        "myAppSubscribeNewsletter",
        { email: value, source },
        { isQuery: false }
      );
      setStatus("success");
      // Prefer the server's friendly message; fall back to fixed copy. Keep the
      // fallback generic — a re-subscribe of an already-active email sends no
      // welcome mail, so don't promise an inbox message.
      setMessage(res?.message || "You're subscribed.");
      setEmail("");
    } catch {
      // Never surface the raw thrown message ("repairClientApi …: …") — show
      // fixed copy. Client-side validation already caught bad addresses, so a
      // failure here is network/server.
      setStatus("error");
      setMessage("Something went wrong — please try again.");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <form className="flex gap-2" onSubmit={handleSubmit} noValidate>
        <input
          type="email"
          name="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error" || status === "success") {
              setStatus("idle");
              setMessage("");
            }
          }}
          placeholder="Enter your email"
          aria-label="Email"
          autoComplete="email"
          disabled={submitting}
          className={t.input}
          style={t.inputStyle}
        />
        <button
          type="submit"
          aria-label="Subscribe"
          disabled={submitting}
          className={t.button}
        >
          <SendIcon tone={tone} />
        </button>
      </form>

      {message ? (
        <p
          role="status"
          aria-live="polite"
          className="font-body text-[13px] leading-4"
          style={{
            color: status === "success" ? t.successColor : t.errorColor,
            ...(t.inputStyle || {}),
          }}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

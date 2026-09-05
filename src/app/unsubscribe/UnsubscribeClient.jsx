"use client";

/**
 * UnsubscribeClient — the landing for the unsubscribe link in broadcast emails.
 *
 * Two paths, decided by the `?token=` query param (read from window so no
 * Suspense boundary is needed for useSearchParams):
 *   • With a token → a CONFIRM button that calls
 *     `myAppUnsubscribeNewsletterByToken`. The token is an unguessable
 *     per-subscriber secret, so the page can honestly say "done" vs
 *     "this link is invalid".
 *   • Without a token → an email-entry fallback that calls the public
 *     `myAppUnsubscribeNewsletter` (constant response — never reveals whether
 *     the address was on the list).
 *
 * WHY THE TOKEN PATH IS NOT AUTOMATIC. It used to fire the mutation from a
 * mount effect: land on the URL, and you were unsubscribed. Mail scanners,
 * link previewers and corporate security proxies fetch every URL in a message
 * — and the ones that detonate links in a headless browser run this page's JS
 * — so an automatic action opts people out who never clicked. That is the
 * worst possible failure here: it is silent, it looks like the user's own
 * choice, and the only way anyone finds out is that a customer stops hearing
 * from us. `Server/servers/formServer/src/graphql/unsubscribe.ts` already
 * settled this question for the coaching side ("GET renders a confirmation
 * page and deliberately does NOT unsubscribe. Only POST mutates") — the store
 * disagreed with its own sibling, and this brings it back in line. One click
 * is also what the one-click-unsubscribe RFC expects of a link in the BODY;
 * `List-Unsubscribe-Post` is a separate header mechanism and is unaffected.
 *
 * Public: both resolvers are unauthenticated, so the guest's null token in
 * `repairCall` is harmless.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { repairCall } from "@/lib/repairAuthedApi";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Mirrors `EMAIL_MAX` in resolvers/newsletter.ts, the width of the
// `newsletter_subscribers.email` column. It has to be checked HERE too: this
// form rewrites every server failure as fixed copy, so a rule only the server
// enforces reaches the visitor as an unexplained error — a retry prompt for a
// condition retrying can never fix. Same coupling as ContactForm/contact.ts.
const EMAIL_MAX = 150;

// "checking" | "confirm" | "working" | "done" | "invalid" | "form" | "submitting" | "submitted" | "error"
export default function UnsubscribeClient() {
  // Starts at "checking" — a spinner that DECIDES but never acts. The token
  // is only readable client-side (window.location), so seeding this at
  // "confirm" server-rendered the confirm button to every visitor, including
  // the no-token ones who should see the email form, and offered a button
  // that did nothing until hydration replaced it.
  const [phase, setPhase] = useState("checking");
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Read the token on mount and choose the path. This effect performs NO
  // mutation — it only decides whether to show the confirm button or the
  // email form. All state updates happen inside the async callback so the
  // window read stays client-only and there's no cascading-render warning.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = new URLSearchParams(window.location.search).get("token");
      if (cancelled) return;
      if (!t) {
        setPhase("form");
        return;
      }
      setToken(t);
      setPhase("confirm");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function confirmToken() {
    if (phase === "working" || !token) return;
    setPhase("working");
    try {
      const res = await repairCall("myAppUnsubscribeNewsletterByToken", { token }, { isQuery: false });
      if (res?.matched) {
        setMessage(res?.email ? `${res.email} has been unsubscribed.` : "You've been unsubscribed.");
        setPhase("done");
      } else {
        setPhase("invalid");
      }
    } catch {
      setPhase("error");
    }
  }

  async function submitEmail(e) {
    e.preventDefault();
    if (phase === "submitting") return;
    const value = email.trim().toLowerCase();
    if (value.length > EMAIL_MAX) {
      setError("That email address is too long.");
      return;
    }
    if (!EMAIL_RE.test(value)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setPhase("submitting");
    try {
      await repairCall("myAppUnsubscribeNewsletter", { email: value }, { isQuery: false });
      // Constant response by design — don't reveal list membership.
      setMessage("If that address was subscribed, it's been removed. You won't receive further newsletters.");
      setPhase("submitted");
    } catch {
      setError("Something went wrong — please try again.");
      setPhase("form");
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f4f5] px-4 py-12">
      <div className="w-full max-w-[440px] rounded-[8px] border border-[#e5e7eb] bg-white p-8 shadow-sm">
        <div className="mb-6 grid place-items-center">
          <span className="font-display text-[24px] font-bold uppercase tracking-[3px] text-[#11191f]">
            REPAIR
          </span>
        </div>

        {phase === "checking" && (
          <div className="grid place-items-center gap-3 py-6">
            <div className="size-6 animate-spin rounded-full border-2 border-[#e5e7eb] border-t-[#11191f]" />
            <p className="font-body text-[14px] text-[#6b7280]">Loading…</p>
          </div>
        )}

        {(phase === "confirm" || phase === "working") && (
          <div className="flex flex-col items-center gap-4 text-center">
            <h1 className="font-display text-[18px] font-bold text-[#11191f]">Unsubscribe</h1>
            <p className="font-body text-[14px] leading-relaxed text-[#6b7280]">
              Confirm below to stop receiving our newsletter. You can re-subscribe any time from the footer of our
              site.
            </p>
            <button
              type="button"
              onClick={confirmToken}
              disabled={phase === "working"}
              className="inline-flex h-11 w-full items-center justify-center rounded bg-[#11191f] px-5 font-display text-[13px] font-semibold uppercase tracking-[1px] text-white hover:bg-[#1c2630] disabled:opacity-60"
            >
              {phase === "working" ? "Unsubscribing…" : "Confirm unsubscribe"}
            </button>
            <Link href="/" className="font-body text-[12px] text-[#9ca3af] hover:text-[#6b7280]">
              Keep my subscription
            </Link>
          </div>
        )}

        {(phase === "done" || phase === "submitted") && (
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-[#f0fdf4] text-[#15803d]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-6" aria-hidden>
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h1 className="font-display text-[18px] font-bold text-[#11191f]">You&apos;re unsubscribed</h1>
            <p className="font-body text-[14px] leading-relaxed text-[#6b7280]">{message}</p>
            <p className="font-body text-[12px] text-[#9ca3af]">
              Changed your mind? You can re-subscribe any time from the footer of our site.
            </p>
            <Link
              href="/"
              className="mt-2 inline-flex h-10 items-center rounded-[2px] bg-[#11191f] px-5 font-display text-[12px] font-semibold uppercase tracking-[1px] text-white hover:bg-[#1c2630]"
            >
              Back to store
            </Link>
          </div>
        )}

        {phase === "invalid" && (
          <div className="flex flex-col items-center gap-3 text-center">
            <h1 className="font-display text-[18px] font-bold text-[#11191f]">Link not recognised</h1>
            <p className="font-body text-[14px] leading-relaxed text-[#6b7280]">
              This unsubscribe link is invalid or has already been used. You can unsubscribe by entering your email
              below instead.
            </p>
            <button
              type="button"
              onClick={() => setPhase("form")}
              className="font-body text-[13px] font-semibold text-[#11191f] underline underline-offset-2"
            >
              Unsubscribe by email
            </button>
          </div>
        )}

        {phase === "error" && (
          <div className="flex flex-col items-center gap-3 text-center">
            <h1 className="font-display text-[18px] font-bold text-[#11191f]">Something went wrong</h1>
            <p className="font-body text-[14px] leading-relaxed text-[#6b7280]">
              We couldn&apos;t process that link. Please try the email form below.
            </p>
            <button
              type="button"
              onClick={() => setPhase("form")}
              className="font-body text-[13px] font-semibold text-[#11191f] underline underline-offset-2"
            >
              Unsubscribe by email
            </button>
          </div>
        )}

        {(phase === "form" || phase === "submitting") && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1 text-center">
              <h1 className="font-display text-[18px] font-bold text-[#11191f]">Unsubscribe</h1>
              <p className="font-body text-[14px] leading-relaxed text-[#6b7280]">
                Enter your email to stop receiving our newsletter.
              </p>
            </div>
            <form className="flex flex-col gap-3" onSubmit={submitEmail} noValidate>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                placeholder="you@example.com"
                aria-label="Email"
                maxLength={EMAIL_MAX}
                autoComplete="email"
                disabled={phase === "submitting"}
                className="rounded border border-[#11191f] bg-white p-[13px] font-body text-[14px] text-[#232323] placeholder:text-[#232323]/50 focus:outline-none disabled:opacity-60"
              />
              {error && <p className="font-body text-[13px] text-[#b91c1c]">{error}</p>}
              <button
                type="submit"
                disabled={phase === "submitting"}
                className="inline-flex h-11 items-center justify-center rounded bg-[#11191f] px-5 font-display text-[13px] font-semibold uppercase tracking-[1px] text-white hover:bg-[#1c2630] disabled:opacity-60"
              >
                {phase === "submitting" ? "Unsubscribing…" : "Unsubscribe"}
              </button>
            </form>
            <Link href="/" className="text-center font-body text-[12px] text-[#9ca3af] hover:text-[#6b7280]">
              Back to store
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

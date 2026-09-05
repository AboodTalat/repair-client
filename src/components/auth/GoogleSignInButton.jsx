"use client";

/**
 * GoogleSignInButton — single-popup Google sign-in via the OAuth2 token
 * client flow.
 *
 * Why this flow (not GSI's id_token credential flow)
 * ─────────────────────────────────────────────────
 * The id_token credential flow only returns an id_token — no access_token.
 * That blocks the People API call we need for the user's phone number.
 * The previous "id_token then access_token" two-popup approach failed
 * because the second popup is opened from inside an async callback, which
 * loses the user-gesture token and Chrome blocks the popup.
 *
 * The token-client flow opens ONE popup with all scopes we need:
 *   openid + email + profile + https://www.googleapis.com/auth/user.phonenumbers.read
 * and returns an access_token. We forward the access_token to the server,
 * which verifies it via /userinfo and (best-effort) fetches the phone
 * via People API server-side.
 *
 * Configuration
 * ─────────────
 *   NEXT_PUBLIC_GOOGLE_CLIENT_ID  — Web OAuth Client ID. Without it the button
 *                                   surfaces an error instead of opening the
 *                                   popup. No Client Secret is required.
 *   Authorized JavaScript origins in Google Cloud must include this app's
 *   origin (exact port, no trailing slash).
 *   OAuth consent screen must list the `user.phonenumbers.read` scope and
 *   your Google account must be a Test User while the app is in Testing.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import GoogleButton from "@/components/auth/GoogleButton";
import { graphqlFetch } from "@/lib/repairClientApi";
import { useRepairStore } from "@/lib/useRepairStore";
import { postAuthDestination, readNextParam } from "@/lib/authRedirect";

const GSI_SRC = "https://accounts.google.com/gsi/client";
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
// Identity-only scopes. We collect the phone number ourselves on a
// /complete-profile page after first Google sign-up — see myAppGoogleAuth /
// myAppCompleteGoogleSignUp on the server. No People API scope needed.
const SCOPES = ["openid", "email", "profile"].join(" ");

const PENDING_GOOGLE_SIGNUP_KEY = "pendingGoogleSignup";

let gsiScriptPromise = null;
function loadGsi() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google);
  if (gsiScriptPromise) return gsiScriptPromise;
  gsiScriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = GSI_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve(window.google);
    s.onerror = () => {
      gsiScriptPromise = null;
      reject(new Error("Failed to load Google Identity Services"));
    };
    document.head.appendChild(s);
  });
  return gsiScriptPromise;
}

export default function GoogleSignInButton({ children }) {
  const router = useRouter();
  // Honor `?next=` round-trip — pages that mount this button already wrap it
  // in <Suspense> via the SignIn / SignUp page shells.
  const searchParams = useSearchParams();
  const tokenClientRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // No setState here — a missing CLIENT_ID is a build-time constant, so the
    // message is derived at render (see `shownError` below) rather than pushed
    // into state by an effect that can only ever run once with the same result.
    if (!CLIENT_ID) return undefined;

    let cancelled = false;
    (async () => {
      try {
        const google = await loadGsi();
        if (cancelled || !google) return;

        // Reusable token client. The per-call callback is overwritten inside
        // handleClick so the popup result is delivered back to React state.
        tokenClientRef.current = google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: () => {},
        });
        setReady(true);
      } catch (err) {
        setError(err?.message || "Google sign-in failed to load.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleClick() {
    if (!ready || busy) return;
    const tokenClient = tokenClientRef.current;
    if (!tokenClient) return;

    setError("");

    // Open the popup synchronously inside the click handler — moving this
    // into a Promise wrapper that `await`s anything beforehand would lose
    // the user-gesture token and Chrome would block the popup.
    tokenClient.callback = async (resp) => {
      const accessToken = resp?.access_token;
      if (!accessToken) {
        setError(resp?.error_description || resp?.error || "Google sign-in was cancelled.");
        return;
      }
      setBusy(true);
      try {
        const data = await graphqlFetch(
          "myAppGoogleAuth",
          { accessToken },
          { token: null, isQuery: false }
        );

        // Brand-new Google user — server hasn't created the row yet.
        // Stash the signup token + the `?next=` round-trip target and
        // route to /complete-profile to capture the phone before the user
        // lands in the database.
        if (data?.needsPhone && data?.signupToken) {
          try {
            window.sessionStorage.setItem(
              PENDING_GOOGLE_SIGNUP_KEY,
              JSON.stringify({
                signupToken: data.signupToken,
                email: data.email ?? "",
                name: data.name ?? "",
                // Survive the /complete-profile hop so the user still lands
                // at their original destination after finishing signup.
                next: readNextParam(searchParams),
              })
            );
          } catch {
            /* sessionStorage may be blocked — the page reads it best-effort */
          }
          router.push("/complete-profile");
          return;
        }

        const store = useRepairStore.getState();
        store.setAuthInfo(data);
        // Merge a pre-login guest cart into the DB, then reconcile the badge.
        store.mergeGuestCartThenSync();
        store.syncWishlist();
        router.push(postAuthDestination({ searchParams, role: data?.user?.role }));
      } catch (err) {
        const raw = err?.message ?? "";
        const after = raw.split(":").slice(1).join(":").trim();
        setError(after || "Google sign-in failed.");
        setBusy(false);
      }
    };
    tokenClient.error_callback = (err) => {
      setError(err?.message || err?.type || "Google sign-in failed.");
    };

    tokenClient.requestAccessToken({ prompt: "consent" });
  }

  // A missing CLIENT_ID is a constant, so it is derived here rather than pushed
  // into `error` state by an effect. A runtime error still wins — it is the more
  // specific, more recent thing that went wrong.
  const shownError = error || (CLIENT_ID ? "" : "Google sign-in is not configured.");

  return (
    <div className="flex w-full flex-col gap-3">
      <GoogleButton onClick={handleClick} disabled={busy || !ready} aria-busy={busy}>
        {busy ? "Signing in…" : children}
      </GoogleButton>
      {shownError ? (
        <p
          role="alert"
          aria-live="polite"
          className="font-display text-[12px] uppercase tracking-[0.3px] text-[#A50013]"
        >
          {shownError}
        </p>
      ) : null}
    </div>
  );
}

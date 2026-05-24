"use client";

/**
 * StoreProvider — mounts the Zustand store, runs the rehydrate + initial
 * sync, and owns the cross-cutting auth-lifecycle UX:
 *
 *   • Proactive access-token refresh on tab focus, network reconnect, and
 *     immediately after rehydrate.  StoreProvider is the only place this is
 *     wired so individual components don't each need to remember to do it.
 *
 *   • Session-expired handler — subscribes to `sessionExpired` and, when it
 *     flips true (refresh failed, or a sibling tab broadcast the failure),
 *     shows a non-blocking toast and pushes the user to
 *     /sign-in?next=<current path>.  Cart + wishlist are intentionally
 *     preserved across this redirect (see `handleSessionExpired` in
 *     `useRepairStore.js`) so the user's basket survives the round-trip.
 *
 *   • Storage-deletion + BroadcastChannel listeners — `initRepairStoreListener`
 *     watches for cross-tab + same-tab localStorage deletion AND attaches
 *     the BroadcastChannel("repair-auth") receiver that keeps the access /
 *     refresh token pair in lock-step across every open tab.  Without
 *     cross-tab sync, a second tab would refresh independently using the
 *     already-rotated token and the server's reuse-detection would revoke
 *     the whole token family — silently logging the user out everywhere.
 *
 * Why we await rehydrate
 * ──────────────────────
 * Zustand's persist middleware updates state inside a `.then()` callback,
 * which runs as a microtask — even when the underlying storage
 * (localStorage) is synchronous.  Reading state immediately after a bare
 * `rehydrate()` call reads the PRE-rehydrate values, so the
 * `authInfo.isLoggedIn` check below would always be false on page reload.
 * Awaiting fixes it.
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  useRepairStore,
  initRepairStoreListener,
  selectSessionExpired,
} from "@/lib/useRepairStore";
import { isSameOriginPath, buildSignInRedirect } from "@/lib/authRedirect";

// StoreProvider is mounted in the root layout, so we deliberately AVOID
// `useSearchParams` / `usePathname` from `next/navigation` — both would
// either force the entire app to opt out of static rendering or require a
// Suspense boundary the root layout doesn't currently have.  The
// session-expired path runs client-side only, so reading
// `window.location.pathname` + `window.location.search` directly inside the
// effect is both sufficient and side-effect-free.

// Path-equality guard: don't redirect to /sign-in if we're already there
// (the auth pages and any GuestGuard-protected route would otherwise loop).
const AUTH_PREFIXES = ["/sign-in", "/sign-up", "/email-sent", "/reset-password", "/complete-profile"];

function isAuthRoute(pathname) {
  if (!pathname) return false;
  return AUTH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default function StoreProvider({ children }) {
  const router = useRouter();
  const sessionExpired = useRepairStore(selectSessionExpired);
  // Toast visibility is derived from `sessionExpired` directly — when the
  // flag flips true and we're not on an auth route, the toast renders; the
  // session-expired effect's setTimeout calls `clearSessionExpired()` which
  // hides it again on the next render.  Avoiding a separate `useState` here
  // dodges the react-hooks/set-state-in-effect lint rule.
  const onAuthRoute =
    typeof window !== "undefined" && isAuthRoute(window.location.pathname);
  const toastVisible = sessionExpired && !onAuthRoute;

  // ── Rehydrate + initial sync + listeners ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      await useRepairStore.persist.rehydrate();
      if (cancelled) return;

      const { authInfo, syncCart, syncWishlist, maybeProactiveRefresh } =
        useRepairStore.getState();
      if (authInfo.isLoggedIn && authInfo.token) {
        // A tab that's been asleep for hours might rehydrate a token that's
        // about to expire — refresh proactively before we fire the initial
        // syncs so they don't burn a 401 + retry on every page load.
        await maybeProactiveRefresh();
        const post = useRepairStore.getState();
        if (post.authInfo.isLoggedIn && post.authInfo.token) {
          post.syncCart();
          post.syncWishlist();
        }
      }
    })();

    const cleanup = initRepairStoreListener();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  // ── Proactive refresh on tab focus + network reconnect ───────────────────
  //
  // E-commerce sessions are bursty: the user opens the tab, browses, walks
  // away for 20 minutes, comes back to check out.  Without this, the first
  // click after returning hits a 401 → refresh round-trip → retry, which
  // adds a noticeable lag at the worst possible moment.  Doing it on
  // visibilitychange + online means the token is ready by the time they
  // click anything.
  useEffect(() => {
    function onFocus() {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      const { authInfo, maybeProactiveRefresh } = useRepairStore.getState();
      if (authInfo.isLoggedIn) maybeProactiveRefresh();
    }
    function onOnline() {
      const { authInfo, maybeProactiveRefresh, syncCart, syncWishlist } =
        useRepairStore.getState();
      if (!authInfo.isLoggedIn) return;
      // Network was down — token may have expired during the outage AND the
      // server-side cart/wishlist may have moved (another device).  Refresh
      // first, then reconcile.
      maybeProactiveRefresh().then(() => {
        const post = useRepairStore.getState();
        if (post.authInfo.isLoggedIn) {
          post.syncCart();
          post.syncWishlist();
        }
      });
    }

    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  // ── Session-expired UX: toast + redirect with ?next= ─────────────────────
  //
  // Guarded with a ref so a transient state churn (e.g. broadcast arriving
  // milliseconds after our own refresh failed) doesn't fire the toast +
  // redirect pair twice.
  const handledRef = useRef(false);
  useEffect(() => {
    if (!sessionExpired) {
      handledRef.current = false;
      return;
    }
    if (handledRef.current) return;
    handledRef.current = true;

    // Read the user's current location directly from window — we avoid
    // `useSearchParams` / `usePathname` so the root layout doesn't opt the
    // whole app out of static rendering (see file-top note).  This effect
    // is client-only so `window` is always defined here.
    const pathname = window.location.pathname;
    const search = window.location.search;

    // Don't redirect-loop if the user is already on an auth screen.  Still
    // clear the flag so a later expired-session won't be skipped.
    if (isAuthRoute(pathname)) {
      useRepairStore.getState().clearSessionExpired();
      return;
    }

    // Toast is already visible via the derived `toastVisible` above.

    // Preserve the user's intended destination.  Validate it's a same-origin
    // path before round-tripping it so a crafted referrer can't turn the
    // sign-in flow into an open redirect.
    const here = `${pathname || "/"}${search || ""}`;
    const safeNext = isSameOriginPath(here) ? here : "/shop";

    // Brief delay so the toast is visible before we navigate away.
    // Clearing the flag also hides the toast (it's derived from the flag).
    const id = setTimeout(() => {
      useRepairStore.getState().clearSessionExpired();
      router.replace(buildSignInRedirect(safeNext));
    }, 1400);

    return () => clearTimeout(id);
  }, [sessionExpired, router]);

  return (
    <>
      {children}
      {toastVisible ? <SessionExpiredToast /> : null}
    </>
  );
}

/**
 * SessionExpiredToast — small dark slab anchored to the top of the viewport.
 * Mirrors the visual language of CardAddedBanner / AddressDeletedBanner so
 * users don't have to learn a new pattern.  Background set via inline style
 * per the Tailwind v4 + Turbopack arbitrary-bg-class gotcha.
 */
function SessionExpiredToast() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed left-0 right-0 top-[64px] z-[60] flex justify-center px-4 md:top-[80px]"
    >
      <div
        className="pointer-events-auto flex w-full max-w-[480px] items-center justify-center px-4 py-3 font-display text-[12px] font-semibold uppercase tracking-[0.4px] text-white"
        style={{ backgroundColor: "#11191f" }}
      >
        Your session expired. Please sign in again.
      </div>
    </div>
  );
}

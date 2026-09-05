"use client";

/**
 * GuestGuard — inverse of AuthGuard.
 *
 * Wraps the (auth) layout so a returning, already-logged-in user can never
 * land on /sign-in, /sign-up, /reset-password, /email-sent, or
 * /complete-profile.  Instead we push them to the home route for their role:
 *
 *   admin       → /r3pr-console
 *   delivery    → /r3pr-dispatch
 *   accounting  → /r3pr-ledger
 *   customer    → /shop
 *
 * Hydration handling mirrors AuthGuard — `useRepairStore` is `skipHydration:
 * true` and rehydrates inside a microtask via StoreProvider, so we wait for
 * `persist.hasHydrated()` before deciding.  Otherwise every first paint would
 * see `isLoggedIn === false` and the guard would never fire for returning
 * users.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRepairStore } from "@/lib/useRepairStore";
import { postAuthDestination } from "@/lib/authRedirect";
import useStoreHydrated from "@/lib/useStoreHydrated";

export default function GuestGuard({ children }) {
  const router = useRouter();
  const ready = useStoreHydrated();

  const isLoggedIn = useRepairStore((s) => s.authInfo.isLoggedIn);
  const token = useRepairStore((s) => s.authInfo.token);
  const role = useRepairStore((s) => s.authInfo.user?.role);
  const loggedIn = isLoggedIn && !!token;

  useEffect(() => {
    if (!ready) return;
    if (!loggedIn) return;
    // Honor the same `?next=` round-trip the auth forms use. A guest bounced to
    // /sign-in?next=<page> (e.g. the product page's "Notify when available"
    // flow) must return to <page> after auth, not the role's home. GuestGuard's
    // redirect fires when sign-in flips isLoggedIn true and would otherwise race
    // the form's push and win with homeForRole — landing the user on /shop. Use
    // postAuthDestination so it falls back to the role home only when there's no
    // safe next. searchParams comes from window (no useSearchParams → no extra
    // Suspense boundary on the auth layout), matching AuthGuard's approach.
    const searchParams =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : null;
    router.replace(postAuthDestination({ searchParams, role }));
  }, [ready, loggedIn, role, router]);

  if (!ready) return null;
  if (loggedIn) return null;
  return children;
}

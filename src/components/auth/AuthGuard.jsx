"use client";

/**
 * AuthGuard — client-side gate for role-group layouts.
 *
 * Renders children only when the store has finished rehydrating AND the user
 * has a token + isLoggedIn === true.  Otherwise it returns null and pushes
 * the user to /sign-in?next=<current path> so they're round-tripped back
 * after a successful sign-in.
 *
 * Why we wait for hydration
 * ─────────────────────────
 * useRepairStore uses `skipHydration: true` and rehydrates inside a microtask
 * via StoreProvider.  Before that completes, `isLoggedIn` reads `false` even
 * for a returning user — guarding on it directly would flash everyone to
 * /sign-in on every page reload.  `persist.hasHydrated()` + `onFinishHydration`
 * give us the right "ready" signal.
 *
 * Open-redirect protection on the round-trip target lives in
 * `@/lib/authRedirect` so the same rules apply to the sign-in / sign-up /
 * Google / complete-profile destinations.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRepairStore } from "@/lib/useRepairStore";
import { buildSignInRedirect } from "@/lib/authRedirect";

export default function AuthGuard({ children }) {
  const router = useRouter();
  const [ready, setReady] = useState(() =>
    typeof window === "undefined" ? false : useRepairStore.persist.hasHydrated()
  );

  useEffect(() => {
    if (ready) return undefined;
    if (useRepairStore.persist.hasHydrated()) {
      setReady(true);
      return undefined;
    }
    const unsub = useRepairStore.persist.onFinishHydration(() => setReady(true));
    return unsub;
  }, [ready]);

  const isLoggedIn = useRepairStore((s) => s.authInfo.isLoggedIn);
  const token = useRepairStore((s) => s.authInfo.token);
  const allowed = isLoggedIn && !!token;

  useEffect(() => {
    if (!ready) return;
    if (allowed) return;
    // Read window directly to avoid pulling `useSearchParams` /
    // `usePathname` into every guarded layout (each would need its own
    // Suspense boundary).  This effect runs client-only, so `window` is
    // always defined here.
    const here = `${window.location.pathname}${window.location.search}`;
    router.replace(buildSignInRedirect(here));
  }, [ready, allowed, router]);

  if (!ready || !allowed) return null;
  return children;
}

"use client";

/**
 * RoleGuard — role-aware client gate. Generalizes AuthGuard with two modes.
 *
 * Props:
 *   allow        array of role strings permitted on this surface, e.g. ["admin"].
 *                Use the canonical role keys (admin / delivery / accounting /
 *                customer) — the SAME strings `homeForRole` keys off, NOT the
 *                route-group folder names. A mismatch silently bounces every
 *                legitimate user to /shop.
 *   requireAuth  see the two modes below (default false).
 *
 * requireAuth = true — protected surfaces (admin / accountant / delivery shells,
 *   the customer /account subtree). Mirrors the old AuthGuard, plus role:
 *     • waits for store hydration (renders null) so a returning user isn't
 *       flashed to /sign-in on every reload
 *     • not signed in          → router.replace(/sign-in?next=…); render null
 *     • signed in, role ∉ allow → router.replace(homeForRole(role)); render null
 *     • signed in, role ∈ allow → render children
 *
 * requireAuth = false — public customer storefront. Guests + allowed roles must
 *   see content immediately (these pages are public and server-rendered), so we
 *   do NOT blank during hydration:
 *     • render children for everyone EXCEPT a signed-in user whose role ∉ allow
 *       (a stakeholder who wandered onto a customer URL), who is redirected to
 *       their own home and shown null while the bounce happens.
 *
 * This is UX routing / defense-in-depth, NOT the security boundary — the real
 * enforcement is the server-side getAuth + hasRole check in every resolver. The
 * role lives in (encrypted) localStorage, not a cookie, so it's unreadable
 * during SSR; a stakeholder who *reloads* a customer URL sees a brief flash
 * before the client-side bounce. Removing that flash would need a role cookie +
 * middleware (a separate architectural change).
 *
 * Open-redirect protection on the sign-in round-trip lives in `@/lib/authRedirect`.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRepairStore } from "@/lib/useRepairStore";
import { buildSignInRedirect, homeForRole } from "@/lib/authRedirect";

export default function RoleGuard({ allow = [], requireAuth = false, children }) {
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
  const role = useRepairStore((s) => s.authInfo.user?.role);

  const authed = isLoggedIn && !!token;
  const roleAllowed = !!role && allow.includes(role);

  useEffect(() => {
    if (!ready) return;
    // Read window directly (client-only effect) to avoid pulling
    // `useSearchParams` / `usePathname` into every guarded layout — each would
    // need its own Suspense boundary. Mirrors AuthGuard / StoreProvider.
    if (requireAuth && !authed) {
      const here = `${window.location.pathname}${window.location.search}`;
      router.replace(buildSignInRedirect(here));
      return;
    }
    if (authed && role && !roleAllowed) {
      router.replace(homeForRole(role));
    }
  }, [ready, authed, role, roleAllowed, requireAuth, router]);

  if (requireAuth) {
    // Hide protected content until hydrated AND confirmed authorized.
    if (!ready || !authed || !roleAllowed) return null;
    return children;
  }

  // Public mode: only a signed-in wrong-role user is withheld (being bounced);
  // guests, customers, and the pre-hydration paint all see the page.
  if (ready && authed && role && !roleAllowed) return null;
  return children;
}

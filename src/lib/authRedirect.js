"use client";

/**
 * authRedirect — shared `?next=` plumbing for the sign-in / sign-up /
 * Google / complete-profile forms and for the AuthGuard.
 *
 * Why it lives in one file
 * ────────────────────────
 * `?next=` rules are subtle (open-redirect prevention + role-home fallback)
 * and used in five places.  A single source of truth keeps the
 * validation identical so a bypass added by an honest refactor in one form
 * doesn't accidentally widen the attack surface for the others.
 *
 * Open-redirect guard
 * ───────────────────
 * Only paths that:
 *   • start with a single `/`,
 *   • are NOT protocol-relative (`//evil.com/...`),
 *   • are NOT backslash-prefixed (`/\evil.com` — IE/Edge interpreted as `//`),
 * are accepted.  Anything else falls back to the role's home route.
 */

const ROLE_HOMES = {
  admin: "/r3pr-console",
  delivery: "/r3pr-dispatch",
  accounting: "/r3pr-ledger",
  customer: "/shop",
};

/** Default post-sign-in destination for a role. */
export function homeForRole(role) {
  return ROLE_HOMES[role] ?? ROLE_HOMES.customer;
}

/** True iff `p` is a same-origin path safe to navigate to. */
export function isSameOriginPath(p) {
  if (typeof p !== "string" || p.length === 0) return false;
  if (!p.startsWith("/")) return false;
  if (p.startsWith("//")) return false;
  if (p.startsWith("/\\")) return false;
  return true;
}

/**
 * Read `?next=` from a Next.js `searchParams` (URLSearchParams-like) and
 * return either the validated path or null.  Forms call this and use the
 * result as the post-success router.push target.
 */
export function readNextParam(searchParams) {
  const raw = searchParams?.get?.("next");
  if (typeof raw !== "string" || raw.length === 0) return null;
  return isSameOriginPath(raw) ? raw : null;
}

/**
 * Build a `/sign-in?next=<encoded>` URL for AuthGuard / SessionProvider.
 * Pass `here` as `pathname + (search ? "?" + search : "")`.
 */
export function buildSignInRedirect(here) {
  if (!isSameOriginPath(here)) return "/sign-in";
  return `/sign-in?next=${encodeURIComponent(here)}`;
}

/**
 * Pick the post-auth destination.  Honors `?next=` if present and safe,
 * otherwise falls back to the role's home.  All four sign-in / sign-up
 * flows funnel through this so behaviour stays uniform.
 */
export function postAuthDestination({ searchParams, role }) {
  return readNextParam(searchParams) ?? homeForRole(role);
}

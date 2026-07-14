"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/shared/Sidebar";
import ComingSoonTag from "@/components/shared/ComingSoonTag";
import { sidebarItems as buildSidebarItems } from "@/lib/storeNav";
import {
  useRepairStore,
  selectIsLoggedIn,
  selectUser,
  selectWelcomeDiscountEligible,
  isWelcomeBannerDismissedOnDevice,
  markWelcomeBannerDismissedOnDevice,
  subscribeWelcomeBannerDismissed,
} from "@/lib/useRepairStore";
import { repairCall } from "@/lib/repairAuthedApi";
import { accountHrefForRole } from "@/lib/authRedirect";

export default function Header({ categories = [] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isAuthenticated = useRepairStore(selectIsLoggedIn);
  const user = useRepairStore(selectUser);
  // A newly-registered customer who hasn't used their first-order discount yet —
  // the announcement bar confirms the offer is live instead of inviting sign-in.
  const welcomeEligible = useRepairStore(selectWelcomeDiscountEligible);
  // Device-level "welcome discount already redeemed here" flag (survives logout
  // — see useRepairStore). Read via useSyncExternalStore so localStorage is read
  // client-side only (server snapshot = false → SSR + first render both omit the
  // banner, no hydration flash) and the banner re-hides reactively when the flag
  // is set in this tab/another tab — all without a setState-in-effect.
  const bannerDismissed = useSyncExternalStore(
    subscribeWelcomeBannerDismissed,
    isWelcomeBannerDismissedOnDevice, // client snapshot
    () => false // server snapshot
  );
  // When a logged-in, non-eligible user is seen (they've used it elsewhere or
  // aren't entitled), stamp the device so the guest banner stays hidden after
  // they log out. Pure side-effect (localStorage write + event) — no setState.
  useEffect(() => {
    if (isAuthenticated && !welcomeEligible) markWelcomeBannerDismissedOnDevice();
  }, [isAuthenticated, welcomeEligible]);
  // Stakeholders get their console home; customers + guests get /account.
  const accountHref = accountHrefForRole(user?.role);

  const sidebarItems = buildSidebarItems(categories, isAuthenticated);

  // ── Responsive nav overflow ──────────────────────────────────────────────
  // With many (or long-named) major categories the horizontal desktop nav runs
  // out of room and the labels shove the right-side icon cluster (search / cart
  // / account / login-logout) off the edge of the bar — the login/logout icon
  // disappears entirely. Rather than pick an arbitrary category-count cutoff we
  // MEASURE the nav: a hidden, off-screen copy of the full nav (`measureNavRef`)
  // reports the width the labels need; if that plus the left logo lane and the
  // right-side icon cluster can't fit the bar, we collapse the desktop header to
  // the mobile-style layout (hamburger + centered logo + the Sidebar drawer for
  // categories). The measurer is always mounted so the check works in BOTH
  // directions (collapse on overflow, expand again when the window widens /
  // categories shrink). Mirrors the proven approach in customer/shop/ShopHeader.
  const barRef = useRef(null);
  const measureNavRef = useRef(null);
  const [navOverflow, setNavOverflow] = useState(false);

  useEffect(() => {
    const measure = () => {
      const bar = barRef.current;
      const mnav = measureNavRef.current;
      // bar is display:none below md (clientWidth 0) — the separate mobile bar
      // handles small screens, so skip the check there.
      if (!bar || !mnav || bar.clientWidth === 0) return;
      const cs = window.getComputedStyle(bar);
      const padding =
        parseFloat(cs.paddingLeft || "0") + parseFloat(cs.paddingRight || "0");
      // search + cart + (account + logout | sign-in) icon cluster + gaps.
      const RIGHT_RESERVE = isAuthenticated ? 180 : 140;
      const LOGO_RESERVE = 56; // left logo lane (in-flow when not collapsed)
      const GAP = 24; // breathing room so labels never touch the icons
      const available = bar.clientWidth - padding;
      const needed = mnav.scrollWidth + RIGHT_RESERVE + LOGO_RESERVE + GAP;
      setNavOverflow(needed > available);
    };
    // Defer the first measurement out of the effect body (lets layout settle
    // and avoids a synchronous setState during the render commit).
    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    if (barRef.current) ro.observe(barRef.current);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [categories, isAuthenticated]);

  const handleSignOut = async () => {
    const refreshToken = useRepairStore.getState().authInfo.refreshToken;
    try {
      if (refreshToken) await repairCall("myAppLogout", { refreshToken });
    } catch {
      // Server-side revoke is best-effort; clearAuth always runs.
    }
    useRepairStore.getState().clearAuth();
    router.push("/");
  };

  // Centered logo — used by the mobile bar and the collapsed desktop bar.
  const centeredLogo = (
    <Link
      href="/"
      aria-label="Repair home"
      className="absolute left-1/2 top-1/2 h-[22px] w-8 -translate-x-1/2 -translate-y-1/2 md:h-7 md:w-10"
    >
      <Image
        src="/home/logo-re.png"
        alt="Repair"
        fill
        sizes="40px"
        className="object-contain"
        priority
      />
    </Link>
  );

  // Right-side icon cluster shared by the mobile + desktop bars. `showAccount`
  // adds the desktop-only account / logout / sign-in shortcuts (the mobile bar
  // surfaces those through the Sidebar instead).
  const actions = (showAccount) => (
    <div className="flex items-center gap-4 md:gap-5">
      <button type="button" aria-label="Search" className="grid size-6 place-items-center">
        <Image src="/home/icon-search.svg" alt="" width={24} height={24} />
      </button>

      {/* Cart — open to guests, so it always shows */}
      <Link href="/cart" aria-label="Bag" className="grid size-6 place-items-center">
        <Image src="/home/icon-bag.svg" alt="" width={24} height={24} />
      </Link>

      {showAccount &&
        (isAuthenticated ? (
          <>
            <Link
              href={accountHref}
              aria-label="Account"
              className="grid size-6 place-items-center"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="size-6 text-white"
                aria-hidden
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 4-7 8-7s8 3 8 7" strokeLinecap="round" />
              </svg>
            </Link>
            {/* Logout shortcut */}
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Log out"
              className="grid size-6 place-items-center"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="size-6 text-white"
                aria-hidden
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </>
        ) : (
          /* Sign-in shortcut for guests */
          <Link
            href="/sign-in"
            aria-label="Sign in"
            className="grid size-6 place-items-center"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="size-6 text-white"
              aria-hidden
            >
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15 12H3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ))}
    </div>
  );

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30">
        {!isAuthenticated && !bannerDismissed ? (
          // Guest banner — suppressed once this device has registered + redeemed
          // the welcome discount (bannerDismissed, read from localStorage via
          // useSyncExternalStore; false on the server so SSR still shows it).
          <div className="inline-flex w-full items-center justify-center gap-2 bg-white p-3 shadow-[0px_4px_10px_0px_rgba(0,0,0,0.25)]">
            <span className="text-center text-[10px] font-medium text-gray-900 font-display">
              GET 10% OFF ON YOUR FIRST ORDER IF YOU SIGN IN
            </span>
          </div>
        ) : isAuthenticated && welcomeEligible ? (
          <div className="inline-flex w-full items-center justify-center gap-2 p-3 shadow-[0px_4px_10px_0px_rgba(0,0,0,0.25)]" style={{ backgroundColor: "#16a34a" }}>
            <span className="text-center text-[10px] font-medium text-white font-display">
              YOUR 10% WELCOME DISCOUNT IS READY — APPLIED AT CHECKOUT ON YOUR FIRST ORDER
            </span>
          </div>
        ) : null}
        <div className="bg-black/30 shadow-[0_4px_10px_0_rgba(0,0,0,0.05)] backdrop-blur-md">
          {/* Mobile bar — hamburger | centered logo | search + cart. Auth lives
              in the Sidebar on mobile. */}
          <div className="relative flex w-full items-center justify-between gap-4 px-4 py-4 md:hidden">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
              className="grid size-6 place-items-center text-white"
            >
              <Image src="/home/icon-sort.svg" alt="" width={24} height={24} />
            </button>
            {centeredLogo}
            {actions(false)}
          </div>

          {/* Desktop bar (md+). When the horizontal nav would overflow (too many
              / too long category labels), it collapses to the mobile-style
              layout: hamburger (opens the Sidebar) + centered logo + the full
              icon cluster — so the login/logout icon never gets pushed off. */}
          <div
            ref={barRef}
            className="relative mx-auto hidden w-full max-w-[1280px] items-center justify-between gap-4 px-4 py-4 md:flex md:px-10 lg:px-16"
          >
            {navOverflow ? (
              <>
                <button
                  type="button"
                  aria-label="Open menu"
                  onClick={() => setMenuOpen(true)}
                  className="grid size-6 place-items-center text-white"
                >
                  <Image src="/home/icon-sort.svg" alt="" width={24} height={24} />
                </button>
                {centeredLogo}
                {actions(true)}
              </>
            ) : (
              <>
                {/* Logo — left flex item on desktop */}
                <Link
                  href="/"
                  aria-label="Repair home"
                  className="relative h-7 w-10 shrink-0"
                >
                  <Image
                    src="/home/logo-re.png"
                    alt="Repair"
                    fill
                    sizes="40px"
                    className="object-contain"
                    priority
                  />
                </Link>

                {/* Desktop nav — categories fetched from server */}
                <nav className="flex items-center gap-8 lg:gap-10">
                  {categories.map((cat) => (
                    <DesktopNavItem key={cat.id ?? cat.label} item={cat} />
                  ))}
                </nav>

                {actions(true)}
              </>
            )}

            {/* Hidden, off-screen copy of the full nav — always mounted so the
                overflow check works in both directions (collapse + expand). */}
            <MeasureNav innerRef={measureNavRef} categories={categories} />
          </div>
        </div>
      </header>

      <Sidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        activeHref={pathname}
        items={sidebarItems}
        isAuthenticated={isAuthenticated}
        onSignOut={handleSignOut}
        signInHref="/sign-in"
        contactHref="/contact"
      />
    </>
  );
}

function DesktopNavItem({ item }) {
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;

  // A coming-soon major is a teaser — greyed and non-clickable.
  if (item.comingSoon) {
    return (
      <span
        className="inline-flex cursor-default items-center gap-2 font-body text-[14px] uppercase tracking-[0.15em] text-white/40"
        style={{ fontStretch: "75%" }}
      >
        {item.label}
        <ComingSoonTag className="text-white/40" />
      </span>
    );
  }

  if (!hasChildren) {
    return (
      <Link
        href={item.href ?? "#"}
        className="font-body text-[14px] uppercase tracking-[0.15em] text-white/80 transition-colors hover:text-white"
        style={{ fontStretch: "75%" }}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div className="group relative">
      <Link
        href={item.href ?? "#"}
        className="inline-flex items-center gap-1 font-body text-[14px] uppercase tracking-[0.15em] text-white/80 transition-colors group-hover:text-white group-focus-within:text-white"
        style={{ fontStretch: "75%" }}
        aria-haspopup="true"
      >
        {item.label}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="size-3 transition-transform group-hover:rotate-180"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>

      {/* Hover bridge so cursor can travel from trigger to panel */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-full h-3 group-hover:pointer-events-auto group-focus-within:pointer-events-auto"
      />

      <div
        role="menu"
        className="invisible absolute left-1/2 top-full z-40 mt-3 min-w-[200px] -translate-x-1/2 rounded-md bg-white text-[#11191f] opacity-0 shadow-xl ring-1 ring-black/5 transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
      >
        <ul className="flex flex-col py-2">
          {/* "All items" → the major category itself (shows every product in
              it). Shown only because this dropdown only renders when the major
              has sub-categories. */}
          <li>
            <Link
              href={item.href ?? "#"}
              role="menuitem"
              className="block px-4 py-2 font-body text-[14px] uppercase tracking-[0.15em] text-[#11191f] transition-colors hover:bg-black/5"
              style={{ fontStretch: "75%" }}
            >
              All items
            </Link>
          </li>
          {item.children.map((child) =>
            child.comingSoon ? (
              <li key={child.id ?? child.label}>
                <div
                  className="flex cursor-default items-center justify-between gap-3 px-4 py-2 font-body text-[14px] uppercase tracking-[0.15em] text-[#11191f]/40"
                  style={{ fontStretch: "75%" }}
                >
                  <span>{child.label}</span>
                  <ComingSoonTag />
                </div>
              </li>
            ) : (
              <li key={child.id ?? child.label}>
                <Link
                  href={child.href}
                  role="menuitem"
                  className="block px-4 py-2 font-body text-[14px] uppercase tracking-[0.15em] text-[#11191f]/70 transition-colors hover:bg-black/5 hover:text-[#11191f]"
                  style={{ fontStretch: "75%" }}
                >
                  {child.label}
                </Link>
              </li>
            )
          )}
        </ul>
      </div>
    </div>
  );
}

// Off-screen, invisible mirror of the desktop nav used only to measure the
// width the labels need. Mirrors DesktopNavItem's trigger widths (label + a
// dropdown-chevron slot for parents, label + coming-soon tag for teasers) with
// the same font classes so scrollWidth reflects the real nav. `whitespace-nowrap`
// keeps it on one line so the measurement isn't capped by the viewport.
function MeasureNav({ innerRef, categories }) {
  return (
    <nav
      ref={innerRef}
      aria-hidden
      className="pointer-events-none invisible absolute left-0 top-0 flex items-center gap-8 whitespace-nowrap lg:gap-10"
    >
      {categories.map((cat) => {
        const hasChildren =
          Array.isArray(cat.children) && cat.children.length > 0;
        if (cat.comingSoon) {
          return (
            <span
              key={cat.id ?? cat.label}
              className="inline-flex items-center gap-2 font-body text-[14px] uppercase tracking-[0.15em]"
              style={{ fontStretch: "75%" }}
            >
              {cat.label}
              <span className="font-body text-[11px] font-medium uppercase tracking-[1px]">
                Coming soon
              </span>
            </span>
          );
        }
        return (
          <span
            key={cat.id ?? cat.label}
            className="inline-flex items-center gap-1 font-body text-[14px] uppercase tracking-[0.15em]"
            style={{ fontStretch: "75%" }}
          >
            {cat.label}
            {hasChildren ? <span className="size-3" /> : null}
          </span>
        );
      })}
    </nav>
  );
}

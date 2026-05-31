"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/shared/Sidebar";
import ComingSoonTag from "@/components/shared/ComingSoonTag";
import SearchOverlay from "@/components/customer/shop/SearchOverlay";
import { sidebarItems } from "@/lib/storeNav";
import { useRepairStore, selectIsLoggedIn } from "@/lib/useRepairStore";
import { repairCall } from "@/lib/repairAuthedApi";

// Mobile (Figma 2:12 / 2:857):
//   thin sticky bar: sort | RE logo (center) | search + bag.
// Desktop (Figma 119:3858):
//   80px tall: HOME | <dynamic categories> | RE logo (center) |
//   search + bag(+count) + account.
//
// `categories` comes from (customer)/layout.js which fetches the same
// myAppListCategoriesTree the landing HeaderShell uses, so the nav stays
// consistent between landing and storefront.

export default function ShopHeader({ cartCount = 0, categories = [] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const isAuthenticated = useRepairStore(selectIsLoggedIn);

  // On large screens the centered logo sits between the left nav and the right
  // icons. Once there are 2+ real (non-coming-soon) categories the left nav is
  // wide enough that the absolutely-centered logo crowds/overlaps it, so we drop
  // the centered logo for a cleaner layout. Coming-soon categories are teasers
  // and don't count toward the threshold.
  const shoppableCategoryCount = categories.filter((c) => !c.comingSoon).length;
  const hideDesktopLogo = shoppableCategoryCount >= 2;

  // ── Responsive nav overflow ──────────────────────────────────────────────
  // With many (or long-named) major categories the horizontal desktop nav runs
  // out of room and the category labels start to collide. Rather than pick an
  // arbitrary category-count cutoff, we MEASURE the nav: a hidden, off-screen
  // copy of the full nav (`measureNavRef`) reports the width the labels need;
  // if that plus the right-side icon cluster (and the centered logo, when
  // shown) can't fit the bar, we collapse the large-screen header to the mobile
  // layout (hamburger + centered logo + the Sidebar drawer for categories).
  // The hidden measurer is always mounted so the check works in BOTH directions
  // (collapse on overflow, expand again when the window widens / categories shrink).
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
      const PADDING = 64; // px-8 left + right (clientWidth includes padding)
      const RIGHT_RESERVE = 150; // search + bag + account icons cluster + gaps
      const LOGO_RESERVE = hideDesktopLogo ? 0 : 88; // centered logo lane
      const GAP = 24; // breathing room so labels never touch
      const available = bar.clientWidth - PADDING;
      const needed = mnav.scrollWidth + RIGHT_RESERVE + LOGO_RESERVE + GAP;
      setNavOverflow(needed > available);
    };
    // Defer the first measurement out of the effect body (avoids a synchronous
    // setState during render commit, and lets layout settle first).
    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    if (barRef.current) ro.observe(barRef.current);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [categories, hideDesktopLogo]);

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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Shared bits reused by the desktop bar's full-nav and collapsed (mobile-style)
  // layouts so the icon cluster / centered logo stay identical between them.
  const centeredLogo = (
    <Link
      href="/"
      aria-label="Repair home"
      className="absolute left-1/2 top-1/2 h-[35px] w-12 -translate-x-1/2 -translate-y-1/2"
    >
      <Image
        src="/home/logo-re.png"
        alt="Repair"
        fill
        sizes="48px"
        className="object-contain"
        style={{ filter: "brightness(0)" }}
        priority
      />
    </Link>
  );

  const desktopActions = (
    <div className="flex items-center gap-6">
      <button
        type="button"
        aria-label="Search"
        onClick={() => setSearchOpen(true)}
        className="grid size-5 place-items-center"
      >
        <Image src="/shop/icon-search.svg" alt="" width={20} height={20} />
      </button>
      {isAuthenticated && (
        <>
          <Link
            href="/cart"
            aria-label={`Bag (${cartCount})`}
            className="relative grid size-5 place-items-center"
          >
            <Image src="/shop/icon-bag.svg" alt="" width={20} height={20} />
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-1 grid size-4 place-items-center rounded-full bg-[#11191f] font-body text-[10px] leading-none text-white">
                {cartCount}
              </span>
            )}
          </Link>
          <Link
            href="/account"
            aria-label="Account"
            className="grid size-5 place-items-center"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="size-5 text-[#11191f]"
              aria-hidden
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 4-7 8-7s8 3 8 7" strokeLinecap="round" />
            </svg>
          </Link>
        </>
      )}
    </div>
  );

  return (
    <>
      <header
        className={`sticky top-0 z-30 transition-colors ${
          scrolled ? "shadow-[0_4px_10px_0_rgba(0,0,0,0.05)]" : "md:border-b md:border-[#f3f4f6]"
        }`}
        style={
          scrolled
            ? {
                backgroundColor: "rgba(255,255,255,0.3)",
                backdropFilter: "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
              }
            : { backgroundColor: "#ffffff" }
        }
      >
        {/* Mobile bar */}
        <div className="relative flex h-14 items-center justify-between px-4 md:hidden">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
            className="grid size-6 place-items-center text-[#11191f]"
          >
            <Image src="/shop/icon-sort.svg" alt="" width={24} height={24} />
          </button>

          <Link
            href="/"
            aria-label="Repair home"
            className="absolute left-1/2 top-1/2 h-[23px] w-8 -translate-x-1/2 -translate-y-1/2"
          >
            <Image
              src="/home/logo-re.png"
              alt="Repair"
              fill
              sizes="32px"
              className="object-contain"
              style={{ filter: "brightness(0)" }}
              priority
            />
          </Link>

          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
              className="grid size-6 place-items-center"
            >
              <Image src="/shop/icon-search.svg" alt="" width={24} height={24} />
            </button>
            {isAuthenticated && (
              <Link
                href="/cart"
                aria-label={`Bag (${cartCount})`}
                className="relative grid size-6 place-items-center"
              >
                <Image src="/shop/icon-bag.svg" alt="" width={24} height={24} />
                {cartCount > 0 && (
                  <span className="absolute -right-2 -top-1 grid size-4 place-items-center rounded-full bg-[#11191f] font-body text-[10px] leading-none text-white">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>

        {/* Desktop bar (md+). When the horizontal nav would overflow (too many
            / too long category labels), it collapses to the mobile-style layout:
            hamburger (opens the Sidebar) + centered logo + the icon cluster. */}
        <div
          ref={barRef}
          className="relative mx-auto hidden h-[80px] w-full max-w-[1440px] items-center justify-between px-8 md:flex"
        >
          {navOverflow ? (
            <>
              <button
                type="button"
                aria-label="Open menu"
                onClick={() => setMenuOpen(true)}
                className="grid size-6 place-items-center text-[#11191f]"
              >
                <Image src="/shop/icon-sort.svg" alt="" width={24} height={24} />
              </button>
              {centeredLogo}
              {desktopActions}
            </>
          ) : (
            <>
              <nav className="flex items-center gap-8">
                <Link
                  href="/"
                  className="font-display text-[14px] font-medium leading-5 text-[#11191f] hover:opacity-80"
                >
                  HOME
                </Link>
                {categories.map((cat) => (
                  <DesktopNavItem key={cat.id ?? cat.label} item={cat} />
                ))}
              </nav>

              {!hideDesktopLogo && centeredLogo}

              {desktopActions}
            </>
          )}

          {/* Hidden, off-screen copy of the full nav — always mounted so the
              overflow check works in both directions (collapse + expand). */}
          <MeasureNav innerRef={measureNavRef} categories={categories} />
        </div>
      </header>

      <Sidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={sidebarItems(categories, isAuthenticated)}
        isAuthenticated={isAuthenticated}
        onSignOut={handleSignOut}
        signInHref="/sign-in"
        contactHref="/contact"
      />

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

function DesktopNavItem({ item }) {
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;

  // A coming-soon major is a teaser — greyed and non-clickable.
  if (item.comingSoon) {
    return (
      <span className="inline-flex cursor-default items-center gap-2 font-display text-[14px] font-medium uppercase leading-5 text-[#11191f]/40">
        {item.label}
        <ComingSoonTag />
      </span>
    );
  }

  if (!hasChildren) {
    return (
      <Link
        href={item.href ?? "#"}
        className="font-display text-[14px] font-medium uppercase leading-5 text-[#11191f] hover:opacity-80"
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div className="group relative">
      <Link
        href={item.href ?? "#"}
        className="inline-flex items-center gap-1 font-display text-[14px] font-medium uppercase leading-5 text-[#11191f] hover:opacity-80"
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

      {/* Hover bridge so the cursor can cross from trigger to panel */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-full h-3 group-hover:pointer-events-auto group-focus-within:pointer-events-auto"
      />

      <div
        role="menu"
        className="invisible absolute left-1/2 top-full z-40 mt-3 min-w-[200px] -translate-x-1/2 rounded-md bg-white text-[#11191f] opacity-0 shadow-xl ring-1 ring-black/5 transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
      >
        <ul className="flex flex-col py-2">
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
      className="pointer-events-none invisible absolute left-0 top-0 flex items-center gap-8 whitespace-nowrap"
    >
      <span className="font-display text-[14px] font-medium uppercase leading-5">
        HOME
      </span>
      {categories.map((cat) => {
        const hasChildren =
          Array.isArray(cat.children) && cat.children.length > 0;
        if (cat.comingSoon) {
          return (
            <span
              key={cat.id ?? cat.label}
              className="inline-flex items-center gap-2 font-display text-[14px] font-medium uppercase leading-5"
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
            className="inline-flex items-center gap-1 font-display text-[14px] font-medium uppercase leading-5"
          >
            {cat.label}
            {hasChildren ? <span className="size-3" /> : null}
          </span>
        );
      })}
    </nav>
  );
}

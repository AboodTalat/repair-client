"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/shared/Sidebar";
import ComingSoonTag from "@/components/shared/ComingSoonTag";
import { sidebarItems as buildSidebarItems } from "@/lib/storeNav";
import { useRepairStore, selectIsLoggedIn, selectUser } from "@/lib/useRepairStore";
import { repairCall } from "@/lib/repairAuthedApi";
import { accountHrefForRole } from "@/lib/authRedirect";

export default function Header({ categories = [] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isAuthenticated = useRepairStore(selectIsLoggedIn);
  const user = useRepairStore(selectUser);
  // Stakeholders get their console home; customers + guests get /account.
  const accountHref = accountHrefForRole(user?.role);

  const sidebarItems = buildSidebarItems(categories, isAuthenticated);

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

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30">
        {!isAuthenticated && (
          <div className="inline-flex w-full items-center justify-center gap-2 bg-white p-3 shadow-[0px_4px_10px_0px_rgba(0,0,0,0.25)]">
            <span className="text-center text-[10px] font-medium text-gray-900 font-display">
              GET 10% OFF ON YOUR FIRST ORDER IF YOU SIGN IN
            </span>
          </div>
        )}
        <div className="bg-black/30 shadow-[0_4px_10px_0_rgba(0,0,0,0.05)] backdrop-blur-md">
        <div className="relative mx-auto flex w-full max-w-[1280px] items-center justify-between gap-4 px-4 py-4 md:px-10 lg:px-16">
          {/* Mobile: menu button */}
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
            className="grid size-6 place-items-center text-white md:hidden"
          >
            <Image src="/home/icon-sort.svg" alt="" width={24} height={24} />
          </button>

          {/* Logo — absolutely centered on mobile, flex item on desktop */}
          <Link
            href="/"
            aria-label="Repair home"
            className="absolute left-1/2 top-1/2 h-[22px] w-8 -translate-x-1/2 -translate-y-1/2 md:relative md:left-auto md:top-auto md:h-7 md:w-10 md:translate-x-0 md:translate-y-0"
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
          <nav className="hidden md:flex md:items-center md:gap-8 lg:gap-10">
            {categories.map((cat) => (
              <DesktopNavItem key={cat.id ?? cat.label} item={cat} />
            ))}
          </nav>

          {/* Right icons */}
          <div className="flex items-center gap-4 md:gap-5">
            <button type="button" aria-label="Search" className="grid size-6 place-items-center">
              <Image src="/home/icon-search.svg" alt="" width={24} height={24} />
            </button>

            {/* Cart — open to guests, so it always shows */}
            <Link href="/cart" aria-label="Bag" className="grid size-6 place-items-center">
              <Image src="/home/icon-bag.svg" alt="" width={24} height={24} />
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  href={accountHref}
                  aria-label="Account"
                  className="hidden size-6 place-items-center md:grid"
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
                {/* Large-screen logout shortcut */}
                <button
                  type="button"
                  onClick={handleSignOut}
                  aria-label="Log out"
                  className="hidden size-6 place-items-center md:grid"
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
              /* Large-screen sign-in shortcut for guests */
              <Link
                href="/sign-in"
                aria-label="Sign in"
                className="hidden size-6 place-items-center md:grid"
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
            )}
          </div>
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

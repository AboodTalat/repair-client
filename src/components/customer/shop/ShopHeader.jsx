"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/shared/Sidebar";
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
          </div>
        </div>

        {/* Desktop bar */}
        <div className="relative mx-auto hidden h-[80px] w-full max-w-[1440px] items-center justify-between px-8 md:flex">
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

          <div className="flex items-center gap-6">
            <button
              type="button"
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
              className="grid size-5 place-items-center"
            >
              <Image src="/shop/icon-search.svg" alt="" width={20} height={20} />
            </button>
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
          </div>
        </div>
      </header>

      <Sidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={sidebarItems(categories)}
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
          {item.children.map((child) => (
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
          ))}
        </ul>
      </div>
    </div>
  );
}

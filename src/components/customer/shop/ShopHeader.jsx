"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import Sidebar from "@/components/shared/Sidebar";
import SearchOverlay from "@/components/customer/shop/SearchOverlay";

const NAV_ITEMS = [
  { label: "HOME", href: "/" },
  { label: "JUST DROPPED", href: "/shop?category=just-dropped" },
  { label: "WOMEN", href: "/shop?category=women" },
  { label: "MEN", href: "/shop?category=men" },
];

// Mobile (Figma 2:12 / 2:857):
//   thin sticky bar: sort | RE logo (center) | search + bag.
//   Header keeps its own shadow when the page scrolls past it
//   (figma 2:857 shows the same header on a scrolled page — sticky,
//   no collapse, no content shifts into it).
// Desktop (Figma 119:3858):
//   80px tall: HOME / JUST DROPPED / WOMEN / MEN | RE logo (center) |
//   search + bag(+count) + account.

export default function ShopHeader({ cartCount = 0 }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Figma 2:857 ("Scroll Effect") puts a translucent white panel
  // (bg-rgba(255,255,255,0.3), backdrop-blur 14px, soft shadow) over the
  // page once scrolled. Properties live in inline styles because Tailwind v4
  // + Turbopack silently drops arbitrary `backdrop-blur-[14px]` values.
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
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="font-display text-[14px] font-medium leading-5 text-[#11191f] hover:opacity-80"
              >
                {item.label}
              </Link>
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
              href="/sign-in"
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
        items={NAV_ITEMS.map((n) => ({ label: n.label, href: n.href }))}
        isAuthenticated={false}
        signInHref="/sign-in"
        contactHref="/contact"
      />

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

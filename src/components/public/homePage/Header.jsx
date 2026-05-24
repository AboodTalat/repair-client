"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/shared/Sidebar";
import { sidebarItems as buildSidebarItems } from "@/lib/storeNav";
import { useRepairStore, selectIsLoggedIn } from "@/lib/useRepairStore";
import { repairCall } from "@/lib/repairAuthedApi";

export default function Header({ categories = [] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isAuthenticated = useRepairStore(selectIsLoggedIn);

  const sidebarItems = buildSidebarItems(categories);

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
      <header className="fixed inset-x-0 top-0 z-30 bg-black/30 shadow-[0_4px_10px_0_rgba(0,0,0,0.05)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-4 px-4 py-4 md:px-10 lg:px-16">
          {/* Mobile: menu button */}
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
            className="grid size-6 place-items-center text-white md:hidden"
          >
            <Image src="/home/icon-sort.svg" alt="" width={24} height={24} />
          </button>

          {/* Logo */}
          <Link
            href="/"
            aria-label="Repair home"
            className="relative h-[22px] w-8 md:h-7 md:w-10"
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
            <Link
              href="/account"
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
            <Link href="/cart" aria-label="Bag" className="grid size-6 place-items-center">
              <Image src="/home/icon-bag.svg" alt="" width={24} height={24} />
            </Link>
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

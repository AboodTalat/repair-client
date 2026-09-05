"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import ComingSoonTag from "@/components/shared/ComingSoonTag";
import {
  isCategoryActive,
  isSubCategoryActive,
  isAllItemsActive,
} from "@/lib/storeNav";

function CloseIcon({ className = "size-6" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <span
      aria-hidden
      className="relative block size-6 rounded-[3px] border-2 border-[#11191f] opacity-50"
    >
      <Image
        src="/sidebar/arrow-right.svg"
        alt=""
        fill
        sizes="24px"
        className="block"
      />
    </span>
  );
}

function ArrowBackIcon() {
  return (
    <span
      aria-hidden
      className="relative block size-4 rounded-[3px] border-2 border-[#11191f]"
    >
      <Image
        src="/sidebar/arrow-back.svg"
        alt=""
        fill
        sizes="16px"
        className="block -scale-x-100"
      />
    </span>
  );
}

function ItemLabel({ active, children }) {
  return (
    <span
      className={`flex items-center gap-2 font-display text-[22px] font-bold uppercase leading-none whitespace-nowrap ${
        active ? "text-[#11191f]" : "text-[#11191f]/50"
      }`}
    >
      {active && <span aria-hidden className="block h-1 w-3 bg-[#11191f]" />}
      <span>{children}</span>
    </span>
  );
}

export default function Sidebar({
  items = [],
  activeHref,
  activeCategory = null,
  activeSub = null,
  open = false,
  onClose,
  isAuthenticated = false,
  onSignOut,
  signInHref = "/sign-in",
  contactHref = "/contact",
}) {
  const [drilldownIndex, setDrilldownIndex] = useState(null);
  const [animDir, setAnimDir] = useState("forward");

  // Render-phase adjustment: the drilldown position is derived from `open`, so
  // resetting it in the effect left one render showing the previous sub-menu.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) {
      setDrilldownIndex(null);
      setAnimDir("forward");
    }
  }

  useEffect(() => {
    if (!open) {
      return;
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const drilldown = drilldownIndex != null ? items[drilldownIndex] : null;

  const openDrilldown = (idx) => {
    setAnimDir("forward");
    setDrilldownIndex(idx);
  };

  const closeDrilldown = () => {
    setAnimDir("back");
    setDrilldownIndex(null);
  };

  const handleNavigate = () => {
    onClose?.();
  };

  const viewAnimation =
    animDir === "forward"
      ? "sidebarSlideInRight 380ms cubic-bezier(0.22, 1, 0.36, 1) both"
      : "sidebarSlideInLeft 380ms cubic-bezier(0.22, 1, 0.36, 1) both";

  return (
    <>
      <div
        aria-hidden={!open}
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-full max-w-[393px] flex-col bg-white text-[#11191f] shadow-xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 pt-[70px] pb-6">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="grid size-6 place-items-center text-[#11191f]"
          >
            <CloseIcon />
          </button>
          <div className="relative h-5 w-7">
            <Image
              src="/auth/blackLogo-v2.png"
              alt="Repair"
              fill
              sizes="28px"
              className="object-contain"
              priority
            />
          </div>
          <span aria-hidden className="size-6" />
        </div>

        <nav className="flex-1 overflow-y-auto px-6">
          {drilldown ? (
            <div
              key={`drilldown-${drilldownIndex}`}
              className="sidebar-view-anim flex flex-col gap-4"
              style={{ animation: viewAnimation }}
            >
              <button
                type="button"
                onClick={closeDrilldown}
                className="flex items-center gap-2 font-display text-[22px] font-bold uppercase leading-none text-[#11191f]"
              >
                <ArrowBackIcon />
                <span>{drilldown.label}</span>
              </button>
              <Link
                href={drilldown.href ?? "#"}
                onClick={handleNavigate}
                className={`pl-6 font-display text-[22px] font-bold uppercase leading-none ${
                  isAllItemsActive(drilldown.href, activeCategory, activeSub)
                    ? "text-[#11191f]"
                    : "text-[#11191f]/50"
                }`}
              >
                All items
              </Link>
              {(drilldown.children ?? []).map((child) =>
                child.comingSoon ? (
                  <div
                    key={child.label}
                    className="flex items-center justify-between gap-3 pl-6"
                  >
                    <span className="font-display text-[22px] font-bold uppercase leading-none text-[#11191f]/40">
                      {child.label}
                    </span>
                    <ComingSoonTag />
                  </div>
                ) : (
                  <Link
                    key={child.label}
                    href={child.href}
                    onClick={handleNavigate}
                    className={`pl-6 font-display text-[22px] font-bold uppercase leading-none ${
                      isSubCategoryActive(child.href, activeCategory, activeSub)
                        ? "text-[#11191f]"
                        : "text-[#11191f]/50"
                    }`}
                  >
                    {child.label}
                  </Link>
                )
              )}
            </div>
          ) : (
            <ul
              key="root"
              className="sidebar-view-anim flex flex-col gap-4"
              style={{ animation: viewAnimation }}
            >
              {items.map((item, idx) => {
                const isActive =
                  (Boolean(activeHref) && item.href === activeHref) ||
                  isCategoryActive(item.href, activeCategory);
                const hasChildren =
                  Array.isArray(item.children) && item.children.length > 0;

                // A coming-soon major is a teaser — not navigable, no drilldown.
                if (item.comingSoon) {
                  return (
                    <li key={item.label}>
                      <div className="flex w-full items-center justify-between gap-3">
                        <ItemLabel active={false}>{item.label}</ItemLabel>
                        <ComingSoonTag />
                      </div>
                    </li>
                  );
                }

                if (hasChildren) {
                  return (
                    <li key={item.label}>
                      <button
                        type="button"
                        onClick={() => openDrilldown(idx)}
                        className="flex w-full items-center justify-between"
                      >
                        <ItemLabel active={isActive}>{item.label}</ItemLabel>
                        <ArrowRightIcon />
                      </button>
                    </li>
                  );
                }

                return (
                  <li key={item.label}>
                    <Link
                      href={item.href ?? "#"}
                      onClick={handleNavigate}
                      className="flex w-full items-center"
                    >
                      <ItemLabel active={isActive}>{item.label}</ItemLabel>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        <div className="flex flex-col gap-4 px-6 pt-6 pb-12">
          <Link
            href={contactHref}
            onClick={handleNavigate}
            className="font-display text-[22px] font-bold uppercase leading-none text-[#11191f]/50"
          >
            Contact us
          </Link>
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => {
                onSignOut?.();
                onClose?.();
              }}
              className="text-left font-display text-[22px] font-bold uppercase leading-none text-[#a50013]"
            >
              Logout
            </button>
          ) : (
            <Link
              href={signInHref}
              onClick={handleNavigate}
              className="font-display text-[22px] font-bold uppercase leading-none text-[#11191f]/50"
            >
              Sign in/Sign up
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}

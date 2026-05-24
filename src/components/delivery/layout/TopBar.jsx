"use client";

import { useEffect, useRef, useState } from "react";
import { IconChevronDown } from "@/components/admin/shared/Icons";
import { DRIVER } from "@/lib/mockDelivery";

export default function TopBar({ onOpenSidebar }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    if (!profileOpen) return;
    function handleOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [profileOpen]);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-[#e5e7eb] bg-white px-4 md:px-6">
      <button
        type="button"
        onClick={onOpenSidebar}
        aria-label="Open menu"
        className="grid size-9 place-items-center rounded-[2px] border border-[#e5e7eb] text-[#11191f] hover:bg-[#f3f4f6] lg:hidden"
      >
        <span className="grid size-4 place-items-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </span>
      </button>

      <div className="hidden flex-col leading-tight md:flex">
        <span className="font-display text-[14px] font-bold uppercase tracking-[1.2px] text-[#11191f]">
          Dispatch
        </span>
        <span className="font-body text-[10px] uppercase tracking-[1.2px] text-[#6b7280]">
          Delivery · {DRIVER.zone}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <span
          className="hidden items-center gap-1.5 rounded-full px-2.5 py-1 font-body text-[10px] font-semibold uppercase tracking-[1px] sm:flex"
          style={{ backgroundColor: "#eff6ff", color: "#1d4ed8" }}
        >
          <span className="grid size-3 place-items-center" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h13l-3-3M16 12l-3 3" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="16" y="7" width="5" height="10" rx="1" />
            </svg>
          </span>
          On shift
        </span>

        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            className="flex h-9 items-center gap-2 rounded-[2px] border border-[#e5e7eb] pl-1 pr-2 hover:bg-[#f3f4f6]"
          >
            <span className="grid size-7 place-items-center rounded-[2px] bg-[#11191f] font-display text-[12px] font-bold text-white">
              {DRIVER.initials}
            </span>
            <span className="hidden text-left font-body sm:flex sm:flex-col">
              <span className="text-[12px] font-semibold leading-none text-[#11191f]">
                {DRIVER.name}
              </span>
              <span className="text-[10px] uppercase tracking-[1px] text-[#6b7280]">
                Delivery
              </span>
            </span>
            <span className="grid size-4 place-items-center text-[#6b7280]">
              <IconChevronDown />
            </span>
          </button>
          {profileOpen ? (
            <div className="absolute right-0 top-11 z-30 w-48 rounded-[2px] border border-[#e5e7eb] bg-white py-1 shadow-lg">
              <button className="block w-full px-4 py-2 text-left font-body text-[12px] text-[#11191f] hover:bg-[#f3f4f6]">
                My profile
              </button>
              <button className="block w-full px-4 py-2 text-left font-body text-[12px] text-[#11191f] hover:bg-[#f3f4f6]">
                End shift
              </button>
              <hr className="my-1 border-[#e5e7eb]" />
              <button className="block w-full px-4 py-2 text-left font-body text-[12px] text-[#dc2626] hover:bg-[#fef2f2]">
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

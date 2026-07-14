"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconChevronDown } from "@/components/admin/shared/Icons";
import { useRepairStore } from "@/lib/useRepairStore";
import { repairCall } from "@/lib/repairAuthedApi";

// The users model has no display name — derive a friendly identity from the
// signed-in account's email local-part (same approach as the admin/delivery
// surfaces).
function identityFromUser(user) {
  const email = user?.email || "";
  const local = email.split("@")[0] || "accountant";
  const parts = local.split(/[._-]/).filter(Boolean);
  const initials = (parts.length >= 2 ? parts[0][0] + parts[1][0] : local.slice(0, 2) || "AC").toUpperCase();
  const name = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ") || "Accountant";
  const role = (user?.role || "accounting").toUpperCase();
  return { initials, name, role };
}

export default function TopBar({ onOpenSidebar }) {
  const router = useRouter();
  const user = useRepairStore((s) => s.authInfo.user);
  const { initials, name, role } = identityFromUser(user);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  async function handleSignOut() {
    setProfileOpen(false);
    const refreshToken = useRepairStore.getState().authInfo.refreshToken;
    try {
      if (refreshToken) await repairCall("myAppLogout", { refreshToken });
    } catch {
      // Server-side revoke is best-effort; clearAuth always runs.
    }
    useRepairStore.getState().clearAuth();
    router.push("/sign-in");
  }

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
          Finance Ledger
        </span>
        <span className="font-body text-[10px] uppercase tracking-[1.2px] text-[#6b7280]">
          Read-only · Accountant
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Read-only badge — replaces the bell + notification panel on this
            shell. There's no operational queue for the accountant to action. */}
        <span
          className="hidden items-center gap-1.5 rounded-full px-2.5 py-1 font-body text-[10px] font-semibold uppercase tracking-[1px] sm:flex"
          style={{ backgroundColor: "#eff6ff", color: "#1d4ed8" }}
        >
          <span
            className="grid size-3 place-items-center"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="5" y="11" width="14" height="9" rx="1.5" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
            </svg>
          </span>
          Read-only
        </span>

        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            className="flex h-9 items-center gap-2 rounded-[2px] border border-[#e5e7eb] pl-1 pr-2 hover:bg-[#f3f4f6]"
          >
            <span className="grid size-7 place-items-center rounded-[2px] bg-[#11191f] font-display text-[12px] font-bold text-white">
              {initials}
            </span>
            <span className="hidden text-left font-body sm:flex sm:flex-col">
              <span className="text-[12px] font-semibold leading-none text-[#11191f]">
                {name}
              </span>
              <span className="text-[10px] uppercase tracking-[1px] text-[#6b7280]">
                {role}
              </span>
            </span>
            <span className="grid size-4 place-items-center text-[#6b7280]">
              <IconChevronDown />
            </span>
          </button>
          {profileOpen ? (
            <div className="absolute right-0 top-11 z-30 w-48 rounded-[2px] border border-[#e5e7eb] bg-white py-1 shadow-lg">
              {/* Identity header (name + role) so the menu still identifies who's
                  signed in now that the My profile / Settings stubs are gone. */}
              <div className="border-b border-[#e5e7eb] px-4 py-2">
                <p className="truncate font-body text-[12px] font-semibold text-[#11191f]">{name}</p>
                <p className="truncate font-body text-[10px] uppercase tracking-[1px] text-[#6b7280]">{role}</p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="block w-full px-4 py-2 text-left font-body text-[12px] text-[#dc2626] hover:bg-[#fef2f2]"
              >
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

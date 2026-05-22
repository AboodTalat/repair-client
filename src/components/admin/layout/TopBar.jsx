"use client";

import { useEffect, useRef, useState } from "react";
import { IconBell, IconSearch, IconChevronDown } from "@/components/admin/shared/Icons";
import NotificationPanel from "@/components/admin/layout/NotificationPanel";
import { ORDERS, CONTACT_MESSAGES, STOCK_ALERTS, LOW_STOCK } from "@/lib/mockAdmin";

// Slices of mock data that are "actionable" and surface in the panel.
const processingOrders = ORDERS.filter((o) => o.status === "processing");
const unreadMessages = CONTACT_MESSAGES.filter((m) => m.status === "unread");
const pendingAlerts = STOCK_ALERTS.filter((a) => a.status === "pending");
const totalCount =
  processingOrders.length + unreadMessages.length + pendingAlerts.length + LOW_STOCK.length;

export default function TopBar({ onOpenSidebar }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Close notification panel on outside click.
  useEffect(() => {
    if (!notifOpen) return;
    function handleOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [notifOpen]);

  // Close profile dropdown on outside click.
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

      <div className="relative hidden flex-1 max-w-md md:block">
        <span className="pointer-events-none absolute left-3 top-1/2 grid size-4 -translate-y-1/2 place-items-center text-[#6b7280]">
          <IconSearch />
        </span>
        <input
          type="text"
          placeholder="Search products, orders, customers..."
          className="h-10 w-full rounded-[2px] border border-[#e5e7eb] bg-[#fafafa] pl-9 pr-3 font-body text-[13px] text-[#11191f] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#11191f] focus:bg-white"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Notification bell */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => setNotifOpen((v) => !v)}
            className={
              "relative grid size-9 place-items-center rounded-[2px] border transition-colors " +
              (notifOpen
                ? "border-[#11191f] bg-[#f3f4f6] text-[#11191f]"
                : "border-[#e5e7eb] text-[#11191f] hover:bg-[#f3f4f6]")
            }
          >
            <span className="grid size-4 place-items-center">
              <IconBell />
            </span>
            {totalCount > 0 ? (
              <span
                className="absolute right-1 top-1 grid min-w-[14px] place-items-center rounded-full px-0.5 font-body font-bold text-white"
                style={{
                  backgroundColor: "#dc2626",
                  fontSize: "8px",
                  lineHeight: "14px",
                }}
              >
                {totalCount > 99 ? "99+" : totalCount}
              </span>
            ) : null}
          </button>

          {notifOpen ? (
            <NotificationPanel
              orders={processingOrders}
              messages={unreadMessages}
              stockAlerts={pendingAlerts}
              lowStock={LOW_STOCK}
              onClose={() => setNotifOpen(false)}
            />
          ) : null}
        </div>

        {/* Profile dropdown */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            className="flex h-9 items-center gap-2 rounded-[2px] border border-[#e5e7eb] pl-1 pr-2 hover:bg-[#f3f4f6]"
          >
            <span className="grid size-7 place-items-center rounded-[2px] bg-[#11191f] font-display text-[12px] font-bold text-white">
              SA
            </span>
            <span className="hidden text-left font-body sm:flex sm:flex-col">
              <span className="text-[12px] font-semibold leading-none text-[#11191f]">Sarah Admin</span>
              <span className="text-[10px] uppercase tracking-[1px] text-[#6b7280]">Admin</span>
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
                Settings
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

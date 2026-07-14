"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconBell, IconSearch, IconChevronDown } from "@/components/admin/shared/Icons";
import NotificationPanel from "@/components/admin/layout/NotificationPanel";
import { useRepairStore } from "@/lib/useRepairStore";
import { repairCall } from "@/lib/repairAuthedApi";
import { fetchAdminNotifications, markAdminNotificationsRead } from "@/lib/adminNotifications";
import { useAdminPush } from "@/lib/pwa";

// How often the bell polls the backend for new notifications. Kept modest — the
// real-time channel will be PWA web-push; this interval is just so the badge
// stays reasonably fresh while an admin sits on a page.
const NOTIFICATION_POLL_MS = 60000;

// The users model has no display name — derive a friendly identity from the
// signed-in account's email local-part (same approach as the delivery surface).
function identityFromUser(user) {
  const email = user?.email || "";
  const local = email.split("@")[0] || "admin";
  const parts = local.split(/[._-]/).filter(Boolean);
  const initials = (parts.length >= 2 ? parts[0][0] + parts[1][0] : local.slice(0, 2) || "AD").toUpperCase();
  const name = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ") || "Admin";
  const role = (user?.role || "admin").toUpperCase();
  return { initials, name, role };
}

export default function TopBar({ onOpenSidebar }) {
  const router = useRouter();
  const user = useRepairStore((s) => s.authInfo.user);
  const { initials, name, role } = identityFromUser(user);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifData, setNotifData] = useState({ unreadCount: 0, notifications: [] });
  const push = useAdminPush();

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Fetch the notification feed on mount and poll it. Guarded by a `cancelled`
  // flag ONLY — deliberately NOT paired with a run-once ref, which deadlocks
  // under React Strict Mode's mount→unmount→remount (documented in the repair
  // conventions). The double-mount fires two idempotent reads; the first is
  // ignored, the second resolves normally.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const d = await fetchAdminNotifications();
        if (!cancelled) setNotifData(d);
      } catch {
        // Poll failures are non-fatal — keep the last good state.
      }
    }
    load();
    const timer = setInterval(load, NOTIFICATION_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  // Toggle the bell. Opening it refetches fresh, then marks everything read for
  // THIS admin (per-admin watermark) so the badge clears — other admins keep
  // their own unread state.
  async function toggleNotifications() {
    const next = !notifOpen;
    setNotifOpen(next);
    if (!next) return;
    try {
      const d = await fetchAdminNotifications();
      setNotifData(d);
      await markAdminNotificationsRead();
      setNotifData((prev) => ({
        unreadCount: 0,
        notifications: prev.notifications.map((n) => ({ ...n, isRead: true })),
      }));
    } catch {
      // best-effort — the badge will reconcile on the next poll
    }
  }

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
            onClick={toggleNotifications}
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
            {notifData.unreadCount > 0 ? (
              <span
                className="absolute right-1 top-1 grid min-w-[14px] place-items-center rounded-full px-0.5 font-body font-bold text-white"
                style={{
                  backgroundColor: "#dc2626",
                  fontSize: "8px",
                  lineHeight: "14px",
                }}
              >
                {notifData.unreadCount > 99 ? "99+" : notifData.unreadCount}
              </span>
            ) : null}
          </button>

          {notifOpen ? (
            <NotificationPanel
              notifications={notifData.notifications}
              push={push}
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
              {initials}
            </span>
            <span className="hidden text-left font-body sm:flex sm:flex-col">
              <span className="text-[12px] font-semibold leading-none text-[#11191f]">{name}</span>
              <span className="text-[10px] uppercase tracking-[1px] text-[#6b7280]">{role}</span>
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

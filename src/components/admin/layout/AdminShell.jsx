"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import SideNav from "./SideNav";
import TopBar from "./TopBar";
import { IconClose } from "@/components/admin/shared/Icons";
import { repairCall } from "@/lib/repairAuthedApi";

export default function AdminShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Live sidebar badge counts (Orders / Stock Alerts / Contact Messages).
  // Fetched once here at the shell level so BOTH SideNav instances (desktop +
  // mobile off-canvas) share the same numbers; the per-page managers are wired
  // to the backend, so the badges have to come from the backend too (not the
  // mock arrays they used to read). Refetched on navigation so actioning an
  // item and moving on updates the pill.
  const [badgeCounts, setBadgeCounts] = useState({
    processingOrders: 0,
    pendingStockAlerts: 0,
    unreadMessages: 0,
  });
  const pathname = usePathname();

  // Lock body scroll while the off-canvas sidebar is open on mobile.
  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sidebarOpen]);

  // Fetch badge counts on mount + whenever the route changes (natural refresh
  // points). setState only inside the promise callbacks so we never set state
  // synchronously in the effect body; a cancelled flag drops a late response
  // after navigation/unmount. Prior counts are kept on failure so the badges
  // don't blink to zero on a transient error.
  useEffect(() => {
    let cancelled = false;
    repairCall("myAppAdminBadgeCounts", {}, { isQuery: true })
      .then((data) => {
        if (cancelled || !data) return;
        setBadgeCounts({
          processingOrders: Number(data.processingOrders) || 0,
          pendingStockAlerts: Number(data.pendingStockAlerts) || 0,
          unreadMessages: Number(data.unreadMessages) || 0,
        });
      })
      .catch(() => {
        /* keep prior counts on error */
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-[#f7f7f8] text-[#11191f]">
      {/* Desktop sidebar — always visible from lg up */}
      <aside className="sticky top-0 hidden h-screen lg:flex">
        <SideNav counts={badgeCounts} />
      </aside>

      {/* Mobile off-canvas sidebar */}
      {sidebarOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex h-full">
            <SideNav counts={badgeCounts} onNavigate={() => setSidebarOpen(false)} />
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setSidebarOpen(false)}
              className="m-3 grid size-9 place-items-center rounded-[2px] bg-white text-[#11191f]"
            >
              <span className="grid size-4 place-items-center">
                <IconClose />
              </span>
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}

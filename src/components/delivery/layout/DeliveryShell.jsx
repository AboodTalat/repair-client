"use client";

import { useEffect, useState } from "react";
import SideNav from "./SideNav";
import TopBar from "./TopBar";
import { IconClose } from "@/components/admin/shared/Icons";

export default function DeliveryShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sidebarOpen]);

  return (
    <div className="flex min-h-screen bg-[#f7f7f8] text-[#11191f]">
      <aside className="sticky top-0 hidden h-screen lg:flex">
        <SideNav />
      </aside>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex h-full">
            <SideNav onNavigate={() => setSidebarOpen(false)} />
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

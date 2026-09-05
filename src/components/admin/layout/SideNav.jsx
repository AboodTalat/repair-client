"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  IconDashboard,
  IconBox,
  IconFolder,
  IconCart,
  IconChart,
  IconTag,
  IconUsers,
  IconPercent,
  IconMail,
  IconMessageSquare,
  IconBell,
  IconSettings,
  IconLogout,
  IconEdit,
} from "@/components/admin/shared/Icons";
import { useRepairStore } from "@/lib/useRepairStore";
import { repairCall } from "@/lib/repairAuthedApi";

const PREFIX = "/r3pr-console";

// EXPORTED and load-bearing: `lib/adminNav.js` flattens this into the TopBar
// global search's "Pages & settings" index, so a route added here becomes
// searchable automatically. Keep it the single source of admin destinations —
// don't fork a second list for search.
export const SECTIONS = [
  {
    title: "Overview",
    items: [{ href: `${PREFIX}/dashboard`, label: "Dashboard", icon: IconDashboard }],
  },
  {
    title: "Catalog",
    items: [
      { href: `${PREFIX}/categories`, label: "Categories", icon: IconFolder },
      { href: `${PREFIX}/products`, label: "Products", icon: IconBox },
      { href: `${PREFIX}/taxonomies`, label: "Materials", icon: IconTag },
      { href: `${PREFIX}/discounts`, label: "Discounts", icon: IconTag },
      { href: `${PREFIX}/promo-codes`, label: "Promo Codes", icon: IconPercent },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: `${PREFIX}/orders`, label: "Orders", icon: IconCart },
      { href: `${PREFIX}/stock-alerts`, label: "Stock Alerts", icon: IconBell },
      { href: `${PREFIX}/messages`, label: "Contact Messages", icon: IconMessageSquare },
      { href: `${PREFIX}/users`, label: "Users & Roles", icon: IconUsers },
      { href: `${PREFIX}/settings`, label: "Settings", icon: IconSettings },
    ],
  },
  {
    title: "Insight",
    items: [
      { href: `${PREFIX}/reports`, label: "Reports", icon: IconChart },
      { href: `${PREFIX}/wishlist-insights`, label: "Wishlist Insights", icon: IconBell },
      { href: `${PREFIX}/storefront`, label: "Storefront Content", icon: IconEdit },
      { href: `${PREFIX}/subscribers`, label: "Subscribers", icon: IconUsers },
      { href: `${PREFIX}/broadcast`, label: "Broadcast Email", icon: IconMail },
    ],
  },
];

export default function SideNav({ onNavigate, counts }) {
  const pathname = usePathname() || "";
  const router = useRouter();
  // Live counts come from AdminShell (myAppAdminBadgeCounts); default to 0 so
  // the nav still renders if it's ever mounted without the prop.
  const processingCount = counts?.processingOrders ?? 0;
  const unreadCount = counts?.unreadMessages ?? 0;
  const pendingAlertCount = counts?.pendingStockAlerts ?? 0;

  // Real sign-out: best-effort server-side refresh-token revoke, then always
  // wipe the local auth slice and bounce to /sign-in (same pattern as the
  // delivery + accountant shells). The old `<Link href="/">` only navigated
  // home and left the session fully intact.
  async function handleSignOut() {
    if (onNavigate) onNavigate();
    const refreshToken = useRepairStore.getState().authInfo.refreshToken;
    try {
      if (refreshToken) await repairCall("myAppLogout", { refreshToken });
    } catch {
      // Server-side revoke is best-effort; clearAuth always runs.
    }
    useRepairStore.getState().clearAuth();
    router.push("/sign-in");
  }
  return (
    <nav className="flex h-full w-[260px] shrink-0 flex-col bg-[#11191f] text-white">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="grid size-9 place-items-center rounded-[2px] bg-white">
          <Image
            src="/home/logo-re-v2.png"
            alt="Repair"
            width={20}
            height={20}
            className="object-contain"
            style={{ filter: "brightness(0)" }}
          />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-display text-[14px] font-bold uppercase tracking-[1.5px]">
            Repair
          </span>
          <span className="font-body text-[10px] uppercase tracking-[1.2px] text-white/50">
            Control Console
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-6">
        {SECTIONS.map((section) => (
          <div key={section.title} className="mb-5">
            <p className="px-3 pb-2 font-body text-[10px] font-medium uppercase tracking-[1.4px] text-white/40">
              {section.title}
            </p>
            <ul className="flex flex-col gap-0.5">
              {section.items.map((it) => {
                const active = pathname === it.href || pathname.startsWith(it.href + "/");
                const Icon = it.icon;
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      onClick={onNavigate}
                      className={
                        "group flex h-10 items-center gap-3 rounded-[2px] px-3 font-body text-[13px] transition-colors " +
                        (active
                          ? "bg-white text-[#11191f]"
                          : "text-white/80 hover:bg-white/10 hover:text-white")
                      }
                    >
                      <span className="grid size-4 place-items-center">
                        <Icon />
                      </span>
                      {it.label}
                      {it.label === "Orders" && processingCount > 0 ? (
                        <span
                          className="ml-auto grid min-w-[18px] place-items-center rounded-full px-1 font-body text-[10px] font-bold"
                          style={{
                            backgroundColor: active ? "#1d4ed8" : "rgba(29,78,216,0.85)",
                            color: "#fff",
                            lineHeight: "18px",
                          }}
                        >
                          {processingCount}
                        </span>
                      ) : null}
                      {it.label === "Stock Alerts" && pendingAlertCount > 0 ? (
                        <span
                          className="ml-auto grid min-w-[18px] place-items-center rounded-full px-1 font-body text-[10px] font-bold"
                          style={{
                            backgroundColor: active ? "#1d4ed8" : "rgba(29,78,216,0.85)",
                            color: "#fff",
                            lineHeight: "18px",
                          }}
                        >
                          {pendingAlertCount}
                        </span>
                      ) : null}
                      {it.label === "Contact Messages" && unreadCount > 0 ? (
                        <span
                          className="ml-auto grid min-w-[18px] place-items-center rounded-full px-1 font-body text-[10px] font-bold"
                          style={{
                            backgroundColor: active ? "#1d4ed8" : "rgba(29,78,216,0.85)",
                            color: "#fff",
                            lineHeight: "18px",
                          }}
                        >
                          {unreadCount}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 px-3 py-4">
        <button
          type="button"
          onClick={handleSignOut}
          className="flex h-10 w-full items-center gap-3 rounded-[2px] px-3 font-body text-[13px] text-white/70 hover:bg-white/10 hover:text-white"
        >
          <span className="grid size-4 place-items-center">
            <IconLogout />
          </span>
          Sign Out
        </button>
      </div>
    </nav>
  );
}

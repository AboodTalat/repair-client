"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  IconChart,
  IconCalendar,
  IconDownload,
  IconLogout,
} from "@/components/admin/shared/Icons";
import { useRepairStore } from "@/lib/useRepairStore";
import { repairCall } from "@/lib/repairAuthedApi";

const PREFIX = "/r3pr-ledger";

// One section now (Finance). The "Exports" + "Audit" items are scaffolded as
// disabled placeholders so the sidebar reads as a real role surface and so
// adding those pages later is just flipping `disabled` off.

const SECTIONS = [
  {
    title: "Finance",
    items: [
      { href: `${PREFIX}/overview`, label: "Overview",       icon: IconChart },
      { href: `${PREFIX}/exports`,  label: "Export history", icon: IconDownload },
      { href: `${PREFIX}/audit`,    label: "Audit log",      icon: IconCalendar },
    ],
  },
];

export default function SideNav({ onNavigate }) {
  const pathname = usePathname() || "";
  const router = useRouter();

  // Real sign-out: best-effort server-side refresh-token revoke, then always
  // wipe the local auth slice and bounce to /sign-in (same pattern as the admin
  // + delivery shells). The old `<Link href="/">` only navigated home.
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
            src="/home/logo-re.png"
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
            Finance Ledger
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
                const active = !it.disabled &&
                  (pathname === it.href || pathname.startsWith(it.href + "/"));
                const Icon = it.icon;

                const className =
                  "group flex h-10 items-center gap-3 rounded-[2px] px-3 font-body text-[13px] transition-colors " +
                  (it.disabled
                    ? "cursor-not-allowed text-white/30"
                    : active
                      ? "bg-white text-[#11191f]"
                      : "text-white/80 hover:bg-white/10 hover:text-white");

                const inner = (
                  <>
                    <span className="grid size-4 place-items-center">
                      <Icon />
                    </span>
                    <span className="flex-1 truncate">{it.label}</span>
                    {it.disabled ? (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 font-body text-[9px] font-medium uppercase tracking-[1px] text-white/50">
                        Soon
                      </span>
                    ) : null}
                  </>
                );

                return (
                  <li key={it.href}>
                    {it.disabled ? (
                      <span className={className} aria-disabled="true">
                        {inner}
                      </span>
                    ) : (
                      <Link
                        href={it.href}
                        onClick={onNavigate}
                        className={className}
                      >
                        {inner}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 px-3 py-4">
        <div className="mb-3 rounded-[2px] bg-white/5 px-3 py-2.5 font-body text-[10px] leading-relaxed text-white/55">
          <span className="block font-semibold uppercase tracking-[1.2px] text-white/70">
            Read-only access
          </span>
          You can view and export financial data, but cannot modify records.
        </div>
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

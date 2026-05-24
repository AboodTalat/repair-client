"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  IconCart,
  IconLogout,
} from "@/components/admin/shared/Icons";
import { ASSIGNED_ORDERS, deliveryCounts } from "@/lib/mockDelivery";

const PREFIX = "/r3pr-dispatch";

const SECTIONS = [
  {
    title: "Dispatch",
    items: [
      { href: `${PREFIX}/dashboard`, label: "Assigned orders", icon: IconCart, badgeKey: "active" },
    ],
  },
];

export default function SideNav({ onNavigate }) {
  const pathname = usePathname() || "";
  const counts = deliveryCounts(ASSIGNED_ORDERS);

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
            Dispatch
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
                const active =
                  pathname === it.href || pathname.startsWith(it.href + "/");
                const Icon = it.icon;
                const badge = it.badgeKey ? counts[it.badgeKey] : 0;

                const className =
                  "group flex h-10 items-center gap-3 rounded-[2px] px-3 font-body text-[13px] transition-colors " +
                  (active
                    ? "bg-white text-[#11191f]"
                    : "text-white/80 hover:bg-white/10 hover:text-white");

                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      onClick={onNavigate}
                      className={className}
                    >
                      <span className="grid size-4 place-items-center">
                        <Icon />
                      </span>
                      <span className="flex-1 truncate">{it.label}</span>
                      {badge > 0 ? (
                        <span
                          className="rounded-full px-1.5 py-0.5 font-body text-[10px] font-semibold leading-none"
                          style={{ backgroundColor: "#1d4ed8", color: "#ffffff" }}
                        >
                          {badge}
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
        <div className="mb-3 rounded-[2px] bg-white/5 px-3 py-2.5 font-body text-[10px] leading-relaxed text-white/55">
          <span className="block font-semibold uppercase tracking-[1.2px] text-white/70">
            Delivery account
          </span>
          You can update status on orders assigned to you. You cannot modify catalog or pricing.
        </div>
        <Link
          href="/"
          className="flex h-10 items-center gap-3 rounded-[2px] px-3 font-body text-[13px] text-white/70 hover:bg-white/10 hover:text-white"
        >
          <span className="grid size-4 place-items-center">
            <IconLogout />
          </span>
          Sign Out
        </Link>
      </div>
    </nav>
  );
}

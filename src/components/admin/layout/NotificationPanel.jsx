"use client";

import Link from "next/link";
import {
  IconCart,
  IconMessageSquare,
  IconBell,
  IconAlert,
  IconChevronRight,
} from "@/components/admin/shared/Icons";

const PREFIX = "/r3pr-console";

// Per-type presentation: label, target page, and icon/colors. Keyed by the
// server's admin_notifications.type values (migration 0027).
const SECTION_CONFIG = {
  order: { title: "New Orders", href: `${PREFIX}/orders`, Icon: IconCart, iconBg: "#dbeafe", iconFg: "#1e40af" },
  message: { title: "Unread Messages", href: `${PREFIX}/messages`, Icon: IconMessageSquare, iconBg: "#e0e7ff", iconFg: "#3730a3" },
  stock_alert: { title: "Stock Alert Requests", href: `${PREFIX}/stock-alerts`, Icon: IconBell, iconBg: "#fef3c7", iconFg: "#92400e" },
  low_stock: { title: "Low Stock", href: `${PREFIX}/products`, Icon: IconAlert, iconBg: "#fee2e2", iconFg: "#991b1b" },
};
const SECTION_ORDER = ["order", "message", "stock_alert", "low_stock"];
const MAX_PER_SECTION = 4;

export default function NotificationPanel({ notifications = [], push, onClose }) {
  const total = notifications.length;

  // Group the flat feed into the 4 sections, preserving newest-first order.
  const grouped = SECTION_ORDER.map((type) => ({
    type,
    config: SECTION_CONFIG[type],
    items: notifications.filter((n) => n.type === type),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="fixed inset-x-2 top-[68px] z-40 flex max-h-[calc(100dvh-84px)] flex-col overflow-hidden rounded-[10px] border border-[#e5e7eb] bg-white shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:z-30 sm:max-h-[540px] sm:w-[380px] sm:rounded-[4px] sm:shadow-xl">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#e5e7eb] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-display text-[12px] font-bold uppercase tracking-[1.4px] text-[#11191f]">
            Notifications
          </span>
          {total > 0 ? (
            <span
              className="grid min-w-[18px] place-items-center rounded-full px-1.5 font-body text-[10px] font-bold text-white"
              style={{ backgroundColor: "#dc2626", lineHeight: "18px" }}
            >
              {total > 99 ? "99+" : total}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Close notifications"
          onClick={onClose}
          className="grid size-7 place-items-center rounded-[2px] text-[#6b7280] hover:bg-[#f3f4f6]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" className="size-4">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14">
            <span className="grid size-12 place-items-center rounded-full bg-[#f3f4f6] text-[#9ca3af]">
              <span className="grid size-6 place-items-center">
                <IconBell />
              </span>
            </span>
            <p className="font-body text-[13px] text-[#6b7280]">All caught up</p>
          </div>
        ) : (
          grouped.map((g) => (
            <NotifSection key={g.type} config={g.config} items={g.items} onClose={onClose} />
          ))
        )}
      </div>

      {/* Push-notification control (device-level) */}
      <PushFooter push={push} />
    </div>
  );
}

// Device push toggle. Only rendered when the browser supports Web Push. On iOS
// it guides the admin to install the PWA first (iOS only allows push for a
// home-screen-installed, standalone PWA).
function PushFooter({ push }) {
  if (!push || !push.supported) return null;

  let content;
  if (push.subscribed) {
    content = (
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-body text-[12px] text-[#16a34a]">
          <IconBell />
          Push alerts on for this device
        </span>
        <button
          type="button"
          onClick={push.disable}
          disabled={push.busy}
          className="font-body text-[11px] text-[#6b7280] hover:text-[#dc2626] hover:underline disabled:opacity-50"
        >
          Turn off
        </button>
      </div>
    );
  } else if (push.needsInstall || push.error === "needs-install") {
    content = (
      <p className="font-body text-[11px] leading-relaxed text-[#6b7280]">
        To get push alerts on iPhone/iPad, tap the Share icon and{" "}
        <span className="font-semibold text-[#11191f]">Add to Home Screen</span>, then open the console from there.
      </p>
    );
  } else if (push.permission === "denied" || push.error === "denied") {
    content = (
      <p className="font-body text-[11px] leading-relaxed text-[#6b7280]">
        Notifications are blocked. Enable them for this site in your browser settings, then reload.
      </p>
    );
  } else {
    content = (
      <button
        type="button"
        onClick={push.enable}
        disabled={push.busy}
        className="flex w-full items-center justify-center gap-2 rounded-[4px] bg-[#11191f] px-3 py-2 font-body text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: "#11191f" }}
      >
        <IconBell />
        {push.busy ? "Enabling…" : "Enable push notifications"}
      </button>
    );
  }

  return <div className="shrink-0 border-t border-[#e5e7eb] bg-[#fafafa] px-4 py-3">{content}</div>;
}

function NotifSection({ config, items, onClose }) {
  const { title, href, Icon, iconBg, iconFg } = config;
  const shown = items.slice(0, MAX_PER_SECTION);
  const extraCount = items.length > MAX_PER_SECTION ? items.length - MAX_PER_SECTION : 0;

  return (
    <div className="border-t border-[#e5e7eb] first:border-t-0">
      {/* Section header */}
      <div className="flex items-center justify-between bg-[#f3f4f6] px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="grid size-5 place-items-center rounded-full" style={{ backgroundColor: iconBg, color: iconFg }}>
            <span className="grid size-3 place-items-center">
              <Icon />
            </span>
          </span>
          <span className="font-body text-[11px] font-semibold uppercase tracking-[1px] text-[#11191f]">
            {title}
          </span>
          <span
            className="grid min-w-[16px] place-items-center rounded-full px-1 font-body text-[10px] font-bold"
            style={{ backgroundColor: "#e5e7eb", color: "#52525b", lineHeight: "16px" }}
          >
            {items.length}
          </span>
        </div>
        <Link href={href} onClick={onClose} className="font-body text-[11px] text-[#1d4ed8] hover:underline">
          View all
        </Link>
      </div>

      {/* Items */}
      <ul className="divide-y divide-[#f3f4f6]">
        {shown.map((item) => (
          <li key={item.id}>
            <Link
              href={href}
              onClick={onClose}
              className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[#fafafa]"
            >
              <span
                className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full"
                style={{ backgroundColor: iconBg, color: iconFg }}
              >
                <span className="grid size-4 place-items-center">
                  <Icon />
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-body text-[13px] font-medium text-[#11191f]">{item.title}</p>
                {item.body ? (
                  <p className="line-clamp-1 font-body text-[11px] text-[#6b7280]">{item.body}</p>
                ) : null}
                {item.time ? (
                  <p className="mt-0.5 font-body text-[10px] text-[#9ca3af]">{item.time}</p>
                ) : null}
              </div>
              {/* Unread dot — an item unread for this admin (created after their
                  read watermark). Cleared once the bell is opened. */}
              {!item.isRead ? (
                <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ backgroundColor: "#dc2626" }} aria-label="Unread" />
              ) : (
                <span className="mt-1 grid size-4 shrink-0 place-items-center text-[#9ca3af]">
                  <IconChevronRight />
                </span>
              )}
            </Link>
          </li>
        ))}
        {extraCount > 0 ? (
          <li>
            <Link
              href={href}
              onClick={onClose}
              className="flex items-center justify-center py-2.5 font-body text-[11px] font-medium text-[#1d4ed8] hover:bg-[#fafafa] hover:underline"
            >
              +{extraCount} more
            </Link>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

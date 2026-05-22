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

export default function NotificationPanel({ orders, messages, stockAlerts, lowStock, onClose }) {
  const totalCount =
    orders.length + messages.length + stockAlerts.length + lowStock.length;

  return (
    <div className="absolute right-0 top-11 z-30 w-[380px] overflow-hidden rounded-[4px] border border-[#e5e7eb] bg-white shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#e5e7eb] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-display text-[12px] font-bold uppercase tracking-[1.4px] text-[#11191f]">
            Notifications
          </span>
          {totalCount > 0 ? (
            <span
              className="grid min-w-[18px] place-items-center rounded-full px-1.5 font-body text-[10px] font-bold text-white"
              style={{ backgroundColor: "#dc2626", lineHeight: "18px" }}
            >
              {totalCount > 99 ? "99+" : totalCount}
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
      <div className="max-h-[480px] overflow-y-auto">
        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14">
            <span className="grid size-12 place-items-center rounded-full bg-[#f3f4f6] text-[#9ca3af]">
              <span className="grid size-6 place-items-center">
                <IconBell />
              </span>
            </span>
            <p className="font-body text-[13px] text-[#6b7280]">All caught up</p>
          </div>
        ) : (
          <>
            {orders.length > 0 ? (
              <NotifSection
                title="New Orders"
                href={`${PREFIX}/orders`}
                icon={<IconCart />}
                iconBg="#dbeafe"
                iconFg="#1e40af"
                count={orders.length}
                items={orders.slice(0, 3).map((o) => ({
                  key: o.id,
                  primary: `Order ${o.id}`,
                  secondary: `${o.customer.name} · JOD ${Number(o.total).toFixed(2)}`,
                  time: o.placed,
                }))}
                extraCount={orders.length > 3 ? orders.length - 3 : 0}
                onClose={onClose}
              />
            ) : null}

            {messages.length > 0 ? (
              <NotifSection
                title="Unread Messages"
                href={`${PREFIX}/messages`}
                icon={<IconMessageSquare />}
                iconBg="#e0e7ff"
                iconFg="#3730a3"
                count={messages.length}
                items={messages.slice(0, 3).map((m) => ({
                  key: m.id,
                  primary: `${m.firstName} ${m.lastName}`,
                  secondary: m.message,
                  time: m.date,
                }))}
                extraCount={messages.length > 3 ? messages.length - 3 : 0}
                onClose={onClose}
              />
            ) : null}

            {stockAlerts.length > 0 ? (
              <NotifSection
                title="Stock Alert Requests"
                href={`${PREFIX}/stock-alerts`}
                icon={<IconBell />}
                iconBg="#fef3c7"
                iconFg="#92400e"
                count={stockAlerts.length}
                items={stockAlerts.slice(0, 3).map((a) => ({
                  key: a.id,
                  primary: a.customer.name,
                  secondary: `${a.product} · ${a.color} · ${a.size}`,
                  time: a.requestedAt,
                }))}
                extraCount={stockAlerts.length > 3 ? stockAlerts.length - 3 : 0}
                onClose={onClose}
              />
            ) : null}

            {lowStock.length > 0 ? (
              <NotifSection
                title="Low Stock"
                href={`${PREFIX}/products`}
                icon={<IconAlert />}
                iconBg="#fee2e2"
                iconFg="#991b1b"
                count={lowStock.length}
                items={lowStock.slice(0, 3).map((ls, i) => ({
                  key: `ls-${i}`,
                  primary: ls.product,
                  secondary: `${ls.variant} · ${ls.qty} left (min ${ls.threshold})`,
                  time: null,
                }))}
                extraCount={lowStock.length > 3 ? lowStock.length - 3 : 0}
                onClose={onClose}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function NotifSection({ title, href, icon, iconBg, iconFg, count, items, extraCount, onClose }) {
  return (
    <div className="border-t border-[#e5e7eb] first:border-t-0">
      {/* Section header */}
      <div className="flex items-center justify-between bg-[#f3f4f6] px-4 py-2">
        <div className="flex items-center gap-2">
          <span
            className="grid size-5 place-items-center rounded-full"
            style={{ backgroundColor: iconBg, color: iconFg }}
          >
            <span className="grid size-3 place-items-center">{icon}</span>
          </span>
          <span className="font-body text-[11px] font-semibold uppercase tracking-[1px] text-[#11191f]">
            {title}
          </span>
          <span
            className="grid min-w-[16px] place-items-center rounded-full px-1 font-body text-[10px] font-bold"
            style={{ backgroundColor: "#e5e7eb", color: "#52525b", lineHeight: "16px" }}
          >
            {count}
          </span>
        </div>
        <Link
          href={href}
          onClick={onClose}
          className="font-body text-[11px] text-[#1d4ed8] hover:underline"
        >
          View all
        </Link>
      </div>

      {/* Items */}
      <ul className="divide-y divide-[#f3f4f6]">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              href={href}
              onClick={onClose}
              className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[#fafafa]"
            >
              <span
                className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full"
                style={{ backgroundColor: iconBg, color: iconFg }}
              >
                <span className="grid size-4 place-items-center">{icon}</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-body text-[13px] font-medium text-[#11191f]">
                  {item.primary}
                </p>
                <p className="line-clamp-1 font-body text-[11px] text-[#6b7280]">
                  {item.secondary}
                </p>
                {item.time ? (
                  <p className="mt-0.5 font-body text-[10px] text-[#9ca3af]">{item.time}</p>
                ) : null}
              </div>
              <span className="mt-1 grid size-4 shrink-0 place-items-center text-[#9ca3af]">
                <IconChevronRight />
              </span>
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

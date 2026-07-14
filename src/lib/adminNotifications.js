// Data layer for the admin console notification bell (TopBar).
//
// Wired to the repair sub-server: `myAppAdminListNotifications` (feed + unread
// count) + `myAppAdminMarkNotificationsRead` (advance this admin's read
// watermark). Both are admin-gated; the TopBar is only mounted inside the admin
// shell, so the caller is always an admin.
//
// The notification rows are created server-side (event-time for new orders /
// messages / stock-alert requests, daily for low-stock) and emailed to admins
// by the notification-dispatcher cron. See Server migration 0027.

import { repairCall } from "@/lib/repairAuthedApi";

// Fetch the recent notification feed + the caller's unread count.
// Returns { unreadCount, notifications: [{ id, type, title, body, isRead, time }] }.
export async function fetchAdminNotifications() {
  const data = await repairCall("myAppAdminListNotifications", {}, { isQuery: true });
  const rows = Array.isArray(data?.notifications) ? data.notifications : [];
  return {
    unreadCount: Number(data?.unread_count) || 0,
    notifications: rows.map((n) => ({
      id: n.id,
      type: n.type, // "order" | "message" | "stock_alert" | "low_stock"
      title: n.title || "",
      body: n.body || "",
      isRead: !!n.is_read,
      time: formatRelativeTime(n.created_at),
    })),
  };
}

// Mark every current notification read FOR THIS ADMIN (per-admin watermark).
export async function markAdminNotificationsRead() {
  await repairCall("myAppAdminMarkNotificationsRead", {}, { isQuery: false });
}

// Compact relative time for the notification rows ("Just now" / "5m ago" /
// "3h ago" / "2d ago" / a date for older). The server sends created_at as an
// ISO string.
function formatRelativeTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString();
}

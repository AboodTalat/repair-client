import OrdersPageClient from "@/components/customer/account/OrdersPageClient";
import {
  ORDERS,
  ORDER_STATUS_OPTIONS,
  ORDER_DATE_RANGES,
  filterOrders,
} from "@/lib/mockOrders";

// `/account/orders` — Figma mobile 41:1420 + desktop 119:4406.
//
// Server component. Reads filter axes from the URL (same convention as /shop):
//   ?status=delivered,on-the-way   CSV of status SLUGS (see ORDER_STATUS_OPTIONS)
//   ?date=30d|6m|year|all          single date-range slug (see ORDER_DATE_RANGES)
// Unknown values are dropped silently so a stale URL never crashes the page.
// Will swap to `repairQuery("myAppListMyOrders", { filters })` once the
// customer-scoped order list resolver lands on the server.

export const metadata = {
  title: "Orders — Repair",
};

const STATUS_SLUGS = new Set(ORDER_STATUS_OPTIONS.map((o) => o.slug));
const DATE_SLUGS = new Set(ORDER_DATE_RANGES.map((o) => o.slug));

export default async function OrdersPage({ searchParams }) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const orders = filterOrders(ORDERS, filters);
  return <OrdersPageClient orders={orders} filters={filters} />;
}

function parseFilters(sp) {
  const statuses = csv(sp?.status).filter((s) => STATUS_SLUGS.has(s));
  const dateRaw = typeof sp?.date === "string" ? sp.date : null;
  const dateRange = dateRaw && DATE_SLUGS.has(dateRaw) ? dateRaw : "all";
  return { statuses, dateRange };
}

function csv(s) {
  if (!s) return [];
  return String(s)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

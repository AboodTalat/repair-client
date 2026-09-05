"use client";

// Global admin search — the TopBar input's data layer.
//
// Fans one term out across the three things an admin actually looks up by name:
// products, orders, customers. There are no per-entity admin routes, so a
// result's job is (a) to prove the record exists and show enough to recognise
// it, and (b) to hand off to the section page with the same term pre-applied
// (`/r3pr-console/<section>?q=`). The managers seed their own search box from
// that param, so the click lands on a filtered list rather than a raw one.
//
// Each leg is independently `.catch`ed: one failing resolver (or one an admin
// lacks rights for) must not blank the whole dropdown.

import { repairCall } from "@/lib/repairAuthedApi";
import { rawToDisplayStatus, statusLabel } from "@/lib/adminOrders";

// Below this, a search is more noise than signal — and every keystroke costs
// three resolver round-trips (one of which, myAppAdminListUsers, writes an
// audit row per call). Pairs with the TopBar's debounce.
export const MIN_SEARCH_LEN = 2;

// Per-group cap. The dropdown is a jump-off, not a report — "View all" routes
// to the real, paged section page.
const GROUP_LIMIT = 5;

export const SEARCH_SECTIONS = {
  products: "/r3pr-console/products",
  orders: "/r3pr-console/orders",
  customers: "/r3pr-console/users",
};

/** Section URL carrying the term, so the manager lands pre-filtered. */
export function sectionHref(group, term) {
  const base = SEARCH_SECTIONS[group] || "/r3pr-console/dashboard";
  const q = String(term || "").trim();
  return q ? `${base}?q=${encodeURIComponent(q)}` : base;
}

function money(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v.toFixed(2) : "0.00";
}

/**
 * Search all three domains at once.
 * Returns { products, orders, customers, totals, empty } — never throws.
 * `totals` are the SERVER-side match counts (not the capped page), so the
 * "View all N" affordance tells the truth about how much is being hidden.
 */
export async function searchAdmin(term) {
  const q = String(term || "").trim();
  const empty = { products: [], orders: [], customers: [], totals: { products: 0, orders: 0, customers: 0 }, empty: true };
  if (q.length < MIN_SEARCH_LEN) return empty;

  const [prodRes, orderRes, userRes] = await Promise.all([
    repairCall("myAppListProducts", { search: q, includeHidden: true, limit: GROUP_LIMIT }, { isQuery: true }).catch(() => null),
    repairCall("myAppAdminListOrders", { search: q, limit: GROUP_LIMIT }, { isQuery: true }).catch(() => null),
    repairCall("myAppAdminListUsers", { search: q, limit: GROUP_LIMIT }, { isQuery: true }).catch(() => null),
  ]);

  const products = (prodRes?.items || []).map((p) => ({
    id: Number(p.id),
    name: p.name || `#${p.id}`,
    price: money(p.base_price),
    hidden: p.is_visible === false,
  }));

  // Orders come back in the same enriched shape the Orders page consumes —
  // reuse its status translation so a result never shows a raw enum value the
  // admin doesn't recognise ("out_for_delivery" vs "With Delivery").
  const orders = (orderRes?.items || []).map((o) => ({
    id: Number(o.id),
    number: o.order_number || `#${o.id}`,
    customer: o.customer?.email || o.customer?.name || "—",
    status: statusLabel(rawToDisplayStatus(o.status)) || o.status,
    total: money(o.total),
  }));

  // NOTE the key: this resolver returns `users`, not `items`.
  const customers = (userRes?.users || []).map((u) => ({
    id: Number(u.id),
    email: u.email || `#${u.id}`,
    phone: u.phone || "",
    role: u.role || "customer",
    inactive: u.is_active === false,
  }));

  const totals = {
    products: Number(prodRes?.total ?? products.length) || 0,
    orders: Number(orderRes?.total ?? orders.length) || 0,
    customers: Number(userRes?.total ?? customers.length) || 0,
  };

  return {
    products,
    orders,
    customers,
    totals,
    empty: products.length === 0 && orders.length === 0 && customers.length === 0,
  };
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { MobileOrderCard, DesktopOrderCard } from "./OrderCard";
import OrderFilterDrawer from "./OrderFilterDrawer";
import ReorderResultDrawer from "./ReorderResultDrawer";
import {
  ACTIVE_ORDER_FILTER_COUNT,
  filterOrders,
  mapServerOrderToCard,
} from "@/lib/orders";
import { repairCall } from "@/lib/repairAuthedApi";
import { useRepairStore } from "@/lib/useRepairStore";
import useStoreHydrated from "@/lib/useStoreHydrated";

// Orders listing — Figma mobile 41:1420 + desktop 119:4406.
//
// Filter state lives in the URL query string (mirrors how /shop handles its
// filters):
//   ?status=delivered,on-the-way   CSV of status slugs (see ORDER_STATUS_OPTIONS)
//   ?date=30d|6m|year|all          single date-range slug (default "all" => omitted)
// The server `page.js` parses + validates these and forwards the active
// `filters` down here. The orders themselves are fetched client-side from
// myAppGetMyOrders (customer-scoped, needs the auth token) and filtered against
// those axes here so the collapsed "on the way" chip + date ranges behave
// exactly as the axes describe.

const ORDERS_PAGE_SIZE = 100; // order history fits comfortably; see note in empty/footer copy

function FilterChevron() {
  return (
    <svg
      viewBox="0 0 12 12"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 4.5 6 7.5l3-3" />
    </svg>
  );
}

export default function OrdersPageClient({ filters }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [filterOpen, setFilterOpen] = useState(false);

  // Gate on rehydration so the auth token is present before we call the API.
  const hydrated = useStoreHydrated();

  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!hydrated) return undefined;
    let active = true;
    // Defaults already start in the loading state; flip flags only inside the
    // async callbacks so we don't setState synchronously in the effect body.
    repairCall("myAppGetMyOrders", { limit: ORDERS_PAGE_SIZE }, { isQuery: true })
      .then((res) => {
        if (!active) return;
        const rows = Array.isArray(res?.items) ? res.items : [];
        setAllOrders(rows.map(mapServerOrderToCard));
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [hydrated]);

  const activeFilterCount = useMemo(() => ACTIVE_ORDER_FILTER_COUNT(filters), [filters]);
  const orders = useMemo(() => filterOrders(allOrders, filters), [allOrders, filters]);

  // "Buy again" — re-add a past order's items to the cart server-side (capped to
  // current stock) then route to /cart. `reorderingId` guards against double
  // submits + drives the per-card "Adding…" state.
  const [reorderingId, setReorderingId] = useState(null);
  const [reorderError, setReorderError] = useState(null);
  // Out-of-stock result from a reorder: { items: [{productVariantId, productName,
  // color, size}], addedCount }. When set, the ReorderResultDrawer is shown so
  // the customer can subscribe to back-in-stock alerts for the sold-out items.
  const [reorderResult, setReorderResult] = useState(null);

  async function handleBuyAgain(orderId) {
    if (reorderingId != null) return;
    setReorderingId(orderId);
    setReorderError(null);
    try {
      const res = await repairCall("myAppReorder", { orderId }, { isQuery: false });
      const outOfStock = Array.isArray(res?.outOfStock) ? res.outOfStock : [];
      const added = Number(res?.added) || 0;
      if (added > 0) await useRepairStore.getState().syncCart();
      if (outOfStock.length > 0) {
        // Tell the customer which items are sold out + offer "Notify me".
        setReorderResult({ items: outOfStock, addedCount: added });
        return;
      }
      // Everything available was added (or already in the cart) — go to cart.
      router.push("/cart");
    } catch (e) {
      const msg = String(e?.message || "").replace(/^repairClientApi \S+:\s*/, "");
      setReorderError(msg || "Couldn't add these items. Please try again.");
    } finally {
      setReorderingId(null);
    }
  }

  function applyFilters(next) {
    const sp = new URLSearchParams(params);
    if (next.statuses?.length) sp.set("status", next.statuses.join(","));
    else sp.delete("status");
    if (next.dateRange && next.dateRange !== "all") sp.set("date", next.dateRange);
    else sp.delete("date");
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const hasOrders = orders.length > 0;
  const hasAnyOrders = allOrders.length > 0;
  const busy = !hydrated || loading;

  return (
    <>
      <main className="w-full bg-white">
        {/* Mobile layout */}
        <div className="md:hidden">
          <div className="px-4 pt-4 pb-12">
            {/* Page heading row — small ORDERS title + Filter text link */}
            <div className="flex w-full items-center justify-between pb-4">
              <h1 className="font-display text-[14px] font-medium text-[#11191f]">
                ORDERS
              </h1>
              <button
                type="button"
                onClick={() => setFilterOpen(true)}
                disabled={busy}
                className="font-display text-[12px] text-[rgba(17,25,31,0.5)] hover:text-[#11191f] disabled:opacity-40"
              >
                Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </button>
            </div>

            {busy ? (
              <OrdersLoading mobile />
            ) : error ? (
              <OrdersError mobile />
            ) : hasOrders ? (
              <div className="flex w-full flex-col gap-4">
                {orders.map((order) => (
                  <MobileOrderCard
                    key={order.id}
                    order={order}
                    onBuyAgain={handleBuyAgain}
                    buyAgainBusy={reorderingId === order.id}
                  />
                ))}
              </div>
            ) : (
              <EmptyOrders mobile hasAnyOrders={hasAnyOrders} />
            )}
          </div>
        </div>

        {/* Desktop layout */}
        <div className="hidden md:block">
          <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-8 pt-6 pb-16">
            {/* Page title + filter pill */}
            <div className="flex w-full items-center justify-between border-b border-[#f3f4f6] pb-[25px]">
              <h1
                className="font-display text-[30px] font-bold uppercase leading-9 text-[#11191f]"
                style={{ letterSpacing: "-0.75px" }}
              >
                Orders
              </h1>
              <button
                type="button"
                onClick={() => setFilterOpen(true)}
                disabled={busy}
                className="flex items-center gap-2 rounded border border-[#11191f] px-[17px] py-[9px] font-display text-[14px] font-medium leading-5 text-[#11191f] disabled:opacity-40"
              >
                Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                <FilterChevron />
              </button>
            </div>

            {busy ? (
              <OrdersLoading />
            ) : error ? (
              <OrdersError />
            ) : hasOrders ? (
              <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
                {orders.map((order) => (
                  <DesktopOrderCard
                    key={order.id}
                    order={order}
                    onBuyAgain={handleBuyAgain}
                    buyAgainBusy={reorderingId === order.id}
                  />
                ))}
              </div>
            ) : (
              <EmptyOrders hasAnyOrders={hasAnyOrders} />
            )}
          </div>
        </div>
      </main>

      <OrderFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        value={filters}
        onApply={applyFilters}
      />

      <ReorderResultDrawer
        open={reorderResult != null}
        items={reorderResult?.items ?? []}
        addedCount={reorderResult?.addedCount ?? 0}
        onClose={() => setReorderResult(null)}
        onGoToCart={() => {
          setReorderResult(null);
          router.push("/cart");
        }}
      />

      {reorderError ? (
        <div
          role="alert"
          className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-start justify-between gap-3 rounded-[4px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 shadow-lg md:left-auto md:right-6 md:mx-0"
        >
          <span className="font-body text-[13px] text-[#991b1b]">{reorderError}</span>
          <button
            type="button"
            onClick={() => setReorderError(null)}
            className="font-body text-[13px] font-semibold text-[#991b1b]"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ) : null}
    </>
  );
}

function OrdersLoading({ mobile = false }) {
  return (
    <div
      className={
        "flex w-full flex-col items-center justify-center gap-3 " +
        (mobile ? "py-16" : "py-24")
      }
    >
      <div className="size-8 animate-spin rounded-full border-2 border-[#e5e7eb] border-t-[#11191f]" />
      <p className="font-body text-[14px] text-[#6b7280]" style={{ fontStretch: "75%" }}>
        Loading your orders…
      </p>
    </div>
  );
}

function OrdersError({ mobile = false }) {
  return (
    <div
      className={
        "flex w-full flex-col items-center justify-center text-center " +
        (mobile ? "py-16" : "py-24")
      }
    >
      <p
        className="font-display text-[#11191f]"
        style={{ fontSize: mobile ? 16 : 22, fontWeight: 500, letterSpacing: "0.02em" }}
      >
        WE COULDN&apos;T LOAD YOUR ORDERS.
      </p>
      <p
        className="mt-2 font-body text-[rgba(17,25,31,0.6)]"
        style={{ fontSize: mobile ? 12 : 14, fontStretch: "75%" }}
      >
        Please refresh the page or try again in a moment.
      </p>
    </div>
  );
}

// Two empty cases: a customer who simply hasn't ordered yet gets a friendly
// shop CTA; a customer whose active filters hide everything gets the
// "clear a filter" hint.
function EmptyOrders({ mobile = false, hasAnyOrders = false }) {
  if (!hasAnyOrders) {
    return (
      <div
        className={
          "flex w-full flex-col items-center justify-center text-center " +
          (mobile ? "py-16" : "py-24")
        }
      >
        <p
          className="font-display text-[#11191f]"
          style={{ fontSize: mobile ? 16 : 22, fontWeight: 500, letterSpacing: "0.02em" }}
        >
          YOU HAVEN&apos;T PLACED ANY ORDERS YET.
        </p>
        <p
          className="mt-2 font-body text-[rgba(17,25,31,0.6)]"
          style={{ fontSize: mobile ? 12 : 14, fontStretch: "75%" }}
        >
          When you place an order it&apos;ll show up here so you can track it.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-[2px] bg-[#11191f] px-6 font-display text-[12px] font-bold uppercase tracking-[1px] text-white hover:bg-[#1c2630]"
        >
          Start Shopping
        </Link>
      </div>
    );
  }
  return (
    <div
      className={
        "flex w-full flex-col items-center justify-center text-center " +
        (mobile ? "py-16" : "py-24")
      }
    >
      <p
        className="font-display text-[#11191f]"
        style={{ fontSize: mobile ? 16 : 22, fontWeight: 500, letterSpacing: "0.02em" }}
      >
        NO ORDERS MATCH YOUR FILTERS.
      </p>
      <p
        className="mt-2 font-body text-[rgba(17,25,31,0.6)]"
        style={{ fontSize: mobile ? 12 : 14, fontStretch: "75%" }}
      >
        Try clearing a filter or selecting a wider date range.
      </p>
    </div>
  );
}

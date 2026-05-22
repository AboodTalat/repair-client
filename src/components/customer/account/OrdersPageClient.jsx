"use client";

import { useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { MobileOrderCard, DesktopOrderCard } from "./OrderCard";
import OrderFilterDrawer from "./OrderFilterDrawer";
import { ACTIVE_ORDER_FILTER_COUNT } from "@/lib/mockOrders";

// Orders listing — Figma mobile 41:1420 + desktop 119:4406.
//
// Filter state lives in the URL query string (mirrors how /shop handles its
// filters):
//   ?status=delivered,on-the-way   CSV of status slugs (see ORDER_STATUS_OPTIONS)
//   ?date=30d|6m|year|all          single date-range slug (default "all" => omitted)
// The server `page.js` parses these and forwards both the active `filters`
// and the already-filtered `orders` list down here.

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

export default function OrdersPageClient({ orders, filters }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [filterOpen, setFilterOpen] = useState(false);

  const activeFilterCount = useMemo(() => ACTIVE_ORDER_FILTER_COUNT(filters), [filters]);

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
                className="font-display text-[12px] text-[rgba(17,25,31,0.5)] hover:text-[#11191f]"
              >
                Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </button>
            </div>

            {hasOrders ? (
              <div className="flex w-full flex-col gap-4">
                {orders.map((order) => (
                  <MobileOrderCard key={order.id} order={order} />
                ))}
              </div>
            ) : (
              <EmptyOrders mobile />
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
                className="flex items-center gap-2 rounded border border-[#11191f] px-[17px] py-[9px] font-display text-[14px] font-medium leading-5 text-[#11191f]"
              >
                Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                <FilterChevron />
              </button>
            </div>

            {hasOrders ? (
              <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
                {orders.map((order) => (
                  <DesktopOrderCard key={order.id} order={order} />
                ))}
              </div>
            ) : (
              <EmptyOrders />
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
    </>
  );
}

function EmptyOrders({ mobile = false }) {
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

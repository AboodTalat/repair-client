"use client";

import { useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { MobileWishlistCard, DesktopWishlistCard } from "./WishlistCard";
import WishlistFilterDrawer from "./WishlistFilterDrawer";
import { ACTIVE_WISHLIST_FILTER_COUNT } from "@/lib/mockWishlist";

// Wishlist listing — Figma mobile 41:1613 + desktop 119:4743.
//
// Filter state lives in the URL query string (mirrors how /shop and
// /account/orders handle filters):
//   ?type=Hoodies,Joggers           CSV of type SLUGS (see WISHLIST_TYPE_OPTIONS)
//   ?price=under30|30to50|over50    single price range slug (default "all" => omitted)
// The server `page.js` parses these and forwards both the active `filters`
// and the already-filtered `items` list down here.

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

export default function WishlistPageClient({ items, totalCount, filters }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [filterOpen, setFilterOpen] = useState(false);

  const activeFilterCount = useMemo(
    () => ACTIVE_WISHLIST_FILTER_COUNT(filters),
    [filters],
  );

  function applyFilters(next) {
    const sp = new URLSearchParams(params);
    if (next.types?.length) sp.set("type", next.types.join(","));
    else sp.delete("type");
    if (next.priceRange && next.priceRange !== "all") sp.set("price", next.priceRange);
    else sp.delete("price");
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const hasItems = items.length > 0;

  return (
    <>
      <main className="w-full bg-white">
        {/* Mobile layout */}
        <div className="md:hidden">
          <div className="px-4 pt-4 pb-12">
            <div className="flex w-full items-center justify-between pb-4">
              <h1 className="font-display text-[14px] font-medium text-[#11191f]">
                WISHLIST
              </h1>
              <button
                type="button"
                onClick={() => setFilterOpen(true)}
                className="font-display text-[12px] text-[rgba(17,25,31,0.5)] hover:text-[#11191f]"
              >
                Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </button>
            </div>

            {hasItems ? (
              <div className="flex w-full flex-col gap-4">
                {items.map((item) => (
                  <MobileWishlistCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <EmptyWishlist mobile filtered={totalCount > 0} />
            )}
          </div>
        </div>

        {/* Desktop layout */}
        <div className="hidden md:block">
          <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-8 pt-6 pb-16">
            {/* Page title + count + filter pill */}
            <div className="flex w-full items-center justify-between border-b border-[#f3f4f6] pb-[25px]">
              <h1
                className="font-display text-[24px] font-bold uppercase leading-8 text-[#11191f]"
                style={{ letterSpacing: "-0.6px" }}
              >
                Wishlist
              </h1>
              <div className="flex items-center gap-4">
                <span className="font-display text-[14px] leading-5 font-medium text-[#666]">
                  {items.length} {items.length === 1 ? "Item" : "Items"}
                </span>
                <button
                  type="button"
                  onClick={() => setFilterOpen(true)}
                  className="flex items-center gap-2 rounded border border-[#11191f] px-[17px] py-[9px] font-display text-[14px] font-medium leading-5 text-[#11191f]"
                >
                  Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                  <FilterChevron />
                </button>
              </div>
            </div>

            {hasItems ? (
              <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => (
                  <DesktopWishlistCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <EmptyWishlist filtered={totalCount > 0} />
            )}
          </div>
        </div>
      </main>

      <WishlistFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        value={filters}
        onApply={applyFilters}
      />
    </>
  );
}

function EmptyWishlist({ mobile = false, filtered }) {
  const [title, body] = filtered
    ? [
        "NO ITEMS MATCH YOUR FILTERS.",
        "Try clearing a filter or selecting a wider price range.",
      ]
    : [
        "YOUR WISHLIST IS EMPTY.",
        "Browse the shop and tap the heart to save pieces for later.",
      ];

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
        {title}
      </p>
      <p
        className="mt-2 font-body text-[rgba(17,25,31,0.6)]"
        style={{ fontSize: mobile ? 12 : 14, fontStretch: "75%" }}
      >
        {body}
      </p>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import FilterBar from "./FilterBar";
import FilterDrawer from "./FilterDrawer";
import ProductGrid from "./ProductGrid";
import EmptyState from "./EmptyState";
import ComingSoonOverlay from "./ComingSoonOverlay";
import AddToCartDrawer from "./AddToCartDrawer";
import AddedToCartBanner from "./AddedToCartBanner";
import { ACTIVE_FILTER_COUNT } from "@/lib/mockShop";

// Single client island that owns:
//   - filter drawer open/close
//   - add-to-cart drawer state
//   - "Item added to cart" banner
// The product list itself is passed in as a server-rendered prop so SSR
// stays cheap.

export default function ShopPageClient({
  categoryName,
  products,
  filters,
  showComingSoon,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [filterOpen, setFilterOpen] = useState(false);
  const [cartProduct, setCartProduct] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [showBanner, setShowBanner] = useState(false);

  const activeFilterCount = useMemo(() => ACTIVE_FILTER_COUNT(filters), [filters]);

  function applyFilters(next) {
    const sp = new URLSearchParams(params);
    if (next.sizes.length) sp.set("sizes", next.sizes.join(",")); else sp.delete("sizes");
    if (next.colors.length) sp.set("colors", next.colors.join(",")); else sp.delete("colors");
    if (next.materials.length) sp.set("materials", next.materials.join(",")); else sp.delete("materials");
    if (next.types.length) sp.set("types", next.types.join(",")); else sp.delete("types");
    if (next.priceMin != null) sp.set("min", String(next.priceMin)); else sp.delete("min");
    if (next.priceMax != null) sp.set("max", String(next.priceMax)); else sp.delete("max");
    router.push(`${pathname}?${sp.toString()}`);
  }

  function handleAdd(_payload) {
    setCartCount((n) => n + 1);
    setShowBanner(true);
  }

  return (
    <>
      <AddedToCartBanner visible={showBanner} onDismiss={() => setShowBanner(false)} />

      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-4 px-4 pb-16 pt-3 md:gap-8 md:px-8 md:pt-24">
        {/* FilterBar is hidden when the coming-soon overlay is active so the
            blurred grid covers the whole content area below the header
            (Figma 198:5080). */}
        {!showComingSoon && (
          <FilterBar
            categoryName={categoryName}
            productCount={products.length}
            activeFilterCount={activeFilterCount}
            onOpenFilter={() => setFilterOpen(true)}
          />
        )}

        {showComingSoon ? (
          <ComingSoonOverlay products={products} />
        ) : products.length === 0 ? (
          <EmptyState />
        ) : (
          <ProductGrid products={products} onQuickAdd={setCartProduct} />
        )}
      </main>

      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        value={filters}
        onApply={applyFilters}
      />

      <AddToCartDrawer
        product={cartProduct}
        open={Boolean(cartProduct)}
        onClose={() => setCartProduct(null)}
        onAdd={handleAdd}
      />
    </>
  );
}

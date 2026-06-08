"use client";

import { useCallback, useEffect, useState } from "react";
import { MobileWishlistCard, DesktopWishlistCard } from "./WishlistCard";
import { useRepairStore, selectIsLoggedIn } from "@/lib/useRepairStore";
import { repairCall } from "@/lib/repairAuthedApi";

// Wishlist listing — Figma mobile 41:1613 + desktop 119:4743.
//
// WIRED: reads the signed-in customer's real wishlist via
// repairCall("myAppGetWishlist") on mount (hydration-gated like useCart so the
// list never flashes "empty" before the store rehydrates). The heart on each
// card removes the item via the store's server-backed toggleWishlist, then
// refetches. The invented type/price filter drawer was removed — the resolver
// returns no type/swatch data to filter on.

const PLACEHOLDER_IMAGE = "/shop/model-1.png";

// myAppGetWishlist line → the shape WishlistCard consumes.
//   subtitle / colors aren't returned by the resolver, so they're empty —
//   the card renders fine without them (no subtitle text, no swatch row).
function toCard(line) {
  const productId = Number(line.product_id ?? line.product?.id);
  return {
    id: line.id, // wishlist row id (React key)
    productId,
    productName: line.product?.name ?? "Item",
    currency: "JOD",
    price: line.product?.base_price ?? "",
    subtitle: "",
    colors: [],
    image: line.image_url || PLACEHOLDER_IMAGE,
    productSlug: Number.isFinite(productId) ? String(productId) : "",
  };
}

export default function WishlistPageClient() {
  const isLoggedIn = useRepairStore(selectIsLoggedIn);

  // Wait for the persisted store to rehydrate before deciding what to show.
  const [hydrated, setHydrated] = useState(() => useRepairStore.persist.hasHydrated());
  useEffect(() => {
    if (hydrated) return undefined;
    const unsub = useRepairStore.persist.onFinishHydration(() => setHydrated(true));
    if (useRepairStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, [hydrated]);

  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  const refetch = useCallback(async ({ silent = false } = {}) => {
    try {
      const data = await repairCall("myAppGetWishlist", {}, { isQuery: true });
      const lines = Array.isArray(data?.items) ? data.items : [];
      setItems(lines.map(toCard));
      setError(null);
    } catch (e) {
      if (!silent) {
        const raw = String(e?.message || "");
        setError(raw.replace(/^repairClientApi \S+:\s*/, "") || "Couldn’t load your wishlist.");
      }
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated && isLoggedIn) refetch();
    else if (hydrated && !isLoggedIn) setLoaded(true);
  }, [hydrated, isLoggedIn, refetch]);

  const removeItem = useCallback(
    async (item) => {
      // Optimistic removal; the store persists the toggle, then we reconcile.
      setItems((prev) => prev.filter((x) => x.id !== item.id));
      try {
        await useRepairStore.getState().toggleWishlist(item.productId);
        useRepairStore.getState().syncWishlist();
      } catch {
        await refetch({ silent: true }); // restore on failure
      }
    },
    [refetch]
  );

  const loading = !hydrated || (isLoggedIn && !loaded);
  const hasItems = items.length > 0;

  return (
    <main className="w-full bg-white">
      {/* Mobile layout */}
      <div className="md:hidden">
        <div className="px-4 pt-4 pb-12">
          <div className="flex w-full items-center justify-between pb-4">
            <h1 className="font-display text-[14px] font-medium text-[#11191f]">
              WISHLIST
            </h1>
          </div>

          {loading ? (
            <WishlistSkeleton mobile />
          ) : error ? (
            <WishlistError mobile message={error} onRetry={() => refetch()} />
          ) : hasItems ? (
            <div className="flex w-full flex-col gap-4">
              {items.map((item) => (
                <MobileWishlistCard
                  key={item.id}
                  item={item}
                  onRemove={() => removeItem(item)}
                />
              ))}
            </div>
          ) : (
            <EmptyWishlist mobile />
          )}
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden md:block">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-8 pt-6 pb-16">
          {/* Page title + count */}
          <div className="flex w-full items-center justify-between border-b border-[#f3f4f6] pb-[25px]">
            <h1
              className="font-display text-[24px] font-bold uppercase leading-8 text-[#11191f]"
              style={{ letterSpacing: "-0.6px" }}
            >
              Wishlist
            </h1>
            {!loading && !error ? (
              <span className="font-display text-[14px] leading-5 font-medium text-[#666]">
                {items.length} {items.length === 1 ? "Item" : "Items"}
              </span>
            ) : null}
          </div>

          {loading ? (
            <WishlistSkeleton />
          ) : error ? (
            <WishlistError message={error} onRetry={() => refetch()} />
          ) : hasItems ? (
            <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <DesktopWishlistCard
                  key={item.id}
                  item={item}
                  onRemove={() => removeItem(item)}
                />
              ))}
            </div>
          ) : (
            <EmptyWishlist />
          )}
        </div>
      </div>
    </main>
  );
}

function WishlistSkeleton({ mobile = false }) {
  const count = mobile ? 3 : 6;
  return (
    <div
      className={
        mobile
          ? "flex w-full flex-col gap-4"
          : "grid w-full grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3"
      }
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-full animate-pulse rounded bg-[rgba(17,25,31,0.05)]"
          style={{ height: mobile ? 150 : 230 }}
        />
      ))}
    </div>
  );
}

function WishlistError({ mobile = false, message, onRetry }) {
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
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 font-display text-[12px] font-bold uppercase text-[#11191f] underline"
      >
        Try again
      </button>
    </div>
  );
}

function EmptyWishlist({ mobile = false }) {
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
        YOUR WISHLIST IS EMPTY.
      </p>
      <p
        className="mt-2 font-body text-[rgba(17,25,31,0.6)]"
        style={{ fontSize: mobile ? 12 : 14, fontStretch: "75%" }}
      >
        Browse the shop and tap the heart to save pieces for later.
      </p>
    </div>
  );
}

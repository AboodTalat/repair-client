import WishlistPageClient from "@/components/customer/account/WishlistPageClient";
import {
  WISHLIST,
  WISHLIST_TYPE_OPTIONS,
  WISHLIST_PRICE_RANGES,
  filterWishlist,
} from "@/lib/mockWishlist";

// `/account/wishlist` — Figma mobile 41:1613 + desktop 119:4743.
//
// Server component. Reads filter axes from the URL (same convention as /shop
// and /account/orders):
//   ?type=Hoodies,Joggers           CSV of type SLUGS (see WISHLIST_TYPE_OPTIONS)
//   ?price=under30|30to50|over50    single price-range slug (see WISHLIST_PRICE_RANGES)
// Unknown values are dropped silently so a stale URL never crashes the page.
// Will swap to `repairQuery("myAppListMyWishlist", { filters })` once the
// customer-scoped wishlist list resolver lands on `cart.ts` (toggle/clear are
// already there).

export const metadata = {
  title: "Wishlist — Repair",
};

const TYPE_SLUGS = new Set(WISHLIST_TYPE_OPTIONS.map((o) => o.slug));
const PRICE_SLUGS = new Set(WISHLIST_PRICE_RANGES.map((o) => o.slug));

export default async function WishlistPage({ searchParams }) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const items = filterWishlist(WISHLIST, filters);
  return (
    <WishlistPageClient
      items={items}
      totalCount={WISHLIST.length}
      filters={filters}
    />
  );
}

function parseFilters(sp) {
  const types = csv(sp?.type).filter((s) => TYPE_SLUGS.has(s));
  const priceRaw = typeof sp?.price === "string" ? sp.price : null;
  const priceRange = priceRaw && PRICE_SLUGS.has(priceRaw) ? priceRaw : "all";
  return { types, priceRange };
}

function csv(s) {
  if (!s) return [];
  return String(s)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

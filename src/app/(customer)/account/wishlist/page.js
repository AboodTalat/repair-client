import WishlistPageClient from "@/components/customer/account/WishlistPageClient";

// `/account/wishlist` — Figma mobile 41:1613 + desktop 119:4743.
//
// The wishlist is auth-gated (myAppGetWishlist requires a JWT) and the
// server-side repairApi helper sends no token, so the list is fetched
// CLIENT-side via repairCall inside WishlistPageClient (mirrors the useCart
// pattern). This route already sits under (customer)/account, which is wrapped
// in <AuthGuard>, so only signed-in users reach it.
//
// The earlier type/price filter axes were invented (no Figma drawer spec, and
// myAppGetWishlist returns no type/swatch data) — dropped now that the page
// reads real data, as the mock file's own note anticipated.

export const metadata = {
  title: "Wishlist — Repair",
};

export default function WishlistPage() {
  return <WishlistPageClient />;
}

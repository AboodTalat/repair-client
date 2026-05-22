import CartPageClient from "@/components/customer/cart/CartPageClient";

// /cart — matches Figma mobile 83:5144 + desktop 119:5240.
// Mounted under (customer)/, so it inherits ShopHeader + ShopFooter from
// `(customer)/layout.js`. The page is purely presentational against
// mockCart.js for now; swap to `repairQuery("myAppGetMyCart")` once the
// storefront cart-read resolver lands on cart.ts (toggle/add/remove
// primitives are already there).

export const metadata = {
  title: "Cart — Repair",
};

export default function CartPage() {
  return <CartPageClient />;
}

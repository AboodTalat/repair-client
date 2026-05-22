import CheckoutDetailsClient from "@/components/customer/cart/CheckoutDetailsClient";

// /checkout — step 2 of the cart→details→payment flow. Matches Figma
// mobile 82:3618 + desktop 119:5592. Mounted under (customer)/, so it
// inherits ShopHeader + ShopFooter from `(customer)/layout.js`. Purely
// presentational against the mocks in `src/lib/mockCart.js` for now;
// swap to `repairQuery(...)` calls once the customer-scoped account +
// shipping-rate resolvers land on the server.

export const metadata = {
  title: "Checkout — Repair",
};

export default function CheckoutPage() {
  return <CheckoutDetailsClient />;
}

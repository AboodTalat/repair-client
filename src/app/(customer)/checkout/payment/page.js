import PaymentPageClient from "@/components/customer/cart/PaymentPageClient";

// /checkout/payment — step 3 of the cart→details→payment flow. Matches
// Figma mobile 84:6733 + desktop 119:5877. Inherits ShopHeader +
// ShopFooter from `(customer)/layout.js`.
//
// Purely presentational against the mocks in `src/lib/mockCart.js` for
// now; swap the place-order action to `myAppCheckout` once the cart
// + payment-method backend story lands (see repair/CLAUDE.md).

export const metadata = {
  title: "Payment — Repair",
};

export default function CheckoutPaymentPage() {
  return <PaymentPageClient />;
}

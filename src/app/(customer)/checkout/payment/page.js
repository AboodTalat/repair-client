import PaymentPageClient from "@/components/customer/cart/PaymentPageClient";

// /checkout/payment — step 3 of the cart→details→payment flow. Matches
// Figma mobile 84:6733 + desktop 119:5877. Inherits ShopHeader +
// ShopFooter from `(customer)/layout.js`.
//
// Wired to the backend: real cart + method-aware totals, admin-managed
// payment methods (myAppGetCommerceSettings), the address selected on the
// details step, and a real order placed via `myAppCheckout` on Confirm &
// Pay (see PaymentPageClient + repair/CLAUDE.md).

export const metadata = {
  title: "Payment — Repair",
};

export default function CheckoutPaymentPage() {
  return <PaymentPageClient />;
}

import OrderSuccessClient from "@/components/customer/cart/OrderSuccessClient";

// /checkout/success — Order confirmation screen reached after the
// "PAY & CONFIRM ORDER" CTA on /checkout/payment. Matches Figma mobile
// 85:8692 + desktop 119:6418. Inherits ShopHeader + ShopFooter from
// `(customer)/layout.js`.
//
// Purely presentational — order number / payment label / estimated
// delivery are hardcoded against the seeded cart in `mockCart.js`. Swap
// to data returned from `myAppCheckout` once the mutation is wired
// through (resolver already exists in orders.ts).

export const metadata = {
  title: "Order Confirmed — Repair",
};

export default function CheckoutSuccessPage() {
  return <OrderSuccessClient />;
}

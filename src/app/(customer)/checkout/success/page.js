import OrderSuccessClient from "@/components/customer/cart/OrderSuccessClient";

// /checkout/success — Order confirmation screen reached after the
// "PAY & CONFIRM ORDER" CTA on /checkout/payment. Matches Figma mobile
// 85:8692 + desktop 119:6418. Inherits ShopHeader + ShopFooter from
// `(customer)/layout.js`.
//
// Wired to the real placed order: reads the store's persisted `lastOrder`
// (set by myAppCheckout) and fetches `myAppGetOrderDetail` for the line
// items + snapshotted shipping address. Visiting with no placed order
// redirects to /shop (see OrderSuccessClient).

export const metadata = {
  title: "Order Confirmed — Repair",
};

export default function CheckoutSuccessPage() {
  return <OrderSuccessClient />;
}

import OrderFailedClient from "@/components/customer/cart/OrderFailedClient";

// /checkout/failed — Payment-declined screen. Reached when the DEMO payment
// gateway reports a declined payment (no order placed). Reads the declined
// attempt (amount / last4 / txn / reason) from the store's transient
// `paymentAttempt` + the live cart (see OrderFailedClient). Matches Figma
// mobile 111:3587; desktop 119:6627. Inherits ShopHeader + ShopFooter from
// `(customer)/layout.js`.

export const metadata = {
  title: "Payment Declined — Repair",
};

export default function CheckoutFailedPage() {
  return <OrderFailedClient />;
}

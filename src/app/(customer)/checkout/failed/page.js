import OrderFailedClient from "@/components/customer/cart/OrderFailedClient";

// /checkout/failed — Payment-declined screen. Matches Figma mobile
// 111:3587 exactly; the desktop layout mirrors /checkout/success's
// two-column shell (no dedicated desktop failure frame was provided —
// swap when one lands). Inherits ShopHeader + ShopFooter from
// `(customer)/layout.js`.

export const metadata = {
  title: "Payment Declined — Repair",
};

export default function CheckoutFailedPage() {
  return <OrderFailedClient />;
}

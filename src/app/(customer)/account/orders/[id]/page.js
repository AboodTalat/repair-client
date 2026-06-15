"use client";

import { use } from "react";
import OrderTrackingPage from "@/components/customer/account/OrderTrackingPage";

// Client component so the dynamic route is unambiguously picked up — server
// components in Next 16 use `await params`, but the route renders fine from a
// client component via `use(params)`. The order itself is fetched client-side
// (customer-scoped, needs the auth token) inside OrderTrackingPage, which also
// owns its loading / not-found states.

export default function OrderDetailPage({ params }) {
  const { id } = use(params);
  return <OrderTrackingPage orderId={id} />;
}

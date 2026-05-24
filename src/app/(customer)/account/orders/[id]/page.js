"use client";

import Link from "next/link";
import { use } from "react";
import { findOrder } from "@/lib/mockOrders";
import OrderTrackingPage from "@/components/customer/account/OrderTrackingPage";

// Client component so the dynamic route is unambiguously picked up — server
// components in Next 16 use `await params`, but the route is rendered fine
// from a client component via `use(params)` and avoids any cache quirks
// after the file is first added. Mock-only (no fetch).

export default function OrderDetailPage({ params }) {
  const { id } = use(params);
  const order = findOrder(id);
  if (!order) {
    return (
      <div className="mx-auto flex w-full max-w-[640px] flex-col items-center gap-4 px-4 py-16 text-center">
        <p className="font-display text-[24px] font-bold uppercase text-[#11191f]">
          Order not found
        </p>
        <p className="font-body text-[13px] text-[#6b7280]">
          We couldn&apos;t find an order with id <code>{String(id)}</code>.
        </p>
        <Link
          href="/account/orders"
          className="inline-flex h-11 items-center justify-center rounded-[2px] bg-[#11191f] px-5 font-display text-[12px] font-bold uppercase tracking-[1px] text-white hover:bg-[#1c2630]"
        >
          Back to orders
        </Link>
      </div>
    );
  }
  return <OrderTrackingPage order={order} />;
}

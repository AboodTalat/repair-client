"use client";

import Image from "next/image";
import Link from "next/link";
import { TRACKING_PIPELINE, trackingProgress } from "@/lib/mockOrders";
import OrderStatusBadge from "@/components/customer/account/OrderStatusBadge";

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <path d="M5 12l4 4 10-10" />
    </svg>
  );
}

function StepIcon({ status }) {
  if (status === "done") {
    return (
      <span className="grid size-8 place-items-center rounded-full bg-[#11191f] text-white">
        <CheckIcon />
      </span>
    );
  }
  if (status === "current") {
    return (
      <span className="grid size-8 place-items-center rounded-full border-2 border-[#11191f] bg-white">
        <span className="size-2.5 rounded-full bg-[#11191f]" />
      </span>
    );
  }
  return (
    <span className="grid size-8 place-items-center rounded-full border-2 border-[#e5e7eb] bg-white">
      <span className="size-1.5 rounded-full bg-[#d1d5db]" />
    </span>
  );
}

function Pipeline({ order }) {
  const { stepIndex, terminal } = trackingProgress(order.status);

  if (terminal === "cancelled") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-[4px] border border-[#fecaca] bg-[#fef2f2] p-6 text-center">
        <span className="grid size-10 place-items-center rounded-full bg-[#dc2626] text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </span>
        <p className="font-display text-[16px] font-bold uppercase text-[#11191f]">This order was cancelled</p>
        <p className="font-body text-[13px] text-[#6b7280]">
          If you weren&apos;t expecting this, contact support and we&apos;ll sort it out.
        </p>
      </div>
    );
  }
  if (terminal === "returned") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-[4px] border border-[#e9d5ff] bg-[#faf5ff] p-6 text-center">
        <p className="font-display text-[16px] font-bold uppercase text-[#11191f]">This order was returned</p>
        <p className="font-body text-[13px] text-[#6b7280]">A refund will arrive to your original payment method.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Desktop: horizontal step line */}
      <ol className="hidden md:flex md:items-start md:justify-between md:gap-2">
        {TRACKING_PIPELINE.map((step, i) => {
          const state = i < stepIndex ? "done" : i === stepIndex ? "current" : "todo";
          return (
            <li key={step.key} className="flex flex-1 flex-col items-center text-center">
              <div className="flex w-full items-center">
                {/* Connector left */}
                <div
                  className="h-0.5 flex-1"
                  style={{
                    backgroundColor: i === 0 ? "transparent" : i <= stepIndex ? "#11191f" : "#e5e7eb",
                  }}
                />
                <StepIcon status={state} />
                {/* Connector right */}
                <div
                  className="h-0.5 flex-1"
                  style={{
                    backgroundColor: i === TRACKING_PIPELINE.length - 1 ? "transparent" : i < stepIndex ? "#11191f" : "#e5e7eb",
                  }}
                />
              </div>
              <p className="mt-2 font-display text-[12px] font-bold uppercase tracking-[0.5px] text-[#11191f]">
                {step.label}
              </p>
              <p className="mt-1 max-w-[180px] font-body text-[11px] text-[#6b7280]">
                {step.description}
              </p>
            </li>
          );
        })}
      </ol>

      {/* Mobile: vertical step list */}
      <ol className="flex flex-col gap-4 md:hidden">
        {TRACKING_PIPELINE.map((step, i) => {
          const state = i < stepIndex ? "done" : i === stepIndex ? "current" : "todo";
          const isLast = i === TRACKING_PIPELINE.length - 1;
          return (
            <li key={step.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <StepIcon status={state} />
                {!isLast ? (
                  <div
                    className="my-1 w-0.5 flex-1"
                    style={{ backgroundColor: i < stepIndex ? "#11191f" : "#e5e7eb", minHeight: 28 }}
                  />
                ) : null}
              </div>
              <div className="flex-1 pb-2">
                <p className="font-display text-[13px] font-bold uppercase tracking-[0.5px] text-[#11191f]">
                  {step.label}
                </p>
                <p className="mt-0.5 font-body text-[12px] text-[#6b7280]">
                  {step.description}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function HistoryTimeline({ history }) {
  if (!history || history.length === 0) return null;
  return (
    <div className="rounded-[4px] border border-[#e5e7eb] bg-white p-4">
      <p className="mb-3 font-display text-[12px] font-bold uppercase tracking-[1px] text-[#11191f]">
        Activity
      </p>
      <ol className="flex flex-col gap-3">
        {[...history].reverse().map((h, i) => (
          <li key={i} className="flex gap-3 text-[13px]">
            <span className="font-body text-[#6b7280]">{h.at}</span>
            <span className="font-body text-[#11191f]">{h.note}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function OrderTrackingPage({ order }) {
  const badge = (() => {
    switch (order.status) {
      case "delivered":          return { kind: "delivered",  label: "Delivered" };
      case "cancelled":          return { kind: "cancelled",  label: "Cancelled" };
      case "returned":           return { kind: "returned",   label: "Returned" };
      default:                   return { kind: "on-the-way", label: "On the way" };
    }
  })();

  return (
    <div className="mx-auto flex w-full max-w-[1024px] flex-col gap-6 px-4 py-8 md:px-8">
      {/* Breadcrumb / back */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-1.5 font-body text-[13px] text-[#6b7280] hover:text-[#11191f]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-4">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back to orders
        </Link>
        <OrderStatusBadge kind={badge.kind} label={badge.label} />
      </div>

      {/* Header */}
      <div className="flex flex-col gap-1">
        <p className="font-body text-[12px] font-medium uppercase tracking-[1px] text-[#6b7280]">
          Order #{order.id}
        </p>
        <h1 className="font-display text-[24px] font-bold uppercase tracking-[0.5px] text-[#11191f] md:text-[28px]">
          Track your order
        </h1>
        <p className="font-body text-[13px] text-[#6b7280]">
          Placed on {order.purchaseDate}. Estimated arrival: <strong>{order.estimatedDelivery}</strong>.
        </p>
      </div>

      {/* Pipeline */}
      <section className="rounded-[4px] border border-[#e5e7eb] bg-white p-5 md:p-8">
        <Pipeline order={order} />
      </section>

      {/* Item summary + shipping */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex gap-4 rounded-[4px] border border-[#e5e7eb] bg-white p-4">
          <div className="relative size-24 shrink-0 overflow-hidden bg-[#f5f5f5]">
            <Image
              src={order.image}
              alt={order.productName}
              fill
              sizes="96px"
              className="object-cover"
            />
          </div>
          <div className="flex min-w-0 flex-col justify-center gap-1">
            <p className="font-display text-[14px] font-medium uppercase text-[#11191f]">
              {order.productName}
            </p>
            <p
              className="font-body text-[12px] text-[#6b7280]"
              style={{ fontStretch: "75%" }}
            >
              {order.subtitle} · {order.variant}
            </p>
            <p className="mt-1 font-display text-[14px] font-bold text-[#11191f]">
              {order.currency} {order.price}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 rounded-[4px] border border-[#e5e7eb] bg-white p-4">
          <div>
            <p className="font-body text-[10px] font-medium uppercase tracking-[1px] text-[#6b7280]">
              Shipping address
            </p>
            <p className="mt-1 font-body text-[13px] text-[#11191f]">{order.shippingAddress}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-[#f3f4f6] pt-3">
            <div>
              <p className="font-body text-[10px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                Courier
              </p>
              <p className="mt-1 font-body text-[13px] text-[#11191f]">{order.courier}</p>
            </div>
            <div>
              <p className="font-body text-[10px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                Tracking #
              </p>
              <p className="mt-1 font-body text-[13px] text-[#11191f]">{order.trackingNumber}</p>
            </div>
          </div>
        </div>
      </section>

      <HistoryTimeline history={order.history} />

      {/* CTA row */}
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:justify-end">
        <Link
          href="/contact"
          className="inline-flex h-11 items-center justify-center rounded-[2px] border border-[#11191f] px-5 font-display text-[12px] font-bold uppercase tracking-[1px] text-[#11191f] hover:bg-[#f3f4f6]"
        >
          Inquire
        </Link>
        <Link
          href={`/products/${order.productSlug}`}
          className="inline-flex h-11 items-center justify-center rounded-[2px] bg-[#11191f] px-5 font-display text-[12px] font-bold uppercase tracking-[1px] text-white hover:bg-[#1c2630]"
        >
          Buy Again
        </Link>
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { trackingPipeline, trackingProgress, badgeFor, formatOrderDate, formatJOD } from "@/lib/orders";
import { buildAddressLine } from "@/lib/mockCart";
import OrderStatusBadge from "@/components/customer/account/OrderStatusBadge";
import ReorderResultDrawer from "@/components/customer/account/ReorderResultDrawer";
import { repairCall } from "@/lib/repairAuthedApi";
import { useCommerceSettings } from "@/lib/useCommerceSettings";
import { useRepairStore } from "@/lib/useRepairStore";

const PLACEHOLDER_IMAGE = "/shop/model-1.png";

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

function Pipeline({ status, isPickup = false }) {
  const { stepIndex, terminal } = trackingProgress(status, { isPickup });
  const pipeline = trackingPipeline(isPickup);

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
  if (terminal === "failed_delivery") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-[4px] border border-[#fed7aa] bg-[#fff7ed] p-6 text-center">
        <span className="grid size-10 place-items-center rounded-full bg-[#ea580c] text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
          </svg>
        </span>
        <p className="font-display text-[16px] font-bold uppercase text-[#11191f]">Delivery attempt failed</p>
        <p className="font-body text-[13px] text-[#6b7280]">
          We couldn&apos;t complete delivery. Our team will re-attempt or reach out — contact support if you need help.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Desktop: horizontal step line */}
      <ol className="hidden md:flex md:items-start md:justify-between md:gap-2">
        {pipeline.map((step, i) => {
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
                    backgroundColor: i === pipeline.length - 1 ? "transparent" : i < stepIndex ? "#11191f" : "#e5e7eb",
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
        {pipeline.map((step, i) => {
          const state = i < stepIndex ? "done" : i === stepIndex ? "current" : "todo";
          const isLast = i === pipeline.length - 1;
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
          <li key={h.id ?? i} className="flex gap-3 text-[13px]">
            <span className="shrink-0 font-body text-[#6b7280]">{h.at}</span>
            <span className="font-body text-[#11191f]">{h.note}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TrackingLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[1024px] flex-1 items-center justify-center px-4 py-24">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-[#e5e7eb] border-t-[#11191f]" />
        <p className="font-body text-[14px] text-[#6b7280]" style={{ fontStretch: "75%" }}>
          Loading your order…
        </p>
      </div>
    </div>
  );
}

function TrackingNotFound({ id }) {
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

// Fallback labels for the activity timeline (used only when a history row has
// no backend note). Keyed by raw status. `out_for_delivery` reads as the
// "Dispatched" handover — NOT "out for delivery / on the way" — to match the
// 3-state customer tracker.
const STATUS_NOTE = {
  pending: "Order placed",
  processing: "Order placed — being prepared",
  dispatched: "Order prepared",
  out_for_delivery: "Dispatched to our delivery partner",
  delivered: "Delivered",
  failed_delivery: "Delivery attempt failed",
  cancelled: "Order cancelled",
  returned: "Order returned",
};

export default function OrderTrackingPage({ orderId }) {
  const settings = useCommerceSettings();
  const router = useRouter();

  // Gate on rehydration so the auth token is present before the fetch.
  const [hydrated, setHydrated] = useState(() => useRepairStore.persist.hasHydrated());
  useEffect(() => {
    if (hydrated) return undefined;
    const unsub = useRepairStore.persist.onFinishHydration(() => setHydrated(true));
    if (useRepairStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, [hydrated]);

  const [detail, setDetail] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [reorderError, setReorderError] = useState(null);
  // Out-of-stock items from a reorder → shows ReorderResultDrawer with "Notify
  // me" buttons. { items: [{productVariantId, productName, color, size}], addedCount }.
  const [reorderResult, setReorderResult] = useState(null);

  const numericId = Number(orderId);
  const validId = Number.isFinite(numericId);

  // "Buy again" — re-add this order's items to the cart server-side (capped to
  // current stock). If some items are sold out, surface them with "Notify me";
  // otherwise route straight to /cart. Double-submit-guarded.
  async function handleBuyAgain() {
    if (reordering) return;
    setReordering(true);
    setReorderError(null);
    try {
      const res = await repairCall("myAppReorder", { orderId: numericId }, { isQuery: false });
      const outOfStock = Array.isArray(res?.outOfStock) ? res.outOfStock : [];
      const added = Number(res?.added) || 0;
      if (added > 0) await useRepairStore.getState().syncCart();
      if (outOfStock.length > 0) {
        setReorderResult({ items: outOfStock, addedCount: added });
        return;
      }
      router.push("/cart");
    } catch (e) {
      const msg = String(e?.message || "").replace(/^repairClientApi \S+:\s*/, "");
      setReorderError(msg || "Couldn't add these items. Please try again.");
    } finally {
      setReordering(false);
    }
  }

  useEffect(() => {
    if (!hydrated || !validId) return undefined;
    let active = true;
    // Flip `loaded` only inside the async callback so we never setState
    // synchronously in the effect body (loaded defaults to false / loading).
    repairCall("myAppGetOrderDetail", { orderId: numericId }, { isQuery: true })
      .then((d) => {
        if (active) setDetail(d);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [hydrated, validId, numericId]);

  const order = detail?.order ?? null;

  const items = useMemo(() => {
    const rows = Array.isArray(detail?.items) ? detail.items : [];
    return rows.map((it, i) => ({
      id: it.id ?? i,
      name: it.product_name ?? "Item",
      variantLabel: [it.color_name, it.size_name].filter(Boolean).join(" / "),
      image: it.product_image_url || PLACEHOLDER_IMAGE,
      quantity: Number(it.quantity) || 1,
      lineTotal: Number(it.total) || 0,
    }));
  }, [detail]);

  const history = useMemo(() => {
    const rows = Array.isArray(detail?.history) ? detail.history : [];
    return rows.map((h, i) => ({
      id: h.id ?? i,
      at: h.changed_at ? `${formatOrderDate(h.changed_at)}` : "",
      note: h.note || STATUS_NOTE[h.status] || h.status || "",
    }));
  }, [detail]);

  const shippingAddress = useMemo(() => {
    const snap = order?.shipping_address_snapshot;
    if (!snap) return null;
    return {
      label: snap.label || "Shipping Address",
      line: buildAddressLine(snap),
      phone: snap.phone || "",
    };
  }, [order]);

  const estimatedDelivery = useMemo(() => {
    const rows = Array.isArray(settings?.shippingMethods) ? settings.shippingMethods : [];
    const key = String(order?.shipping_method_key ?? "").toLowerCase();
    return rows.find((m) => String(m.key).toLowerCase() === key)?.eta || "3-5 Business Days";
  }, [settings, order]);

  const paymentMethod = useMemo(() => {
    const rows = Array.isArray(settings?.paymentMethods) ? settings.paymentMethods : [];
    const key = String(order?.payment_method ?? "").toLowerCase();
    return rows.find((m) => String(m.key).toLowerCase() === key)?.name || order?.payment_method || "—";
  }, [settings, order]);

  // Store-pickup orders: no courier leg, no shipping ETA. The tracker shows
  // "Ready for Pickup" + the active pickup location(s) instead of a shipping
  // address + estimated delivery.
  const isPickup = String(order?.shipping_method_key ?? "").toLowerCase() === "pickup";
  const pickupLocations = useMemo(() => {
    const rows = Array.isArray(settings?.pickupLocations) ? settings.pickupLocations : [];
    return rows
      .map((l) => ({ name: l.name, address: l.address, hours: l.hours }))
      .filter((l) => l.name || l.address);
  }, [settings]);

  if (!hydrated) {
    return <TrackingLoading />;
  }
  if (!validId) {
    return <TrackingNotFound id={orderId} />;
  }
  if (!loaded) {
    return <TrackingLoading />;
  }
  if (!order) {
    return <TrackingNotFound id={orderId} />;
  }

  const badge = badgeFor(order.status, { isPickup });
  const total = Number(order.total) || 0;

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
          Order #{order.order_number}
        </p>
        <h1 className="font-display text-[24px] font-bold uppercase tracking-[0.5px] text-[#11191f] md:text-[28px]">
          Track your order
        </h1>
        <p className="font-body text-[13px] text-[#6b7280]">
          {isPickup ? (
            <>Placed on {formatOrderDate(order.created_at ?? order.createdAt)}. We&apos;ll let you know when it&apos;s ready to collect in store.</>
          ) : (
            <>
              Placed on {formatOrderDate(order.created_at ?? order.createdAt)}. Estimated arrival:{" "}
              <strong>{estimatedDelivery}</strong>.
            </>
          )}
        </p>
      </div>

      {/* Pipeline */}
      <section className="rounded-[4px] border border-[#e5e7eb] bg-white p-5 md:p-8">
        <Pipeline status={order.status} isPickup={isPickup} />
      </section>

      {/* Items + shipping/delivery */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Items list */}
        <div className="flex flex-col gap-4 rounded-[4px] border border-[#e5e7eb] bg-white p-4">
          <p className="font-body text-[10px] font-medium uppercase tracking-[1px] text-[#6b7280]">
            Items ({items.length})
          </p>
          <div className="flex flex-col gap-4">
            {items.map((item) => (
              <div key={item.id} className="flex gap-4">
                <div className="relative size-20 shrink-0 overflow-hidden bg-[#f5f5f5]">
                  <Image src={item.image} alt={item.name} fill sizes="80px" className="object-cover" />
                </div>
                <div className="flex min-w-0 flex-col justify-center gap-1">
                  <p className="font-display text-[14px] font-medium uppercase text-[#11191f]">
                    {item.name}
                  </p>
                  <p className="font-body text-[12px] text-[#6b7280]" style={{ fontStretch: "75%" }}>
                    {[item.variantLabel, `Qty ${item.quantity}`].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-1 font-display text-[14px] font-bold text-[#11191f]">
                    {formatJOD(item.lineTotal)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-[#f3f4f6] pt-3">
            <span className="font-display text-[13px] font-medium text-[#4b5563]">Order Total</span>
            <span className="font-display text-[15px] font-bold text-[#11191f]">{formatJOD(total)}</span>
          </div>
        </div>

        {/* Shipping + delivery details — OR pickup location(s) for store pickup */}
        <div className="flex flex-col gap-3 rounded-[4px] border border-[#e5e7eb] bg-white p-4">
          {isPickup ? (
            <div>
              <p className="font-body text-[10px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                Store pickup
              </p>
              {pickupLocations.length ? (
                <div className="mt-1 flex flex-col gap-2">
                  {pickupLocations.map((loc, i) => (
                    <div key={i}>
                      <p className="font-body text-[13px] font-medium text-[#11191f]">{loc.name || "Our store"}</p>
                      {loc.address ? (
                        <p className="font-body text-[13px] text-[#6b7280]">{loc.address}</p>
                      ) : null}
                      {loc.hours ? (
                        <p className="font-body text-[12px] text-[#6b7280]">Hours: {loc.hours}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-1 font-body text-[13px] text-[#6b7280]">
                  Collect in store — we&apos;ll be in touch with the location once your order is ready.
                </p>
              )}
            </div>
          ) : shippingAddress ? (
            <div>
              <p className="font-body text-[10px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                Shipping address
              </p>
              <p className="mt-1 font-body text-[13px] text-[#11191f]">{shippingAddress.line}</p>
              {shippingAddress.phone ? (
                <p className="font-body text-[13px] text-[#6b7280]">{shippingAddress.phone}</p>
              ) : null}
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-2 border-t border-[#f3f4f6] pt-3">
            <div>
              <p className="font-body text-[10px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                {isPickup ? "Fulfilment" : "Estimated delivery"}
              </p>
              <p className="mt-1 font-body text-[13px] text-[#11191f]">
                {isPickup ? "Store pickup" : estimatedDelivery}
              </p>
            </div>
            <div>
              <p className="font-body text-[10px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                Payment
              </p>
              <p className="mt-1 font-body text-[13px] text-[#11191f]">{paymentMethod}</p>
            </div>
          </div>
        </div>
      </section>

      <HistoryTimeline history={history} />

      {/* CTA row */}
      <div className="flex flex-col gap-2">
        {reorderError ? (
          <p className="text-right font-body text-[12px] text-[#b91c1c]" role="alert">
            {reorderError}
          </p>
        ) : null}
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:justify-end">
          <Link
            href="/contact"
            className="inline-flex h-11 items-center justify-center rounded-[2px] border border-[#11191f] px-5 font-display text-[12px] font-bold uppercase tracking-[1px] text-[#11191f] hover:bg-[#f3f4f6]"
          >
            Inquire
          </Link>
          <button
            type="button"
            onClick={handleBuyAgain}
            disabled={reordering}
            className="inline-flex h-11 items-center justify-center rounded-[2px] bg-[#11191f] px-5 font-display text-[12px] font-bold uppercase tracking-[1px] text-white hover:bg-[#1c2630] disabled:opacity-60"
          >
            {reordering ? "Adding…" : "Buy Again"}
          </button>
        </div>
      </div>

      <ReorderResultDrawer
        open={reorderResult != null}
        items={reorderResult?.items ?? []}
        addedCount={reorderResult?.addedCount ?? 0}
        onClose={() => setReorderResult(null)}
        onGoToCart={() => {
          setReorderResult(null);
          router.push("/cart");
        }}
      />
    </div>
  );
}

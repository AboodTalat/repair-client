import Image from "next/image";
import Link from "next/link";
import OrderStatusBadge from "./OrderStatusBadge";
import { badgeFor, isInFlight, formatJOD } from "@/lib/orders";

// (#13) Track Order CTA — primary when the order is still in flight,
// hidden once the order has terminated (delivered/cancelled/returned/failed).
function showTrackCta(status) {
  return isInFlight(status);
}

// Secondary caption under the product name: item count for multi-item orders,
// otherwise the single item's variant (colour / size).
function captionFor(order) {
  if (order.itemCount > 1) return `${order.itemCount} items`;
  return order.variant || "";
}

// Order card — Figma mobile 41:1420 (cards under node 76:2106) +
// desktop 119:4406 (cards 119:4428 onward).
//
// Two variants because the spec differs in more than just sizing:
//   Mobile  — drop shadow only (no border), Zalando Sans Condensed body,
//             56x84 image, h-32 buttons, 12px badge / 10px button text.
//   Desktop — 1px #f3f4f6 border + drop shadow, Zalando Sans Expanded Bold
//             title + price, 96x144 image, h-48 buttons, 12px badge / 14px
//             button text.
// Following the customer/shop/ProductCard split-by-variant pattern instead of
// forcing both into a single responsive tree.

function MobileOrderCard({ order, onBuyAgain, buyAgainBusy = false }) {
  const badge = badgeFor(order.status, {
    isPickup: String(order.shippingMethodKey || "").toLowerCase() === "pickup",
  });
  return (
    <article
      className="flex w-full flex-col gap-4 rounded bg-white p-4"
      style={{ boxShadow: "0 0 5px rgba(0,0,0,0.10)" }}
    >
      {/* Purchase date row */}
      <div className="flex w-full items-center justify-between text-[12px] whitespace-nowrap">
        <span
          className="font-body text-[rgba(17,25,31,0.5)]"
          style={{ fontStretch: "75%", fontWeight: 600 }}
        >
          PURCHASE DATE
        </span>
        <span
          className="font-body text-[#11191f]"
          style={{ fontStretch: "75%", fontWeight: 500 }}
        >
          {order.purchaseDate}
        </span>
      </div>

      <div className="h-px w-full bg-[#e5e7eb]" />

      {/* Product row */}
      <div className="flex w-full items-center gap-2">
        <div
          className="relative h-[84px] w-14 shrink-0 bg-white"
          style={{ boxShadow: "0 0 10px rgba(0,0,0,0.05)" }}
        >
          <Image
            src={order.image}
            alt={order.productName}
            fill
            className="object-cover"
            sizes="56px"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-start justify-center gap-2">
          <div className="flex w-full flex-col gap-1">
            <div className="flex w-full items-center justify-between gap-2">
              <span
                className="truncate font-body text-[14px] text-[#11191f]"
                style={{ fontStretch: "75%", fontWeight: 500 }}
              >
                {order.productName}
              </span>
              <span
                className="font-body text-[14px] text-[#11191f] whitespace-nowrap"
                style={{ fontStretch: "75%", fontWeight: 500 }}
              >
                {formatJOD(order.total)}
              </span>
            </div>
            <span
              className="font-body text-[12px] text-[rgba(17,25,31,0.5)]"
              style={{ fontStretch: "75%", fontWeight: 400 }}
            >
              {captionFor(order)}
            </span>
            <span
              className="font-body text-[12px] leading-4 text-[rgba(17,25,31,0.5)]"
              style={{ fontStretch: "75%", fontWeight: 400 }}
            >
              Order #{order.orderNumber}
            </span>
          </div>
          <OrderStatusBadge kind={badge.kind} label={badge.label} size="sm" />
        </div>
      </div>

      <div className="h-px w-full bg-[#e5e7eb]" />

      {/* CTA row */}
      <div className="flex w-full flex-col gap-2">
        {showTrackCta(order.status) ? (
          <Link
            href={`/account/orders/${order.id}`}
            className="flex h-8 w-full items-center justify-center rounded-[2px] border border-[#11191f] bg-[#11191f] p-2 font-display text-[10px] font-bold text-white uppercase"
          >
            Track Order
          </Link>
        ) : null}
        <div className="flex w-full items-start gap-2">
          <Link
            href="/contact"
            className="flex h-8 flex-1 items-center justify-center rounded-[2px] border border-[#11191f] p-2 font-display text-[10px] font-bold text-[#11191f] uppercase"
          >
            Inquire
          </Link>
          <button
            type="button"
            onClick={() => onBuyAgain?.(order.id)}
            disabled={buyAgainBusy}
            className={
              "flex h-8 flex-1 items-center justify-center rounded-[2px] border border-[#11191f] p-2 font-display text-[10px] font-bold uppercase disabled:opacity-60 " +
              (showTrackCta(order.status)
                ? "text-[#11191f]"
                : "bg-[#11191f] text-white")
            }
          >
            {buyAgainBusy ? "Adding…" : "Buy Again"}
          </button>
        </div>
      </div>
    </article>
  );
}

function DesktopOrderCard({ order, onBuyAgain, buyAgainBusy = false }) {
  const badge = badgeFor(order.status, {
    isPickup: String(order.shippingMethodKey || "").toLowerCase() === "pickup",
  });
  return (
    <article
      className="flex w-full flex-col rounded bg-white p-[25px]"
      style={{
        border: "1px solid #f3f4f6",
        boxShadow: "0 1px 1px rgba(0,0,0,0.05)",
      }}
    >
      {/* Purchase date row */}
      <div className="flex w-full items-center justify-between border-b border-[#e5e7eb] pb-[17px]">
        <span
          className="font-body text-[14px] leading-4 uppercase text-[#6b7280]"
          style={{ fontStretch: "75%", fontWeight: 600, letterSpacing: "0.3px" }}
        >
          Purchase Date
        </span>
        <span
          className="font-body text-[14px] leading-5 text-[#11191f]"
          style={{ fontStretch: "75%", fontWeight: 500 }}
        >
          {order.purchaseDate}
        </span>
      </div>

      {/* Product row */}
      <div className="flex w-full items-start gap-5 pt-6 pb-6">
        <div
          className="relative h-36 w-24 shrink-0 bg-white"
          style={{ boxShadow: "0 0 18.523px rgba(0,0,0,0.05)" }}
        >
          <Image
            src={order.image}
            alt={order.productName}
            fill
            className="object-cover"
            sizes="96px"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between self-stretch">
          <div className="flex w-full flex-col gap-1">
            <div className="flex w-full items-start justify-between gap-2">
              <span className="truncate font-display text-[16px] font-bold leading-7 text-[#11191f]">
                {order.productName}
              </span>
              <span className="font-display text-[16px] font-bold leading-6 text-[#11191f] whitespace-nowrap">
                {formatJOD(order.total)}
              </span>
            </div>
            <span
              className="font-body text-[14px] leading-5 text-[rgba(17,25,31,0.5)]"
              style={{ fontStretch: "75%", fontWeight: 400 }}
            >
              {captionFor(order)}
            </span>
            <span
              className="font-body text-[14px] leading-5 text-[rgba(17,25,31,0.5)]"
              style={{ fontStretch: "75%", fontWeight: 400 }}
            >
              Order #{order.orderNumber}
            </span>
          </div>
          <div className="pt-2">
            <OrderStatusBadge kind={badge.kind} label={badge.label} size="md" />
          </div>
        </div>
      </div>

      {/* CTA row */}
      <div className="flex w-full flex-col gap-3">
        {showTrackCta(order.status) ? (
          <Link
            href={`/account/orders/${order.id}`}
            className="flex h-12 w-full items-center justify-center rounded bg-[#11191f] px-4 py-3 font-display text-[14px] font-bold uppercase text-white"
            style={{ letterSpacing: "0.35px" }}
          >
            Track Order
          </Link>
        ) : null}
        <div className="flex w-full items-center justify-center gap-3">
          <Link
            href="/contact"
            className="flex h-12 flex-1 items-center justify-center rounded border border-[#11191f] px-[17px] py-[13px] font-display text-[14px] font-bold uppercase text-[#11191f]"
            style={{ letterSpacing: "0.35px" }}
          >
            Inquire
          </Link>
          <button
            type="button"
            onClick={() => onBuyAgain?.(order.id)}
            disabled={buyAgainBusy}
            className={
              "flex h-12 flex-1 items-center justify-center rounded px-4 py-3 font-display text-[14px] font-bold uppercase disabled:opacity-60 " +
              (showTrackCta(order.status)
                ? "border border-[#11191f] text-[#11191f]"
                : "bg-[#11191f] text-white")
            }
            style={{ letterSpacing: "0.35px" }}
          >
            {buyAgainBusy ? "Adding…" : "Buy Again"}
          </button>
        </div>
      </div>
    </article>
  );
}

export { MobileOrderCard, DesktopOrderCard };

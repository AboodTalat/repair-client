"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { CART_ITEMS, CHECKOUT_ADDRESSES, formatJOD } from "@/lib/mockCart";
import { condensed } from "./CartPageClient";

// /checkout/success — Order confirmation screen reached after the
// "PAY & CONFIRM ORDER" CTA on /checkout/payment.
// Matches Figma mobile 85:8692 + desktop 119:6418.
//
// Purely presentational. The order number, total, payment-method label,
// and estimated delivery are hardcoded against the seeded cart in
// `mockCart.js` so the numbers line up with /cart and /checkout/payment
// without threading state across pages. Swap to data returned from
// `myAppCheckout` once the mutation is wired through (resolver already
// exists in orders.ts and returns the created order + totals).

const ORDER_NUMBER = "#ORD-2847391";
const ORDER_TOTAL = 127.99; // Figma 85:9100 / 119:6533 — design uses 127.99
const ESTIMATED_DELIVERY = "3-5 Business Days";
const PAYMENT_METHOD = "Visa ending 4242";

const SHIPPING_ADDRESS =
  CHECKOUT_ADDRESSES.find((a) => a.isDefault) ?? CHECKOUT_ADDRESSES[0];

// Coaching CTA — Figma mobile 112:3655 + desktop 128:6022. The model
// photo (the coach "Asaad Hamawi" referenced in the card copy) is
// downloaded from Figma node 128:6031 via get_screenshot — the asset
// URL embedded in get_design_context expires after 7 days, so the PNG
// is saved locally instead. Keep the gradient hex exact; it's what
// reads as "dark teal" against #11191f.
const COACHING_IMAGE = "/cart/coaching-model.png";

// ──────────────────────────────────────────────────────────────────────
// Inline glyphs — same rationale as PaymentPageClient.jsx (avoid the
// 7-day Figma asset URL expiry; keep small SVGs co-located).
// ──────────────────────────────────────────────────────────────────────

function CheckIcon({ size = 70 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M5 12.5l4.5 4.5L19 7.5"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BagIcon({ size = 20 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M3 7h18l-1.5 12.5a2 2 0 0 1-2 1.75H6.5a2 2 0 0 1-2-1.75L3 7Z"
        stroke="#ffffff"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M8 7V5a4 4 0 1 1 8 0v2"
        stroke="#ffffff"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HomeFilledIcon({ size = 20, color = "#ffffff" }) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M17.4 7.61L11.5 2.92a2.39 2.39 0 0 0-3 0L2.6 7.61A2.7 2.7 0 0 0 1.6 9.7v6.74A2.06 2.06 0 0 0 3.66 18.5h2.18a1 1 0 0 0 1-1v-3.95a1.16 1.16 0 0 1 1.16-1.16h3.99a1.16 1.16 0 0 1 1.16 1.16v3.95a1 1 0 0 0 1 1h2.18a2.06 2.06 0 0 0 2.07-2.06V9.7a2.7 2.7 0 0 0-1-2.09Z" />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Success badge — the centerpiece of the page. Mobile is 128px with a
// soft outer gradient/blur ring and a 4px white inner border (Figma
// 85:9101). Desktop is a flat 96px disc with a 4px translucent pulse
// ring (Figma 119:6421). Render both variants from one component so the
// JSX stays close to the Figma node grouping.
// ──────────────────────────────────────────────────────────────────────

function SuccessBadge({ variant }) {
  if (variant === "desktop") {
    return (
      <div className="relative grid size-24 place-items-center rounded-full shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]"
        style={{ backgroundColor: "#11191f" }}
      >
        <CheckIcon size={36} />
        {/* Pulse ring — 4px inner border at 20% opacity, matches Figma 119:6425 */}
        <span
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ border: "4px solid #11191f", opacity: 0.2 }}
        />
      </div>
    );
  }
  // Mobile: 128px circle with layered gradient blurs (Figma 85:9103/9104)
  return (
    <div className="relative size-32">
      <span
        className="pointer-events-none absolute inset-0 rounded-full blur-[20px]"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(25, 33, 38, 0.3) 0%, rgba(25, 33, 38, 0.09) 100%)",
        }}
      />
      <span
        className="pointer-events-none absolute inset-0 rounded-full blur-[12px]"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(26, 33, 38, 0.06) 0%, rgba(26, 33, 38, 0.3) 100%)",
        }}
      />
      <div
        className="relative grid size-32 place-items-center overflow-hidden rounded-full shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)]"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #11191f 0%, rgba(17,25,31,0.8) 100%)",
          border: "4px solid rgba(255,255,255,0.6)",
        }}
      >
        <CheckIcon size={70} />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// "Order Successful!" heading + subtitle block — shared shape across
// breakpoints, just different type sizes (Figma 85:9108 / 119:6426).
// ──────────────────────────────────────────────────────────────────────

function SuccessHeading({ variant }) {
  const desktop = variant === "desktop";
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <h1
        className={
          desktop
            ? "font-display text-[36px] font-extrabold leading-10 tracking-[-0.9px] text-[#11191f]"
            : "font-display text-[24px] font-bold leading-9 text-[#11191f]"
        }
      >
        Order Successful!
      </h1>
      <p
        className={
          desktop
            ? "max-w-[512px] text-center font-display text-[18px] leading-7 text-[#6b7280]"
            : "px-2 text-center font-body text-[16px] leading-[26px] text-[#6b7280]"
        }
        style={desktop ? undefined : condensed}
      >
        Thank you for your purchase! Your order has been confirmed and will be
        delivered soon.
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Coaching CTA card — Figma 112:3655 (mobile) / 128:6022 (desktop).
// Dark teal-tinted gradient, condensed copy, white pill button, and a
// model photo bleeding off the right edge.
// ──────────────────────────────────────────────────────────────────────

function CoachingCard({ variant }) {
  const desktop = variant === "desktop";
  return (
    <div
      className="relative flex w-full items-center justify-between overflow-hidden rounded-[8px] pl-4 pr-2 pt-6 md:pl-8"
      style={{
        backgroundImage:
          "linear-gradient(158deg, #11191f 0%, rgba(17,25,31,0.9) 100%), linear-gradient(180deg, #ffffff 0%, #999999 100%)",
        minHeight: desktop ? 145 : undefined,
      }}
    >
      <div className="flex min-w-0 flex-1 flex-col items-start gap-3 pb-6">
        <div className="flex flex-col gap-1">
          <p
            className={
              desktop
                ? "font-display text-[14px] font-black uppercase leading-normal text-white"
                : "font-display text-[11px] font-black uppercase leading-normal text-white"
            }
          >
            You&apos;ve taken the first step!
          </p>
          <p
            className="font-body text-[12px] leading-normal"
            style={{ ...condensed, color: "rgba(255,255,255,0.7)" }}
          >
            Let&apos;s build the routine that gets results
            <br />
            with Asaad Hamawi!
          </p>
        </div>
        <button
          type="button"
          className={
            desktop
              ? "flex items-center justify-center rounded-[4px] bg-white px-4 py-3"
              : "flex h-6 items-center justify-center rounded-[4px] bg-white px-4"
          }
        >
          <span
            className={
              desktop
                ? "font-display text-[11px] font-black leading-5 text-[#11191f]"
                : "font-display text-[9px] font-black leading-5 text-[#11191f]"
            }
          >
            APPLY FOR COACHING
          </span>
        </button>
      </div>
      <div
        className="relative shrink-0"
        style={{
          width: desktop ? 180 : 106,
          height: desktop ? 204 : 120,
        }}
      >
        <Image
          src={COACHING_IMAGE}
          alt=""
          fill
          sizes={desktop ? "180px" : "106px"}
          className="object-cover object-bottom"
        />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Mobile Order Info card — Figma 85:9079. White card with shadow, holds
// Order Number + bag icon tile on the top row, then estimated delivery
// + total amount as label/value rows below.
// ──────────────────────────────────────────────────────────────────────

function MobileOrderInfoCard() {
  return (
    <div
      className="mx-4 flex flex-col gap-3 overflow-hidden rounded-[4px] bg-white p-4"
      style={{ boxShadow: "0 0 10px 0 rgba(0,0,0,0.15)" }}
    >
      <div className="flex w-full items-center justify-between border-b border-[#e5e7eb] pb-4">
        <div className="flex flex-col gap-1">
          <p
            className="font-body text-[12px] font-medium leading-4 text-[#6b7280]"
            style={condensed}
          >
            Order Number
          </p>
          <p className="font-display text-[18px] font-bold leading-7 text-[#11191f]">
            {ORDER_NUMBER}
          </p>
        </div>
        <div
          className="grid size-12 shrink-0 place-items-center rounded-[4px]"
          style={{ backgroundColor: "#11191f" }}
        >
          <BagIcon size={20} />
        </div>
      </div>
      <div className="flex w-full flex-col gap-2">
        <div className="flex w-full items-center justify-between">
          <span
            className="font-body text-[14px] font-medium leading-5 text-[#6b7280]"
            style={condensed}
          >
            Estimated Delivery
          </span>
          <span className="font-display text-[12px] font-bold leading-5 text-[#11191f]">
            {ESTIMATED_DELIVERY}
          </span>
        </div>
        <div className="flex w-full items-center justify-between">
          <span
            className="font-body text-[14px] font-medium leading-5 text-[#6b7280]"
            style={condensed}
          >
            Total Amount
          </span>
          <span className="font-display text-[14px] font-bold leading-7 text-[#11191f]">
            {formatJOD(ORDER_TOTAL)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Items list — both variants share the data; only the row chrome
// differs. Mobile (Figma 85:9024) uses 84x126 thumbs + condensed
// captions; desktop (Figma 119:6450) uses a #f9fafb pill with 96x128
// thumb + larger Expanded type.
// ──────────────────────────────────────────────────────────────────────

function MobileItemsSection({ items }) {
  return (
    <section className="flex w-full flex-col gap-6 p-4">
      <h2 className="font-display text-[16px] font-semibold leading-6 text-[#11191f]">
        Your Items ({items.length})
      </h2>
      <div className="flex w-full flex-col gap-6">
        {items.map((item) => (
          <div key={item.id} className="flex w-full items-start gap-3">
            <div
              className="relative h-[126px] w-[84px] shrink-0 overflow-hidden"
              style={{ boxShadow: "0 0 10px 0 rgba(0,0,0,0.05)" }}
            >
              <Image
                src={item.image}
                alt={item.name}
                fill
                sizes="84px"
                className="object-cover"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-between self-stretch py-1">
              <div className="flex flex-col gap-1">
                <p className="font-display text-[14px] font-semibold leading-[17.5px] text-[#11191f]">
                  {item.name}
                </p>
                <p
                  className="font-body text-[12px] leading-4 text-[#6b7280]"
                  style={condensed}
                >
                  {item.variantLabel}
                </p>
              </div>
              <p className="font-display text-[14px] font-bold leading-5 text-[#11191f]">
                {formatJOD(item.price * item.qty)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DesktopItemsSection({ items }) {
  return (
    <section className="flex w-full flex-col gap-6">
      <div className="flex w-full items-center gap-2">
        <h2 className="font-display text-[20px] font-bold leading-7 tracking-[-0.5px] text-[#11191f]">
          Your Items
        </h2>
        <span className="font-display text-[16px] leading-6 tracking-[-0.5px] text-[#9ca3af]">
          ({items.length})
        </span>
      </div>
      <div className="flex w-full flex-col gap-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex w-full items-start gap-6 rounded-[8px] border p-4"
            style={{ backgroundColor: "#f9fafb", borderColor: "#f3f4f6" }}
          >
            <div
              className="relative h-32 w-24 shrink-0 overflow-hidden rounded-[4px]"
              style={{ backgroundColor: "#e5e7eb" }}
            >
              <Image
                src={item.image}
                alt={item.name}
                fill
                sizes="96px"
                className="object-cover"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center self-stretch">
              <p className="font-display text-[18px] font-bold leading-7 text-[#11191f]">
                {item.name}
              </p>
              <p className="pt-1 font-display text-[14px] leading-5 text-[#6b7280]">
                {item.variantLabel}
              </p>
              <p className="pt-3 font-display text-[16px] font-bold leading-6 text-[#11191f]">
                {formatJOD(item.price * item.qty)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Shipping Address — read-only display card. Mobile (Figma 85:9063)
// uses the same #f0f0f0 home-icon tile pattern as PaymentPageClient's
// ShippingAddressDisplay; desktop (Figma 119:6487) is a wider card with
// a dark filled circular icon and a "Default" chip beside the label.
// ──────────────────────────────────────────────────────────────────────

function MobileShippingAddressSection({ address }) {
  if (!address) return null;
  return (
    <section className="flex w-full flex-col gap-4 p-4">
      <h2 className="font-display text-[16px] font-semibold leading-6 text-[#11191f]">
        Shipping Address
      </h2>
      <div
        className="flex w-full flex-col gap-2 rounded-[4px] bg-white p-4"
        style={{ filter: "drop-shadow(0 0 5px rgba(0,0,0,0.15))" }}
      >
        <div className="flex w-full items-center gap-3">
          <div className="relative inline-grid place-items-start">
            <div
              className="col-start-1 row-start-1 size-8 rounded-[4px]"
              style={{ backgroundColor: "#f0f0f0" }}
            />
            <div className="col-start-1 row-start-1 ml-[6px] mt-[6px] text-[#11191f]">
              <HomeFilledIcon size={20} color="#11191f" />
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <p
              className="font-body text-[12px] font-medium leading-normal text-[#11191f]"
              style={condensed}
            >
              {address.label}{" "}
              {address.isDefault ? (
                <span
                  className="text-[10px] font-normal"
                  style={{ ...condensed, color: "rgba(17,25,31,0.3)" }}
                >
                  (Default)
                </span>
              ) : null}
            </p>
          </div>
        </div>
        <div
          className="flex w-full flex-col gap-1 font-body text-[10px] leading-normal"
          style={{ ...condensed, color: "rgba(17,25,31,0.5)" }}
        >
          <p>{address.line}</p>
          <p>{address.phone}</p>
        </div>
      </div>
    </section>
  );
}

function DesktopShippingAddressSection({ address }) {
  if (!address) return null;
  return (
    <section className="flex w-full flex-col gap-6">
      <h2 className="font-display text-[20px] font-bold leading-7 tracking-[-0.5px] text-[#11191f]">
        Shipping Address
      </h2>
      <div
        className="flex w-full items-start gap-5 rounded-[8px] border bg-white p-6"
        style={{
          borderColor: "#e5e7eb",
          filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.05))",
        }}
      >
        <div
          className="grid size-12 shrink-0 place-items-center rounded-full shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)]"
          style={{ backgroundColor: "#11191f" }}
        >
          <HomeFilledIcon size={20} color="#ffffff" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-3">
            <p className="font-display text-[18px] font-bold leading-7 text-[#11191f]">
              {address.label}
            </p>
            {address.isDefault ? (
              <span
                className="rounded-full border px-[9px] py-[3px] font-display text-[12px] leading-4 text-[#9ca3af]"
                style={{ backgroundColor: "#f3f4f6", borderColor: "#e5e7eb" }}
              >
                Default
              </span>
            ) : null}
          </div>
          <div className="font-display text-[14px] leading-[22.75px] text-[#4b5563]">
            <p>{address.line}</p>
            <p>{address.phone}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Desktop right-column composite — order number + meta rows + bordered
// total row + stacked CONTINUE SHOPPING (filled) and TRACK ORDER
// (outlined) buttons. Figma 119:6504.
// ──────────────────────────────────────────────────────────────────────

function DesktopOrderInfoCard({ onContinueShopping, onTrackOrder }) {
  return (
    <div
      className="flex w-full flex-col gap-8 overflow-hidden rounded-[12px] border bg-white p-8"
      style={{
        borderColor: "#e5e7eb",
        boxShadow:
          "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
      }}
    >
      <div className="flex w-full items-start justify-between border-b border-[#f3f4f6] pb-8">
        <div className="flex flex-col gap-1">
          <p className="font-display text-[12px] uppercase leading-4 tracking-[0.6px] text-[#6b7280]">
            Order Number
          </p>
          <p className="font-display text-[24px] font-bold leading-8 tracking-[-0.6px] text-[#11191f]">
            {ORDER_NUMBER}
          </p>
        </div>
        <div
          className="grid size-12 shrink-0 place-items-center rounded-[8px] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)]"
          style={{ backgroundColor: "#11191f" }}
        >
          <BagIcon size={22} />
        </div>
      </div>

      <div className="flex w-full flex-col gap-6">
        <DesktopMetaRow label="Estimated Delivery" value={ESTIMATED_DELIVERY} />
        <DesktopMetaRow label="Payment Method" value={PAYMENT_METHOD} valueMedium />
        <div className="flex w-full items-center justify-between border-t border-[#f3f4f6] pt-6">
          <span className="font-display text-[14px] leading-7 text-[#4b5563]">
            Total Amount
          </span>
          <span className="font-display text-[14px] font-bold leading-8 text-[#11191f]">
            {formatJOD(ORDER_TOTAL)}
          </span>
        </div>
      </div>

      <div className="flex w-full flex-col gap-4 border-t border-[#f3f4f6] pt-8">
        <button
          type="button"
          onClick={onContinueShopping}
          className="flex h-14 w-full items-center justify-center rounded-[2px] text-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)]"
          style={{ backgroundColor: "#11191f" }}
        >
          <span className="font-display text-[14px] font-bold uppercase leading-6 tracking-[0.8px]">
            Continue Shopping
          </span>
        </button>
        <button
          type="button"
          onClick={onTrackOrder}
          className="flex h-14 w-full items-center justify-center rounded-[2px] border bg-white"
          style={{ borderColor: "#11191f" }}
        >
          <span className="font-display text-[14px] font-bold uppercase leading-6 tracking-[0.8px] text-[#11191f]">
            Track Order
          </span>
        </button>
      </div>
    </div>
  );
}

function DesktopMetaRow({ label, value, valueMedium }) {
  return (
    <div className="flex w-full items-center justify-between">
      <span className="font-display text-[14px] leading-5 text-[#4b5563]">
        {label}
      </span>
      <span
        className={`font-display text-[14px] leading-6 text-[#11191f] ${
          valueMedium ? "font-medium" : "font-bold"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

// Desktop help box — Figma 119:6539. Light grey card with two centered
// lines: question copy + bold "Contact Support Team" link.
function DesktopHelpBox() {
  return (
    <div
      className="flex w-full flex-col items-center gap-3 rounded-[8px] border p-6 text-center"
      style={{ backgroundColor: "#f9fafb", borderColor: "#e5e7eb" }}
    >
      <p className="font-display text-[14px] leading-5 text-[#6b7280]">
        Have a question about your order?
      </p>
      <a
        href="/contact"
        className="font-display text-[14px] font-bold leading-5 text-[#11191f] hover:underline"
      >
        Contact Support Team
      </a>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Main client component.
// ──────────────────────────────────────────────────────────────────────

export default function OrderSuccessClient() {
  const router = useRouter();
  const items = CART_ITEMS;

  const handleContinueShopping = () => router.push("/shop");
  const handleTrackOrder = () => router.push("/account/orders");

  return (
    <main className="flex flex-1 flex-col bg-white">
      {/* ============== MOBILE LAYOUT ============== */}
      <div className="flex flex-col md:hidden">
        <div className="flex w-full flex-col items-center gap-6 px-4 pt-8">
          <SuccessBadge variant="mobile" />
          <SuccessHeading variant="mobile" />
        </div>

        <div className="px-4 pt-8">
          <CoachingCard variant="mobile" />
        </div>

        <div className="px-4 pt-6">
          <button
            type="button"
            onClick={handleContinueShopping}
            className="flex h-14 w-full items-center justify-center rounded-[4px] text-white"
            style={{ backgroundColor: "#11191f" }}
          >
            <span className="font-display text-[12px] font-bold leading-5 text-white">
              CONTINUE SHOPPING
            </span>
          </button>
        </div>

        <div className="pt-6">
          <MobileOrderInfoCard />
        </div>

        <MobileItemsSection items={items} />

        <MobileShippingAddressSection address={SHIPPING_ADDRESS} />

        {/* Trailing breathing room before the footer (hidden on mobile) */}
        <div className="h-12" />
      </div>

      {/* ============== DESKTOP LAYOUT ============== */}
      <div className="mx-auto hidden w-full max-w-[1440px] flex-col gap-16 px-8 pb-20 pt-16 md:flex">
        <div className="flex w-full flex-col items-center gap-8">
          <SuccessBadge variant="desktop" />
          <SuccessHeading variant="desktop" />
        </div>

        <div className="flex w-full flex-col items-stretch gap-12 lg:flex-row lg:items-start lg:justify-center">
          {/* Left column: coaching CTA + items + shipping address */}
          <div
            className="flex w-full min-w-0 flex-col gap-10 lg:flex-1"
            style={{ maxWidth: "577.33px" }}
          >
            <CoachingCard variant="desktop" />
            <DesktopItemsSection items={items} />
            <DesktopShippingAddressSection address={SHIPPING_ADDRESS} />
          </div>

          {/* Right column: order info card + help box */}
          <aside className="flex w-full flex-col gap-8 lg:w-[398.66px] lg:shrink-0">
            <DesktopOrderInfoCard
              onContinueShopping={handleContinueShopping}
              onTrackOrder={handleTrackOrder}
            />
            <DesktopHelpBox />
          </aside>
        </div>
      </div>
    </main>
  );
}

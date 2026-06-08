import Image from "next/image";
import Link from "next/link";

// Wishlist card — Figma mobile 41:1613 (cards under node 77:2248) +
// desktop 119:4743 (cards 126:3671 / 126:3697 / 119:4809 / 126:3723).
//
// Two variants, same shape as customer/account/OrderCard:
//   Mobile  — drop shadow only (no border), Zalando Sans Condensed body,
//             56x84 image, 4 small 12x12 swatches, 32x32 heart button,
//             h-32 buttons, 10px CTA text.
//   Desktop — 1px #f9fafb border + drop shadow, Zalando Sans Expanded Bold
//             title/price, 96x144 image, 3 large 24x24 swatches, 36x36 heart
//             button, h-48 buttons, 11px CTA text (tracking 0.55px).
//
// Heart icon is inlined SVG — the Figma asset URLs expire after 7 days, so
// every icon on the customer surface that isn't already in /public/shop must
// inline (same convention as OrderStatusBadge / product detail icons).

function HeartIcon({ size = 14, color = "#11191f", filled = true }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? color : "none"}
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 21s-7.5-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2 4.5-9.5 9-9.5 9z" />
    </svg>
  );
}

function MobileWishlistCard({ item, onRemove }) {
  return (
    <article
      className="flex w-full flex-col gap-4 rounded bg-white p-4"
      style={{ boxShadow: "0 0 5px rgba(0,0,0,0.10)" }}
    >
      {/* Product row */}
      <div className="flex w-full items-start gap-2">
        <div
          className="relative h-[84px] w-14 shrink-0 bg-white"
          style={{ boxShadow: "0 0 10px rgba(0,0,0,0.05)" }}
        >
          <Image
            src={item.image}
            alt={item.productName}
            fill
            className="object-cover"
            sizes="56px"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2 self-stretch justify-center">
          <div className="flex flex-col gap-1">
            <span
              className="font-body text-[14px] text-[#11191f]"
              style={{ fontStretch: "75%", fontWeight: 500 }}
            >
              {item.productName}
            </span>
            <span
              className="font-body text-[14px] text-[#11191f]"
              style={{ fontStretch: "75%", fontWeight: 500 }}
            >
              {item.currency} {item.price}
            </span>
          </div>
          <span
            className="font-body text-[12px] text-[rgba(17,25,31,0.5)]"
            style={{ fontStretch: "75%", fontWeight: 400 }}
          >
            {item.subtitle}
          </span>
          <div className="flex items-center gap-[3px]">
            {item.colors.map((hex, i) => (
              <span
                key={`${item.id}-c-${i}`}
                className="block size-3 rounded-[3px]"
                style={{
                  backgroundColor: hex,
                  border: "0.75px solid rgba(17,25,31,0.10)",
                }}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${item.productName} from wishlist`}
          className="grid size-8 shrink-0 place-items-center rounded-[2.667px] bg-white/80 backdrop-blur-[2px] transition-opacity hover:opacity-80"
          style={{ border: "0.7px solid #11191f" }}
        >
          <HeartIcon size={14} color="#11191f" />
        </button>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-[#e5e7eb]" />

      {/* CTA row */}
      <div className="flex w-full items-start gap-2">
        <Link
          href={`/products/${item.productSlug ?? ""}`}
          className="flex h-8 flex-1 items-center justify-center rounded-[2px] border border-[#11191f] p-2 font-display text-[10px] font-bold uppercase text-[#11191f]"
        >
          Add to Cart
        </Link>
        <Link
          href={`/products/${item.productSlug ?? ""}`}
          className="flex h-8 flex-1 items-center justify-center rounded-[2px] border border-[#11191f] bg-[#11191f] p-2 font-display text-[10px] font-bold uppercase text-white"
        >
          Buy Now
        </Link>
      </div>
    </article>
  );
}

function DesktopWishlistCard({ item, onRemove }) {
  return (
    <article
      className="flex w-full flex-col gap-5 rounded bg-white p-[21px]"
      style={{
        border: "1px solid #f9fafb",
        boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
      }}
    >
      {/* Product row */}
      <div className="flex w-full items-start gap-5">
        <div
          className="relative h-36 w-24 shrink-0 bg-white"
          style={{ boxShadow: "0 0 18.523px rgba(0,0,0,0.05)" }}
        >
          <Image
            src={item.image}
            alt={item.productName}
            fill
            className="object-cover"
            sizes="96px"
          />
        </div>

        <div className="flex min-w-0 flex-1 items-start justify-between self-stretch">
          <div className="flex flex-col gap-1">
            <h3 className="font-display text-[16px] leading-6 font-bold text-[#11191f]">
              {item.productName}
            </h3>
            <span className="font-display text-[14px] leading-5 font-bold text-[#11191f]">
              {item.currency} {item.price}
            </span>
            <span className="font-body text-[12px] leading-4 text-[#9ca3af]">
              {item.subtitle}
            </span>
            <div className="flex items-start gap-[6px] pt-2">
              {item.colors.map((hex, i) => (
                <span
                  key={`${item.id}-c-${i}`}
                  className="block size-6 rounded-[3.429px]"
                  style={{
                    backgroundColor: hex,
                    border: "1.714px solid #e5e7eb",
                  }}
                  aria-hidden="true"
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${item.productName} from wishlist`}
            className="grid size-9 shrink-0 place-items-center rounded p-px transition-opacity hover:opacity-80"
            style={{ border: "1px solid #e5e7eb" }}
          >
            <HeartIcon size={14} color="#11191f" />
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-[#f3f4f6]" />

      {/* CTA row */}
      <div className="flex w-full items-start justify-center gap-3 pt-[1px]">
        <Link
          href={`/products/${item.productSlug ?? ""}`}
          className="flex flex-1 items-center justify-center rounded border border-[#11191f] px-[9px] py-[13px] font-display text-[11px] leading-[16.5px] font-bold uppercase text-[#11191f]"
          style={{ letterSpacing: "0.55px" }}
        >
          Add to Cart
        </Link>
        <Link
          href={`/products/${item.productSlug ?? ""}`}
          className="flex flex-1 items-center justify-center rounded bg-[#11191f] px-2 pt-[12.5px] pb-[13px] font-display text-[11px] leading-[16.5px] font-bold uppercase text-white"
          style={{ letterSpacing: "0.55px" }}
        >
          Buy Now
        </Link>
      </div>
    </article>
  );
}

export { MobileWishlistCard, DesktopWishlistCard };

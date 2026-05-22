import Image from "next/image";
import ProductCard from "./ProductCard";

// "MORE PRODUCTS ARE COMING SOON. STAY TUNED." state from Figma 198:5080.
// Renders the full catalog grid (up to 8 cards) heavily blurred + desaturated
// so the blur covers the whole content area between header and footer on
// both breakpoints — on mobile, 8 cards in 2 cols = 4 rows = taller than the
// viewport, so the centered overlay uses sticky positioning to stay in the
// vertical middle of the viewport as the user scrolls through the blurred
// area. Triggered by ShopPageClient when the major category is missing, the
// sub-category is missing, or the sub-category is marked inactive — see
// shop/page.js for the routing logic.
//
// Desktop spec (Figma 198:5080):
//   - Product images: mix-blend-luminosity (we use `grayscale` + blur + opacity)
//   - Centered overlay: 104x104 timer icon + 28px Zalando Sans Expanded
//     Medium text on a single line, gap 16 between them.

export default function ComingSoonOverlay({ products }) {
  return (
    <div className="relative w-full">
      {/* Background grids — desaturated + blurred + faded.
          Both breakpoints show all (up to 8) cards so the blur fills the
          content area from header to footer on either screen. */}
      <div
        aria-hidden
        className="pointer-events-none"
        style={{
          filter: "grayscale(1) blur(8px) brightness(1.05) opacity(0.6)",
        }}
      >
        {/* Mobile: 2 cols × 4 rows */}
        <div className="grid w-full grid-cols-2 gap-x-2 gap-y-4 md:hidden">
          {products.map((p) => (
            <ProductCard key={`m-${p.id}`} product={p} compact />
          ))}
        </div>
        {/* Desktop: 4 cols × 2 rows */}
        <div className="hidden w-full grid-cols-4 gap-6 md:grid">
          {products.map((p) => (
            <ProductCard key={`d-${p.id}`} product={p} />
          ))}
        </div>
      </div>

      {/* Centered overlay — absolute layer over the blurred grid, with an
          inner sticky wrapper so the icon+text stay in the vertical middle
          of the viewport while the user scrolls through the (potentially
          taller-than-viewport) mobile grid. `top-1/2 -translate-y-1/2`
          inside `h-full` makes it center to whichever ancestor is in view. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center px-4">
        <div
          className="sticky top-1/2 flex -translate-y-1/2 flex-col items-center"
          style={{ gap: 16 }}
        >
          <div className="relative size-16 md:size-[104px]">
            <Image src="/shop/icon-timer.svg" alt="" fill className="object-contain" />
          </div>
          <p
            className="text-center font-display font-medium text-[#11191f] text-[14px] md:text-[28px] md:whitespace-nowrap"
            style={{ lineHeight: "normal", letterSpacing: "0.01em" }}
          >
            MORE PRODUCTS ARE COMING SOON. STAY TUNED.
          </p>
        </div>
      </div>
    </div>
  );
}

import ProductCard from "./ProductCard";

// Mobile: 2 columns @ 8px gap (matches 176x264 cards from Figma).
// Desktop: 4 columns @ 24px gap (matches 326x489 cards).
// Each card decides its own internal mobile/desktop layout via the
// `compact` prop wrapped in tailwind responsive utilities.

export default function ProductGrid({ products, onQuickAdd }) {
  return (
    <>
      {/* Mobile grid — 8px column gap, 16px row gap to match Figma 2:12. */}
      <div className="grid w-full grid-cols-2 gap-x-2 gap-y-4 md:hidden">
        {products.map((p) => (
          <ProductCard key={`m-${p.id}`} product={p} onQuickAdd={onQuickAdd} compact />
        ))}
      </div>

      {/* Desktop grid — Figma 119:3858 uses gap-6 in both directions (24px). */}
      <div className="hidden w-full grid-cols-4 gap-6 md:grid">
        {products.map((p) => (
          <ProductCard key={`d-${p.id}`} product={p} onQuickAdd={onQuickAdd} />
        ))}
      </div>
    </>
  );
}

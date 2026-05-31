import Image from "next/image";
import Link from "next/link";

// Bare /shop landing — user must pick a major category to see products.
// The route map in CLAUDE.md only lists category-scoped views; this fills
// the gap when no ?category= param is set.
//
// `categories` is the live tree from the `repair` sub-server, shaped by
// `fetchShopCategories` (slug / name / tagline / image / active). Rendered in
// tree order — the resolver already sorts by sort_order.
//
// - No categories at all (empty/unreachable backend) → the "coming soon"
//   screen (no hardcoded fallback tiles).
// - Inactive categories (active === false) still render as tiles but carry a
//   "COMING SOON" badge and route to the coming-soon overlay when opened.

export default function CategoryPicker({ categories = [] }) {
  // Empty tree → coming-soon screen (matches ComingSoonOverlay text + icon).
  if (!categories || categories.length === 0) {
    return (
      <section className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <div className="relative size-16 md:size-[104px]">
          <Image src="/shop/icon-timer.svg" alt="" fill className="object-contain" />
        </div>
        <p
          className="font-display font-medium text-[#11191f] text-[14px] md:text-[28px]"
          style={{ lineHeight: "normal", letterSpacing: "0.01em" }}
        >
          MORE PRODUCTS ARE COMING SOON. STAY TUNED.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-12 md:px-8 md:py-16">
      <header className="flex flex-col gap-3">
        <p className="font-display text-[12px] uppercase tracking-[0.25em] text-[rgba(17,25,31,0.5)]">
          Shop
        </p>
        <h1 className="font-display text-[28px] font-medium leading-tight text-[#11191f] md:text-[40px]">
          Pick a category to begin
        </h1>
        <p className="max-w-2xl font-body text-[14px] leading-6 text-[#666] md:text-[16px]" style={{ fontStretch: "75%" }}>
          We sort the catalog by major category so you can find your fit faster. Choose where to
          start.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
        {categories.map((cat) => {
          const inactive = cat.active === false;
          return (
            <Link
              key={cat.slug}
              href={`/shop?category=${cat.slug}`}
              className="group relative flex aspect-[3/4] flex-col justify-end overflow-hidden bg-[#f5f5f5]"
            >
              <Image
                src={cat.image}
                alt={cat.name}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className={`object-cover transition-transform duration-500 group-hover:scale-[1.03] ${
                  inactive ? "grayscale" : ""
                }`}
              />
              {inactive && (
                // Conditional element — inline backgroundColor, since Tailwind v4
                // + Turbopack can drop arbitrary bg classes on these.
                <span
                  className="absolute left-3 top-3 z-10 font-display text-[9px] font-medium uppercase tracking-[0.12em] text-white md:left-4 md:top-4 md:text-[11px]"
                  style={{
                    backgroundColor: "rgba(17,25,31,0.78)",
                    padding: "4px 8px",
                    borderRadius: 2,
                    backdropFilter: "blur(4px)",
                    WebkitBackdropFilter: "blur(4px)",
                  }}
                >
                  Coming Soon
                </span>
              )}
              <div className="relative z-10 flex flex-col gap-1 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-4 md:p-6">
                <h2 className="font-display text-[18px] font-medium uppercase tracking-wide text-white md:text-[22px]">
                  {cat.name}
                </h2>
                <p className="font-body text-[12px] text-white/80 md:text-[14px]" style={{ fontStretch: "75%" }}>
                  {cat.tagline}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

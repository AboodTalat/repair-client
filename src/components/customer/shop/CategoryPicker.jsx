import Image from "next/image";
import Link from "next/link";
import { MAJOR_CATEGORIES } from "@/lib/mockShop";

// Bare /shop landing — user must pick a major category to see products.
// The route map in CLAUDE.md only lists category-scoped views; this fills
// the gap when no ?category= param is set.

export default function CategoryPicker() {
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
        {MAJOR_CATEGORIES.map((cat) => (
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
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <div className="relative z-10 flex flex-col gap-1 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-4 md:p-6">
              <h2 className="font-display text-[18px] font-medium uppercase tracking-wide text-white md:text-[22px]">
                {cat.name}
              </h2>
              <p className="font-body text-[12px] text-white/80 md:text-[14px]" style={{ fontStretch: "75%" }}>
                {cat.tagline}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

import Image from "next/image";
import Link from "next/link";
import { BROWSE_TILES_DEFAULT } from "@/lib/storefrontDefaults";

const SWATCHES = ["#ede9dd", "#232323", "#12013f", "#3e0000"];

// Shown when a browse tile has no image set in the CMS.
const FALLBACK_IMAGE = "/home/card-1.png";

function ProductCard({ product }) {
  const href = product.href || "/shop";
  const image = product.image || FALLBACK_IMAGE;
  return (
    <div className="flex w-[176px] shrink-0 snap-start flex-col gap-2 md:w-auto md:gap-3">
      <div className="relative h-[264px] w-full shadow-[0_0_10px_0_rgba(0,0,0,0.05)] md:aspect-[3/4] md:h-auto">
        <Link
          href={href}
          aria-label={`View ${product.name}`}
          className="absolute inset-0"
        >
          <Image
            src={image}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 280px, (min-width: 768px) 33vw, 176px"
            className="object-cover"
          />
        </Link>
        <Link
          href="/cart"
          aria-label={`Add ${product.name} to bag`}
          className="absolute bottom-2 right-2 grid size-6 place-items-center rounded-sm border border-white/70 bg-white/30 backdrop-blur-[1.5px] md:bottom-3 md:right-3 md:size-8"
        >
          <Image src="/home/icon-add.svg" alt="" width={24} height={24} />
        </Link>
        <div className="absolute bottom-2 left-2 flex gap-[2px] md:bottom-3 md:left-3 md:gap-1">
          {SWATCHES.map((c) => (
            <span
              key={c}
              className="block size-2 rounded-[2px] border border-[#11191f]/10 md:size-3"
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
      <div className="flex items-start justify-between px-1 text-white/90 md:px-0">
        <div className="flex flex-col gap-[2px]">
          <p
            className="font-body text-[12px] font-medium md:text-[15px]"
            style={{ fontStretch: "75%" }}
          >
            {product.name}
          </p>
          <p
            className="font-body text-[10px] md:text-[13px] md:text-white/50"
            style={{ fontStretch: "75%" }}
          >
            {product.subtitle}
          </p>
        </div>
        <p
          className="font-body text-[12px] font-semibold md:text-[15px]"
          style={{ fontStretch: "75%" }}
        >
          {product.price}
        </p>
      </div>
    </div>
  );
}

export default function BrowseCollection({ tiles } = {}) {
  // CMS overlay — admin-editable tiles (title / subtitle / price / image / href).
  // Falls back to the current 4 cards so an empty CMS renders identically.
  const items =
    Array.isArray(tiles) && tiles.length
      ? tiles.map((t) => ({
          name: t.title,
          subtitle: t.subtitle,
          price: t.price,
          image: t.image,
          href: t.href,
        }))
      : BROWSE_TILES_DEFAULT.map((t) => ({
          name: t.title,
          subtitle: t.subtitle,
          price: t.price,
          image: t.image,
          href: t.href,
        }));
  return (
    <section className="mx-auto w-full max-w-[1280px] bg-black px-4 pb-12 pt-8 md:px-10 md:pb-20 md:pt-20 lg:px-16">
      <div className="flex items-end justify-between gap-4">
        <h2 className="font-display text-[20px] font-bold leading-7 text-white/90 md:text-[40px] md:leading-[1.1] lg:text-[48px]">
          Browse Collection
        </h2>
        <Link
          href="/shop"
          className="hidden font-body text-[14px] uppercase tracking-[0.2em] text-white/70 underline-offset-4 hover:text-white hover:underline md:inline-flex"
          style={{ fontStretch: "75%" }}
        >
          View all
        </Link>
      </div>
      <div className="mt-4 -mr-4 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 pr-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mr-0 md:mt-10 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:pr-0 lg:grid-cols-4 lg:gap-8">
        {items.map((p, i) => (
          <ProductCard key={i} product={p} />
        ))}
      </div>
    </section>
  );
}

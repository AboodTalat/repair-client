import Image from "next/image";

// Filter-empty state (Figma 126:4397 desktop / 126:4397 mobile equivalent).
// Renders by ShopPageClient when listProducts() returns 0 — covers both
// "filter combo yields no matches" and any other zero-results case.
//
// Layout: flex-col, items-center + justify-center, flex-1 (fills remaining
// vertical space below FilterBar so the icon+text sit visually centered in
// the products area). gap-6 (24px) between icon and text on desktop.
// Icon: vuesax/linear/filter-remove (88×88 desktop, scaled down on mobile).
// Text: Zalando Sans Expanded Medium 22px #11191F, two lines via <br/>:
//   "NO PRODUCTS WERE FOUND" / "TRY REMOVING A FILTER."
export default function EmptyState() {
  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-4 py-12 md:gap-6 md:py-0">
      <div className="relative size-12 md:size-[88px]">
        <Image src="/shop/icon-filter-remove.svg" alt="" fill className="object-contain" />
      </div>
      <p className="text-center font-display text-sm font-medium leading-normal text-[#11191f] md:text-[22px]">
        NO PRODUCTS WERE FOUND
        <br />
        TRY REMOVING A FILTER.
      </p>
    </div>
  );
}

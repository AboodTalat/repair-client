"use client";

// Strip under the shop header:
//   Mobile (Figma 2:12 / 2:561 / 2:709 — sticky under header):
//     "HOME/DISCOVER ALL" breadcrumb left, "Filter" text-link right.
//   Desktop (Figma 119:3858):
//     Same breadcrumb but uppercase 18px, plus "Showing N products"
//     and an outlined "Filter" button on the right.

export default function FilterBar({
  categoryName,
  productCount,
  activeFilterCount = 0,
  onOpenFilter,
}) {
  return (
    <div className="flex w-full items-center justify-between">
      <p className="flex items-baseline font-display text-[#11191f]">
        <span className="text-[12px] text-[rgba(17,25,31,0.5)] md:text-[14px]">HOME/</span>
        <span className="text-[14px] font-medium md:text-[18px]">
          {(categoryName || "Discover All").toUpperCase()}
        </span>
      </p>

      <div className="flex items-center gap-3 md:gap-6">
        <span className="hidden font-display text-[14px] leading-5 text-[#6b7280] md:inline">
          Showing {productCount} {productCount === 1 ? "product" : "products"}
        </span>

        {/* Mobile: small text link */}
        <button
          type="button"
          onClick={onOpenFilter}
          className="font-display text-[12px] text-[rgba(17,25,31,0.5)] hover:text-[#11191f] md:hidden"
        >
          Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </button>

        {/* Desktop: outline button — Figma 119:3858 spec: px-4 py-2, 1px
            #11191f outline, 2px radius, 14px Medium Zalando Sans Expanded.
            Icon (node 119:3876) is a "tune" filter icon: 3 horizontal slider
            tracks, each with a circular knob at a different position
            (top: x=4.5 / middle: x=8.25 / bottom: x=3.75 in a 12-unit viewBox). */}
        <button
          type="button"
          onClick={onOpenFilter}
          className="hidden items-center gap-2 rounded-[2px] border border-[#11191f] px-4 py-2 font-display text-[14px] font-medium leading-5 text-[#11191f] hover:bg-[#11191f]/5 md:inline-flex"
        >
          Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          <svg
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            className="size-3"
            aria-hidden
          >
            {/* Three horizontal tracks */}
            <line x1="0.75" y1="2.25" x2="11.25" y2="2.25" />
            <line x1="0.75" y1="6" x2="11.25" y2="6" />
            <line x1="0.75" y1="9.75" x2="11.25" y2="9.75" />
            {/* Knobs — drawn over the tracks with a white core to look like rings */}
            <circle cx="4.5" cy="2.25" r="1.25" fill="#ffffff" />
            <circle cx="8.25" cy="6" r="1.25" fill="#ffffff" />
            <circle cx="3.75" cy="9.75" r="1.25" fill="#ffffff" />
          </svg>
        </button>
      </div>
    </div>
  );
}

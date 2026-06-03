"use client";

// Shop grid pagination. There's no Figma spec for this control, so it follows
// the storefront's established chrome: outlined square buttons, 2px radius, INK
// (#11191f) on white, font-display — same language as the FilterBar "Filter"
// button and the FilterDrawer chips. Conditional backgrounds use inline style
// per the Tailwind v4 + Turbopack arbitrary-class gotcha (see repair/CLAUDE.md).
//
// Props:
//   page      — current page (1-indexed)
//   pageCount — total number of pages
//   onPage    — (n) => void, called with the target page (already clamped here)

const INK = "#11191f";

export default function Pagination({ page, pageCount, onPage }) {
  if (!pageCount || pageCount <= 1) return null;

  const items = pageWindow(page, pageCount);
  const go = (n) => {
    const clamped = Math.min(Math.max(n, 1), pageCount);
    if (clamped !== page) onPage(clamped);
  };

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-1.5 pt-2 md:gap-2 md:pt-4"
    >
      <Arrow
        label="Previous page"
        disabled={page <= 1}
        onClick={() => go(page - 1)}
        direction="left"
      />

      {items.map((it, i) =>
        it === "…" ? (
          <span
            key={`gap-${i}`}
            aria-hidden
            className="grid size-9 place-items-center font-display text-[13px] text-[rgba(17,25,31,0.5)]"
          >
            …
          </span>
        ) : (
          <button
            key={it}
            type="button"
            onClick={() => go(it)}
            aria-current={it === page ? "page" : undefined}
            className="grid size-9 place-items-center rounded-[2px] border border-[#11191f] font-display text-[13px] leading-none transition-colors enabled:hover:bg-[#11191f]/5"
            style={{
              backgroundColor: it === page ? INK : "#ffffff",
              color: it === page ? "#ffffff" : INK,
            }}
          >
            {it}
          </button>
        ),
      )}

      <Arrow
        label="Next page"
        disabled={page >= pageCount}
        onClick={() => go(page + 1)}
        direction="right"
      />
    </nav>
  );
}

function Arrow({ label, disabled, onClick, direction }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-[2px] border border-[#11191f] text-[#11191f] transition-colors enabled:hover:bg-[#11191f]/5 disabled:cursor-not-allowed disabled:opacity-30"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4"
        aria-hidden
      >
        {direction === "left" ? (
          <path d="M15 6l-6 6 6 6" />
        ) : (
          <path d="M9 6l6 6-6 6" />
        )}
      </svg>
    </button>
  );
}

// Compact page window: always show first + last + current±1, collapsing the
// gaps to a single "…". e.g. page 6 of 12 → [1, …, 5, 6, 7, …, 12].
function pageWindow(page, pageCount) {
  const wanted = new Set([1, pageCount, page, page - 1, page + 1]);
  const visible = [...wanted].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);

  const out = [];
  let prev = 0;
  for (const p of visible) {
    if (p - prev > 1) out.push("…");
    out.push(p);
    prev = p;
  }
  return out;
}

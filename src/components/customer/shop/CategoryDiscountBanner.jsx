"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Glossy promotional banner for a category page that has an ACTIVE, admin-
// flagged discount (migration 0029 → myAppGetCategoryDiscountBanner). Rendered
// by ShopPageClient above the FilterBar on the normal shopping path only.
//
// The glassy surface reuses the landing GlassButton recipe (layered inset
// shadows + a white top-left rim + backdrop-blur) on the storefront's dark
// #11191f brand ground with a brand-blue (#1d4ed8) wash, so it reads as one
// system with the sale-price chip. When `ends_at` is set it shows a live
// countdown; the discount value/copy carry the offer.
//
// All colours/shadows/positions use inline `style` per the repair Tailwind v4 +
// Turbopack gotcha (conditional/arbitrary colour + positioning classes are
// silently dropped by the content scanner).

// Same glossy inset-shadow stack as public/homePage/GlassButton.jsx, so the
// banner's sheen matches the landing CTA exactly.
const GLASS_SHADOW =
  "inset -4.5px -4.5px 1.5px -5.25px rgba(255,255,255,0.5)," +
  "inset 4.5px 4.5px 1.5px -5.25px rgba(255,255,255,0.5)," +
  "inset 3px 4.5px 1.5px -3px rgba(179,179,179,0.2)," +
  "inset -3px -4.5px 1.5px -3px rgba(179,179,179,0.35)," +
  "inset 0 0 60px 0 rgba(29,78,216,0.25)," +
  "0 10px 30px -12px rgba(17,25,31,0.45)";

const BRAND_INK = "#11191f";
const BRAND_BLUE = "#1d4ed8";

// Build the offer label from the discount, e.g. "20% OFF" / "JOD 15 OFF".
function offerLabel(banner) {
  const value = Number(banner?.discount_value);
  if (!Number.isFinite(value) || value <= 0) return "ON SALE";
  if (banner.discount_type === "percentage") {
    // Trim a trailing .00 so "20.00%" reads as "20%".
    const pct = Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
    return `${pct}% OFF`;
  }
  const amount = Number.isInteger(value) ? String(value) : value.toFixed(2);
  return `JOD ${amount} OFF`;
}

// Headline: the admin's custom copy verbatim, else auto-generated from the
// offer + the category name ("20% OFF WOMEN").
function headlineFor(banner) {
  if (banner?.banner_headline) return banner.banner_headline;
  const label = offerLabel(banner);
  const name = banner?.target_name ? String(banner.target_name) : "";
  return name ? `${label} · ${name}` : label;
}

// Remaining time between now and `ends_at` (ms). null when there is no end
// date; <= 0 means expired.
function remainingMs(endsAt) {
  if (!endsAt) return null;
  const end = new Date(endsAt).getTime();
  if (!Number.isFinite(end)) return null;
  return end - Date.now();
}

function breakdown(ms) {
  const total = Math.max(0, ms);
  const sec = Math.floor(total / 1000);
  return {
    days: Math.floor(sec / 86400),
    hours: Math.floor((sec % 86400) / 3600),
    minutes: Math.floor((sec % 3600) / 60),
    seconds: sec % 60,
  };
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function CountUnit({ value, label }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className="font-display text-[18px] font-bold leading-none tabular-nums text-white md:text-[22px]"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </span>
      <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.12em] text-white/55 md:text-[10px]">
        {label}
      </span>
    </div>
  );
}

function Separator() {
  return (
    <span className="font-display text-[16px] font-bold leading-none text-white/40 md:text-[20px]" aria-hidden>
      :
    </span>
  );
}

export default function CategoryDiscountBanner({ banner }) {
  const hasEnd = Boolean(banner?.ends_at);
  // Countdown is time-dependent → compute after mount to avoid an SSR/CSR
  // hydration mismatch. `null` = not yet measured (SSR + first paint).
  const [ms, setMs] = useState(null);

  useEffect(() => {
    if (!hasEnd) return;
    const tick = () => setMs(remainingMs(banner.ends_at));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [hasEnd, banner?.ends_at]);

  // On mobile the banner is `position: fixed` (see the render), so it leaves the
  // normal flow — measure its height to size an in-flow spacer that keeps the
  // product grid from sliding underneath. On md+ the banner is `sticky` (stays
  // in flow) and the spacer is `md:hidden`, so this value is unused there.
  //
  // A CALLBACK REF (not a mount effect) does the measuring: it runs during
  // commit and reads `offsetHeight` synchronously, so the spacer is sized before
  // the first paint (no frame where the fixed banner overlaps the grid). A plain
  // RO-in-effect would only fire on the next animation frame — which never comes
  // while the tab is backgrounded — leaving the spacer at 0. `useCallback([])`
  // keeps the ref identity stable so the per-second countdown re-render doesn't
  // tear down + rebuild the observer.
  const roRef = useRef(null);
  const [bannerH, setBannerH] = useState(0);
  const measureRef = useCallback((node) => {
    if (roRef.current) {
      roRef.current.disconnect();
      roRef.current = null;
    }
    if (!node) return;
    setBannerH(node.offsetHeight);
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => setBannerH(node.offsetHeight));
      ro.observe(node);
      roRef.current = ro;
    }
  }, []);

  if (!banner) return null;
  // Discount already ended (client clock crossed ends_at). The server also
  // stops returning it on the next revalidate; hiding here covers the gap.
  if (hasEnd && ms != null && ms <= 0) return null;

  const t = ms == null ? null : breakdown(ms);
  const headline = headlineFor(banner);
  const subtext = banner.banner_subtext || null;

  return (
    <>
      {/* Mobile only: the banner is `fixed` (out of flow), so this spacer
          reserves its measured height and the grid never hides beneath it.
          `md:hidden` removes it at md+ where the banner is `sticky` (in flow). */}
      <div aria-hidden className="md:hidden" style={{ height: bannerH }} />
      <section
        ref={measureRef}
        aria-label="Category promotion"
        // Mobile: `fixed` to the top of the content area — pinned just below the
        // 64px sticky ShopHeader and spanning the px-4 content width (left/right-4),
        // so it stays glued to the top and never scrolls. md+: reverts to `sticky`
        // under the 80px header (left/right reset to auto so it isn't horizontally
        // pinned). `top-*`/inset arbitrary classes are used (verified applied) and
        // the z-index is inline per the Tailwind v4 + Turbopack scanner gotcha —
        // z-10 floats it above the scrolling grid (root z-auto via ProductCard
        // `isolate`) but below the header (z-30) and the search overlay (z-20).
        className="fixed left-4 right-4 top-[64px] flex flex-col gap-4 overflow-hidden rounded-2xl border-l border-t px-5 py-4 md:sticky md:left-auto md:right-auto md:top-[80px] md:flex-row md:items-center md:justify-between md:gap-6 md:px-8 md:py-5"
        style={{
          zIndex: 10,
        // Dark brand ground with a blue diagonal wash — the glossy sheen comes
        // from the inset-shadow stack (matches GlassButton).
        backgroundImage: `linear-gradient(115deg, ${BRAND_INK} 0%, #172033 46%, ${BRAND_BLUE} 140%)`,
        borderLeftColor: "rgba(255,255,255,0.8)",
        borderTopColor: "rgba(255,255,255,0.8)",
        boxShadow: GLASS_SHADOW,
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
      }}
    >
      {/* Copy block */}
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="flex items-center gap-2">
          <span
            className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white md:text-[11px]"
            style={{ backgroundColor: BRAND_BLUE }}
          >
            Limited-time offer
          </span>
        </span>
        <h2 className="font-display text-[19px] font-bold uppercase leading-tight tracking-[0.01em] text-white md:text-[24px]">
          {headline}
        </h2>
        {subtext ? (
          <p className="max-w-[52ch] text-[13px] leading-snug text-white/70 md:text-[14px]">{subtext}</p>
        ) : hasEnd ? (
          <p className="text-[13px] leading-snug text-white/60 md:text-[14px]">
            Hurry — this deal ends soon.
          </p>
        ) : null}
      </div>

      {/* Countdown block (only when the discount has an end date) */}
      {hasEnd ? (
        <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50 md:text-[11px]">
            Ends in
          </span>
          <div
            className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 md:gap-3 md:px-4"
            style={{
              backgroundColor: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.14)",
            }}
          >
            {t == null ? (
              // Pre-hydration placeholder — mirrors the real countdown's
              // Hrs/Min/Sec two-line unit layout (not a single line) so the
              // block's HEIGHT is identical before and after hydration. That
              // keeps the mobile fixed-banner spacer (measured once via the
              // callback ref) exact, with no post-mount reflow for it to chase.
              // Unit COUNT (3 vs the 4 shown once days>0) doesn't change the
              // row's height, so the placeholder's 3 units are enough.
              <>
                <CountUnit value="--" label="Hrs" />
                <Separator />
                <CountUnit value="--" label="Min" />
                <Separator />
                <CountUnit value="--" label="Sec" />
              </>
            ) : (
              <>
                {t.days > 0 ? (
                  <>
                    <CountUnit value={pad(t.days)} label="Days" />
                    <Separator />
                  </>
                ) : null}
                <CountUnit value={pad(t.hours)} label="Hrs" />
                <Separator />
                <CountUnit value={pad(t.minutes)} label="Min" />
                <Separator />
                <CountUnit value={pad(t.seconds)} label="Sec" />
              </>
            )}
          </div>
        </div>
      ) : null}
      </section>
    </>
  );
}

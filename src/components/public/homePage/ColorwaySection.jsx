import Image from "next/image";
import GlassButton from "./GlassButton";

function Swatch({ color, name, tagline, size = "lg" }) {
  const isSm = size === "sm";
  return (
    <div className="flex items-center gap-2">
      <div
        className="size-8 shrink-0 rounded-[4px] border border-white/5"
        style={{ background: color }}
      />
      <div className="flex flex-col">
        <p
          className={`font-display font-bold leading-normal text-white ${
            isSm ? "text-[13px]" : "text-[16px]"
          }`}
        >
          {name}
        </p>
        <p
          className={`font-body leading-4 text-white/50 ${isSm ? "text-[11px]" : "text-[12px]"}`}
          style={{ fontStretch: "75%" }}
        >
          {tagline}
        </p>
      </div>
    </div>
  );
}

function UnisexBadge() {
  return (
    <span
      className="inline-flex items-center justify-center rounded-[32px] border border-white/10 bg-black/30 px-2 py-1 font-body text-[12px] leading-4 text-white/90"
      style={{ fontStretch: "75%" }}
    >
      UNISEX
    </span>
  );
}

function DesktopSwatch({ color, name, tagline }) {
  return (
    <div className="flex items-center gap-4">
      <div
        className="size-14 shrink-0 rounded-[6px] border border-white/10"
        style={{ background: color }}
      />
      <div className="flex flex-col">
        <p className="font-display text-[22px] font-bold leading-tight text-white lg:text-[26px]">
          {name}
        </p>
        <p
          className="mt-1 font-body text-[14px] leading-5 text-white/60 lg:text-[15px]"
          style={{ fontStretch: "75%" }}
        >
          {tagline}
        </p>
      </div>
    </div>
  );
}

export default function ColorwaySection({
  image,
  imageAlt,
  swatches,
  ctaLabel,
  multiSwatch = false,
  badge,
  reversed = false,
}) {
  return (
    <>
      {/* Mobile (< md) — original full-bleed + bottom panel */}
      <section className="relative h-[700px] w-full overflow-hidden bg-black md:hidden">
        <Image
          src={image}
          alt={imageAlt}
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(0,0,0,1) 100%)",
          }}
          aria-hidden
        />

        <div className="absolute inset-x-0 bottom-[48px] flex flex-col gap-4 px-[14.5px]">
          <div
            className={`flex items-center gap-4 rounded-[12px] bg-black/30 p-3 backdrop-blur-sm ${
              multiSwatch ? "" : "justify-between"
            }`}
          >
            {multiSwatch ? (
              swatches.map((s) => <Swatch key={s.name} {...s} size="sm" />)
            ) : (
              <>
                <Swatch {...swatches[0]} size="lg" />
                {badge === "UNISEX" ? <UnisexBadge /> : null}
              </>
            )}
          </div>
          <GlassButton variant="light">{ctaLabel}</GlassButton>
        </div>
      </section>

      {/* Desktop (md+) — alternating two-column */}
      <section className="hidden w-full bg-black md:block">
        <div
          className={`mx-auto grid max-w-[1280px] grid-cols-12 items-stretch gap-0 px-10 py-20 lg:px-16 lg:py-28 ${
            reversed ? "" : ""
          }`}
        >
          <div
            className={`relative col-span-7 aspect-[4/5] w-full overflow-hidden rounded-2xl bg-[#0a0a0a] ${
              reversed ? "order-2" : "order-1"
            }`}
          >
            <Image
              src={image}
              alt={imageAlt}
              fill
              sizes="(min-width: 1280px) 760px, 60vw"
              className="object-cover"
            />
          </div>

          <div
            className={`col-span-5 flex flex-col justify-center px-8 lg:px-14 ${
              reversed ? "order-1" : "order-2"
            }`}
          >
            {badge === "UNISEX" ? (
              <span
                className="inline-flex w-fit items-center justify-center rounded-[32px] border border-white/15 bg-white/5 px-3 py-1 font-body text-[12px] uppercase tracking-[0.2em] text-white/80"
                style={{ fontStretch: "75%" }}
              >
                Unisex
              </span>
            ) : (
              <p
                className="font-body text-[13px] uppercase tracking-[0.4em] text-white/50"
                style={{ fontStretch: "75%" }}
              >
                Colorway
              </p>
            )}

            <h3 className="mt-4 font-display text-[40px] font-bold uppercase leading-[1.05] text-white lg:text-[52px]">
              {multiSwatch
                ? swatches.map((s) => s.name).join(" / ")
                : swatches[0].name}
            </h3>

            <div className="mt-8 flex flex-col gap-5">
              {(multiSwatch ? swatches : [swatches[0]]).map((s) => (
                <DesktopSwatch key={s.name} {...s} />
              ))}
            </div>

            <div className="mt-10 max-w-[280px]">
              <GlassButton variant="light" className="!h-12">
                {ctaLabel}
              </GlassButton>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

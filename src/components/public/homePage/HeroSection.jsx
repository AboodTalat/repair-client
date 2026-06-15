import Image from "next/image";
import GlassButton from "./GlassButton";

export default function HeroSection({ hero } = {}) {
  // CMS overlay — each field falls back to the current copy, so an empty CMS
  // renders the hero exactly as before. The bespoke two-line title markup is the
  // default; a CMS `title` replaces it with a single styled heading.
  const eyebrow = hero?.eyebrow || "New Drop · SS26";
  const subtitle =
    hero?.subtitle ||
    "Premium materials. Precision engineering. Built for thousands of workouts.";
  const ctaLabel = hero?.ctaLabel || "GET YOURS NOW";
  const title = hero?.title;
  return (
    <section className="relative min-h-[852px] w-full overflow-hidden bg-[linear-gradient(180deg,#0f1112_0%,#101011_54.5%,#101013_76.4%,#101014_100%)] md:min-h-screen">
      {/* Mobile layout (< md) — original design */}
      <div className="md:hidden">
        <div className="absolute left-1/2 top-[71px] aspect-[460/586] w-[117%] -translate-x-1/2">
          <Image
            src="/home/hero-hoodie.png"
            alt="Repair signature hoodie"
            fill
            priority
            sizes="117vw"
            className="object-cover"
          />
        </div>

        <div className="absolute inset-x-0 bottom-0 px-[69px] pb-[118px] text-center">
          <h1 className="font-display text-[21px] font-bold uppercase leading-tight text-white">
            {title ? title : (<>Step into <span>Energy</span></>)}
          </h1>
          <p
            className="mx-auto mt-2 max-w-[230px] font-body text-[14px] text-[#d4d4d4]"
            style={{ fontStretch: "75%" }}
          >
            {subtitle}
          </p>
          <div className="mt-4 flex justify-center">
            <GlassButton variant="dark" className="!w-[255px]">
              {ctaLabel}
            </GlassButton>
          </div>
        </div>
      </div>

      {/* Desktop layout (md+) — two-column */}
      <div className="hidden h-full min-h-screen md:block">
        <div className="mx-auto grid h-full min-h-screen max-w-[1280px] grid-cols-2 items-center gap-12 px-10 py-24 lg:gap-20 lg:px-16">
          <div className="flex flex-col items-start">
            <p
              className="font-body text-[14px] uppercase tracking-[0.4em] text-white/60"
              style={{ fontStretch: "75%" }}
            >
              {eyebrow}
            </p>
            <h1 className="mt-4 font-display text-[64px] font-bold uppercase leading-[1.05] text-white lg:text-[88px] xl:text-[104px]">
              {title ? title : (<>Step into<br /><span className="text-white/90">Energy</span></>)}
            </h1>
            <p
              className="mt-6 max-w-[440px] font-body text-[18px] leading-[1.6] text-[#d4d4d4] lg:text-[20px]"
              style={{ fontStretch: "75%" }}
            >
              {subtitle}
            </p>
            <div className="mt-10 flex items-center gap-5">
              <GlassButton variant="dark" className="!h-12 !w-[260px]">
                {ctaLabel}
              </GlassButton>
              <a
                href="#colorways"
                className="font-body text-[14px] uppercase tracking-[0.2em] text-white/70 underline-offset-4 hover:text-white hover:underline"
                style={{ fontStretch: "75%" }}
              >
                Explore the line
              </a>
            </div>
          </div>

          <div className="relative h-full min-h-[640px] w-full">
            <Image
              src="/home/hero-hoodie.png"
              alt="Repair signature hoodie"
              fill
              priority
              sizes="(min-width: 1280px) 640px, 50vw"
              className="object-contain object-center"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

import { COLORWAYS_INTRO_DEFAULT } from "@/lib/storefrontDefaults";

export default function ColorwaysIntro({ intro } = {}) {
  // CMS overlay — falls back to the current copy so an empty CMS is identical.
  const eyebrow = intro?.eyebrow || COLORWAYS_INTRO_DEFAULT.eyebrow;
  const title = intro?.title || COLORWAYS_INTRO_DEFAULT.title;
  const subtitle = intro?.subtitle || COLORWAYS_INTRO_DEFAULT.subtitle;
  return (
    <section
      id="colorways"
      className="flex h-[852px] w-full flex-col items-center justify-center bg-black px-[69px] text-center md:h-auto md:py-32 lg:py-40"
    >
      <p
        className="hidden font-body text-[14px] uppercase tracking-[0.4em] text-white/50 md:block"
        style={{ fontStretch: "75%" }}
      >
        {eyebrow}
      </p>
      <h2 className="font-display text-[21px] font-bold uppercase leading-normal text-white md:mt-5 md:max-w-[900px] md:text-[56px] md:leading-[1.1] lg:text-[72px] xl:text-[88px]">
        {title}
      </h2>
      <p
        className="mt-2 font-body text-[18px] leading-normal text-[#d4d4d4] md:mt-6 md:max-w-[640px] md:text-[22px] lg:text-[24px]"
        style={{ fontStretch: "75%" }}
      >
        {subtitle}
      </p>
    </section>
  );
}

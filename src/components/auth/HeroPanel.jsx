import Image from "next/image";

export default function HeroPanel({
  image,
  imageAlt = "",
  quote = "Define your movement.",
  overlay = "rgba(17,25,31,0.05)",
}) {
  return (
    <div className="relative hidden min-h-screen w-[60%] shrink-0 self-stretch overflow-hidden bg-[#f5f5f5] md:block">
      <Image
        src={image}
        alt={imageAlt}
        fill
        priority
        sizes="(min-width: 768px) 60vw, 0vw"
        className="object-cover"
      />
      <div className="pointer-events-none absolute inset-0" style={{ background: overlay }} />

      <div className="absolute left-8 top-8 h-[33px] w-12">
        <Image
          src="/home/logo-re.png"
          alt="Repair"
          fill
          sizes="48px"
          className="object-contain object-left"
          priority
        />
      </div>

      {quote ? (
        <div className="absolute bottom-12 left-12 max-w-[448px]">
          <p
            className="font-display text-[18px] font-medium leading-[28px] text-white"
            style={{
              letterSpacing: "0.45px",
              filter:
                "drop-shadow(0px 2px 1px rgba(0,0,0,0.06)) drop-shadow(0px 4px 1.5px rgba(0,0,0,0.07))",
            }}
          >
            {quote}
          </p>
        </div>
      ) : null}
    </div>
  );
}

import Image from "next/image";
import GlassButton from "./GlassButton";

const STATS = [
  { value: "78%", label: "Recycled Polyester" },
  { value: "22%", label: "Premium Elastane" },
  { value: "100%", label: "Performance Guaranteed" },
];

export default function StatsSection() {
  return (
    <>
      {/* Mobile (< md) — original full-bleed + bottom panel */}
      <section className="relative h-[700px] w-full overflow-hidden bg-black md:hidden">
        <Image
          src="/home/athletic.png"
          alt="Athlete in Repair gear"
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,1) 100%)",
          }}
          aria-hidden
        />

        <div className="absolute inset-x-0 bottom-[48px] px-4">
          <div className="flex items-start gap-4 rounded-[12px] bg-black/30 p-3 backdrop-blur-sm">
            {STATS.map((s) => (
              <div key={s.value} className="flex flex-1 flex-col items-center gap-2">
                <p className="font-display text-[31px] font-bold leading-10 text-white">
                  {s.value}
                </p>
                <p
                  className="text-center font-body text-[12px] leading-4 text-white/50"
                  style={{ fontStretch: "75%" }}
                >
                  {s.label}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <GlassButton variant="light">SELECT YOUR SIZE</GlassButton>
          </div>
        </div>
      </section>

      {/* Desktop (md+) — two-column with stats grid */}
      <section className="hidden w-full bg-black md:block">
        <div className="mx-auto grid max-w-[1280px] grid-cols-12 items-center gap-12 px-10 py-20 lg:gap-16 lg:px-16 lg:py-28">
          <div className="relative col-span-6 aspect-[4/5] w-full overflow-hidden rounded-2xl bg-[#0a0a0a]">
            <Image
              src="/home/athletic.png"
              alt="Athlete in Repair gear"
              fill
              sizes="(min-width: 1280px) 620px, 50vw"
              className="object-cover"
            />
          </div>

          <div className="col-span-6 flex flex-col">
            <p
              className="font-body text-[13px] uppercase tracking-[0.4em] text-white/50"
              style={{ fontStretch: "75%" }}
            >
              The Fabric
            </p>
            <h2 className="mt-4 font-display text-[40px] font-bold uppercase leading-[1.05] text-white lg:text-[56px]">
              Built for
              <br />
              every rep.
            </h2>
            <p
              className="mt-5 max-w-[480px] font-body text-[16px] leading-[1.6] text-white/60 lg:text-[18px]"
              style={{ fontStretch: "75%" }}
            >
              A high-performance blend engineered for stretch, recovery, and breathability — wash
              after wash.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-6 border-y border-white/10 py-8">
              {STATS.map((s) => (
                <div key={s.value} className="flex flex-col gap-2">
                  <p className="font-display text-[44px] font-bold leading-none text-white lg:text-[56px]">
                    {s.value}
                  </p>
                  <p
                    className="font-body text-[12px] uppercase tracking-[0.15em] text-white/50 lg:text-[13px]"
                    style={{ fontStretch: "75%" }}
                  >
                    {s.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-10 max-w-[280px]">
              <GlassButton variant="light" className="!h-12">
                SELECT YOUR SIZE
              </GlassButton>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

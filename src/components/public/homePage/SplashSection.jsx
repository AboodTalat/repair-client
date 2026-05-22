"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const photos = [
  { src: "/splash/splash-1.png", alt: "Athletes posing as a group" },
  { src: "/splash/splash-2.png", alt: "Runner in motion with shadow" },
  { src: "/splash/splash-3.png", alt: "Model in studio wear, reclining" },
  { src: "/splash/splash-4.png", alt: "Athlete stretching in studio" },
];

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const HOLD_MS = 3000;
const FADE_MS = 700;

export default function SplashSection() {
  const [fading, setFading] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const fadeTimer = setTimeout(() => setFading(true), HOLD_MS);
    const removeTimer = setTimeout(() => {
      setRemoved(true);
      document.body.style.overflow = prevOverflow;
    }, HOLD_MS + FADE_MS);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  if (removed) return null;

  return (
    <section
      aria-label="Repair splash"
      aria-hidden={fading}
      className="fixed inset-0 z-50 grid grid-cols-1 grid-rows-4 overflow-hidden bg-white landscape:grid-cols-2 landscape:grid-rows-2"
      style={{
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? "none" : "auto",
        transition: `opacity ${FADE_MS}ms ${EASE}`,
      }}
    >
      {photos.map((p, i) => (
        <div
          key={p.src}
          className="splash-anim relative h-full w-full will-change-transform"
          style={{
            animation: `splashTile 700ms ${EASE} ${0.15 + i * 0.35}s both`,
          }}
        >
          <Image
            src={p.src}
            alt={p.alt}
            fill
            sizes="(orientation: landscape) 50vw, 100vw"
            className="object-cover object-center"
            priority={i < 2}
          />
        </div>
      ))}

      <div
        className="splash-anim pointer-events-none absolute left-1/2 top-1/2 z-10"
        style={{
          width: "clamp(112px, 22vmin, 260px)",
          aspectRatio: "128 / 98",
          animation: `splashLogo 800ms ${EASE} 1.75s both`,
        }}
      >
        <Image
          src="/splash/logo-re.png"
          alt="Repair"
          width={260}
          height={199}
          priority
          className="h-full w-full object-contain drop-shadow-[0_4px_24px_rgba(0,0,0,0.18)]"
        />
      </div>
    </section>
  );
}

import Link from "next/link";

const SHADOW =
  "inset -4.5px -4.5px 1.5px -5.25px rgba(255,255,255,0.5)," +
  "inset 4.5px 4.5px 1.5px -5.25px rgba(255,255,255,0.5)," +
  "inset 3px 4.5px 1.5px -3px rgba(179,179,179,0.2)," +
  "inset -3px -4.5px 1.5px -3px #b3b3b3," +
  "inset 0 0 33px 0 rgba(242,242,242,0.5)";

export default function GlassButton({
  children,
  variant = "dark",
  className = "",
  type = "button",
  href,
  ...props
}) {
  const isDark = variant === "dark";
  // When an href is supplied the CTA renders as a link (used by the admin-
  // editable hero CTA); otherwise it stays a plain button — visually identical.
  const Comp = href ? Link : "button";
  const compProps = href ? { href } : { type };
  return (
    <Comp
      {...compProps}
      className={`relative flex h-10 w-full items-center justify-center overflow-hidden rounded-lg border-l border-t border-white/80 backdrop-blur-[2px] ${className}`}
      style={{ boxShadow: SHADOW }}
      {...props}
    >
      {isDark ? (
        <>
          <span className="absolute inset-0 rounded-lg bg-black/35" aria-hidden />
          <span
            className="absolute inset-0 rounded-lg bg-[#1d1d1d] opacity-30"
            style={{ mixBlendMode: "plus-lighter" }}
            aria-hidden
          />
          <span className="absolute inset-0 rounded-lg bg-black/30" aria-hidden />
        </>
      ) : (
        <span className="absolute inset-0 rounded-lg bg-white" aria-hidden />
      )}
      <span
        className={`relative font-display text-[15px] font-bold leading-none ${
          isDark ? "text-white" : "text-[#11191f]"
        }`}
      >
        {children}
      </span>
    </Comp>
  );
}

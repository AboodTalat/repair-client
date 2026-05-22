// Primary/secondary/ghost/danger button variants for admin surfaces.
// Use `as="a"` (or pass a Link via `asChild` pattern is unnecessary here —
// we just render either button or an anchor explicitly).

const VARIANTS = {
  primary:
    "bg-[#11191f] text-white hover:bg-[#1c2630] border border-transparent",
  accent:
    "bg-[#1d4ed8] text-white hover:bg-[#1e40af] border border-transparent",
  secondary:
    "bg-white text-[#11191f] hover:bg-[#f3f4f6] border border-[#e5e7eb]",
  ghost:
    "bg-transparent text-[#11191f] hover:bg-[#f3f4f6] border border-transparent",
  danger:
    "bg-white text-[#dc2626] hover:bg-[#fef2f2] border border-[#fecaca]",
  dangerSolid:
    "bg-[#dc2626] text-white hover:bg-[#b91c1c] border border-transparent",
};

const SIZES = {
  sm: "h-8 px-3 text-[12px] tracking-[1px]",
  md: "h-10 px-4 text-[13px] tracking-[1.2px]",
  lg: "h-12 px-6 text-[14px] tracking-[1.4px]",
};

export default function Button({
  variant = "primary",
  size = "md",
  icon = null,
  iconRight = null,
  children,
  className = "",
  type = "button",
  ...props
}) {
  const cls = [
    "inline-flex items-center justify-center gap-2 font-display font-semibold uppercase rounded-[2px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap",
    VARIANTS[variant],
    SIZES[size],
    className,
  ].join(" ");
  return (
    <button type={type} className={cls} {...props}>
      {icon ? <span className="grid size-4 place-items-center">{icon}</span> : null}
      {children}
      {iconRight ? <span className="grid size-4 place-items-center">{iconRight}</span> : null}
    </button>
  );
}

export function IconButton({ label, children, className = "", ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={
        "inline-grid size-8 place-items-center rounded-[2px] text-[#11191f] hover:bg-[#f3f4f6] transition-colors " +
        className
      }
      {...props}
    >
      <span className="grid size-4 place-items-center">{children}</span>
    </button>
  );
}

import { IconArrowUp, IconArrowDown } from "./Icons";

export default function KpiCard({ label, value, delta = 0, period = "", icon = null, accent = "#1d4ed8" }) {
  const up = delta > 0;
  const flat = delta === 0;
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-[4px] border border-[#e5e7eb] bg-white p-4 sm:gap-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
          {label}
        </span>
        {icon ? (
          <span
            className="grid size-8 shrink-0 place-items-center rounded-[4px] sm:size-9"
            style={{ backgroundColor: `${accent}14`, color: accent }}
          >
            <span className="grid size-5 place-items-center">{icon}</span>
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <span
          className="min-w-0 font-display font-bold leading-none text-[#11191f]"
          style={{ fontSize: "clamp(20px, 4.2vw, 28px)" }}
        >
          {value}
        </span>
        {!flat ? (
          <span
            className="inline-flex shrink-0 items-center gap-0.5 font-body text-[12px] font-medium"
            style={{ color: up ? "#16a34a" : "#dc2626" }}
          >
            <span className="grid size-3 place-items-center">
              {up ? <IconArrowUp /> : <IconArrowDown />}
            </span>
            {Math.abs(delta).toFixed(1)}%
          </span>
        ) : null}
      </div>
      {period ? (
        <span className="font-body text-[11px] leading-snug text-[#6b7280]">{period}</span>
      ) : null}
    </div>
  );
}

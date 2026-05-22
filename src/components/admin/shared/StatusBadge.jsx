import { STATUS_TONE } from "@/lib/mockAdmin";

export default function StatusBadge({ status, label, dot = true, size = "md" }) {
  const tone = STATUS_TONE[status] || STATUS_TONE.inactive;
  const padding = size === "sm" ? "h-5 px-2 text-[10px]" : "h-6 px-2.5 text-[11px]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-body font-medium uppercase tracking-[0.6px] ${padding}`}
      style={{ backgroundColor: tone.bg, color: tone.fg }}
    >
      {dot ? (
        <span className="inline-block size-1.5 rounded-full" style={{ backgroundColor: tone.dot }} />
      ) : null}
      {label || status}
    </span>
  );
}

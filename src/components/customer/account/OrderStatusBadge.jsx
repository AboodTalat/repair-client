// Status pill used on order cards. Tones match the Figma palette:
//   Delivered  → bg #dcfce7 / text #166534 + check-circle icon
//   On the way → bg #dbeafe / text #1e40af + truck icon
//   Cancelled  → bg #fee2e2 / text #991b1b + x-circle icon
//   Returned   → bg #f3e8ff / text #6b21a8 + return arrow icon

function CheckCircle() {
  return (
    <svg
      viewBox="0 0 12 12"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="6" cy="6" r="5" />
      <path d="M3.6 6.2 5.2 7.8 8.6 4.4" />
    </svg>
  );
}

function Truck() {
  return (
    <svg
      viewBox="0 0 16 13"
      width="16"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="0.6" y="2" width="8" height="7" rx="0.8" />
      <path d="M8.6 4.4h3.4l2.4 2.6V9h-5.8" />
      <circle cx="3.2" cy="10.4" r="1.6" />
      <circle cx="11.2" cy="10.4" r="1.6" />
    </svg>
  );
}

function XCircle() {
  return (
    <svg
      viewBox="0 0 12 12"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="6" cy="6" r="5" />
      <path d="M4 4l4 4M8 4l-4 4" />
    </svg>
  );
}

function ReturnArrow() {
  return (
    <svg
      viewBox="0 0 12 12"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 4h5a2.5 2.5 0 0 1 0 5H4.5" />
      <path d="M4.6 2 3 4l1.6 2" />
    </svg>
  );
}

const TONES = {
  delivered: { bg: "#dcfce7", color: "#166534", Icon: CheckCircle },
  "on-the-way": { bg: "#dbeafe", color: "#1e40af", Icon: Truck },
  cancelled: { bg: "#fee2e2", color: "#991b1b", Icon: XCircle },
  returned: { bg: "#f3e8ff", color: "#6b21a8", Icon: ReturnArrow },
};

export default function OrderStatusBadge({ kind, label, size = "md" }) {
  const tone = TONES[kind] ?? TONES["on-the-way"];
  const Icon = tone.Icon;
  const textSize = size === "sm" ? "text-[10px]" : "text-[12px]";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-[2px] md:py-1 font-display ${textSize}`}
      style={{ backgroundColor: tone.bg, color: tone.color, fontWeight: 500, lineHeight: "16px" }}
    >
      <Icon />
      {label}
    </span>
  );
}

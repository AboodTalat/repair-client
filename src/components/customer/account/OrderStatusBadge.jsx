// Status pill used on order cards + the order-tracking page. One tone per REAL
// order status (no more collapsing the in-transit states into a single "On the
// way" pill — a `processing` order must not look in-transit):
//   Pending          → bg #f3f4f6 / text #4b5563 + clock icon
//   Processing       → bg #fef3c7 / text #92400e + clock icon
//   Dispatched       → bg #dbeafe / text #1e40af + package icon
//   Out for Delivery → bg #e0e7ff / text #3730a3 + truck icon
//   Delivered        → bg #dcfce7 / text #166534 + check-circle icon
//   Delivery failed  → bg #ffedd5 / text #9a3412 + truck icon
//   Cancelled        → bg #fee2e2 / text #991b1b + x-circle icon
//   Returned         → bg #f3e8ff / text #6b21a8 + return arrow icon
//   Unknown (fallback) → neutral grey + clock icon

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

function Clock() {
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
      <path d="M6 3.4V6l1.8 1.1" />
    </svg>
  );
}

function Package() {
  return (
    <svg
      viewBox="0 0 12 12"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 1 1.2 3.4v5.2L6 11l4.8-2.4V3.4L6 1z" />
      <path d="M1.2 3.4 6 5.8l4.8-2.4" />
      <path d="M6 5.8V11" />
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

// Neutral fallback tone — used for `pending`, `unknown`, and any kind not
// explicitly mapped. Deliberately NOT the truck "on the way" tone: a missing
// entry must never silently masquerade as an in-transit order.
const NEUTRAL_TONE = { bg: "#f3f4f6", color: "#4b5563", Icon: Clock };

const TONES = {
  // In-transit progression (cool tones), one per real state.
  pending: NEUTRAL_TONE,
  processing: { bg: "#fef3c7", color: "#92400e", Icon: Clock },
  dispatched: { bg: "#dbeafe", color: "#1e40af", Icon: Package },
  "out-for-delivery": { bg: "#e0e7ff", color: "#3730a3", Icon: Truck },
  delivered: { bg: "#dcfce7", color: "#166534", Icon: CheckCircle },
  // Failed delivery — amber/orange so it reads as "needs attention", distinct
  // from the red "cancelled" tone.
  failed: { bg: "#ffedd5", color: "#9a3412", Icon: Truck },
  cancelled: { bg: "#fee2e2", color: "#991b1b", Icon: XCircle },
  returned: { bg: "#f3e8ff", color: "#6b21a8", Icon: ReturnArrow },
  unknown: NEUTRAL_TONE,
};

export default function OrderStatusBadge({ kind, label, size = "md" }) {
  const tone = TONES[kind] ?? NEUTRAL_TONE;
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

// Single-stroke icon set, sized via the parent's font-size or explicit className.
// Kept dependency-free so we don't pull in a lucide-style package.

function svgProps(extra = {}) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    ...extra,
  };
}

export function IconDashboard(p) {
  return (
    <svg {...svgProps(p)}>
      <rect x="3" y="3" width="8" height="10" rx="1.5" />
      <rect x="13" y="3" width="8" height="6" rx="1.5" />
      <rect x="13" y="11" width="8" height="10" rx="1.5" />
      <rect x="3" y="15" width="8" height="6" rx="1.5" />
    </svg>
  );
}
export function IconBox(p) {
  return (
    <svg {...svgProps(p)}>
      <path d="M21 8 12 3 3 8v8l9 5 9-5z" />
      <path d="M3 8l9 5 9-5" />
      <path d="M12 13v8" />
    </svg>
  );
}
export function IconFolder(p) {
  return (
    <svg {...svgProps(p)}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}
export function IconCart(p) {
  return (
    <svg {...svgProps(p)}>
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="17" cy="20" r="1.4" />
      <path d="M3 4h2l2.4 12.2A2 2 0 0 0 9.4 18h8.5a2 2 0 0 0 2-1.6L21 8H6" />
    </svg>
  );
}
export function IconChart(p) {
  return (
    <svg {...svgProps(p)}>
      <path d="M3 3v18h18" />
      <path d="M7 14l4-4 3 3 5-6" />
    </svg>
  );
}
export function IconTag(p) {
  return (
    <svg {...svgProps(p)}>
      <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z" />
      <circle cx="8" cy="8" r="1.4" />
    </svg>
  );
}
export function IconUsers(p) {
  return (
    <svg {...svgProps(p)}>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 4.5a3 3 0 0 1 0 6" />
      <path d="M21 20c0-2.5-1.7-4.6-4-5.4" />
    </svg>
  );
}
export function IconPercent(p) {
  return (
    <svg {...svgProps(p)}>
      <path d="M5 19 19 5" />
      <circle cx="7" cy="7" r="2.4" />
      <circle cx="17" cy="17" r="2.4" />
    </svg>
  );
}
export function IconMail(p) {
  return (
    <svg {...svgProps(p)}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}
export function IconSearch(p) {
  return (
    <svg {...svgProps(p)}>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}
export function IconBell(p) {
  return (
    <svg {...svgProps(p)}>
      <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 2 7H4c.5-1.5 2-3 2-7Z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </svg>
  );
}
export function IconPlus(p) {
  return (
    <svg {...svgProps(p)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
export function IconClose(p) {
  return (
    <svg {...svgProps(p)}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}
export function IconChevronDown(p) {
  return (
    <svg {...svgProps(p)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
export function IconChevronRight(p) {
  return (
    <svg {...svgProps(p)}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
export function IconEdit(p) {
  return (
    <svg {...svgProps(p)}>
      <path d="M4 20h4l11-11-4-4L4 16Z" />
      <path d="m13 6 4 4" />
    </svg>
  );
}
export function IconTrash(p) {
  return (
    <svg {...svgProps(p)}>
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
export function IconEye(p) {
  return (
    <svg {...svgProps(p)}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  );
}
export function IconEyeOff(p) {
  return (
    <svg {...svgProps(p)}>
      <path d="M3 3l18 18" />
      <path d="M10.6 6.1A10.5 10.5 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3.7 4.4" />
      <path d="M6.5 6.7A17 17 0 0 0 2 12s3.6 6 10 6a10.5 10.5 0 0 0 4.4-1" />
      <path d="M9.5 9.5a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}
export function IconGrip(p) {
  return (
    <svg {...svgProps(p)}>
      <circle cx="9" cy="6" r="1" fill="currentColor" />
      <circle cx="15" cy="6" r="1" fill="currentColor" />
      <circle cx="9" cy="12" r="1" fill="currentColor" />
      <circle cx="15" cy="12" r="1" fill="currentColor" />
      <circle cx="9" cy="18" r="1" fill="currentColor" />
      <circle cx="15" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}
export function IconDownload(p) {
  return (
    <svg {...svgProps(p)}>
      <path d="M12 4v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  );
}
export function IconFilter(p) {
  return (
    <svg {...svgProps(p)}>
      <path d="M3 5h18l-7 9v6l-4-2v-4z" />
    </svg>
  );
}
export function IconCheck(p) {
  return (
    <svg {...svgProps(p)}>
      <path d="m5 12 5 5 9-11" />
    </svg>
  );
}
export function IconArrowUp(p) {
  return (
    <svg {...svgProps(p)}>
      <path d="M12 19V5" />
      <path d="m6 11 6-6 6 6" />
    </svg>
  );
}
export function IconArrowDown(p) {
  return (
    <svg {...svgProps(p)}>
      <path d="M12 5v14" />
      <path d="m6 13 6 6 6-6" />
    </svg>
  );
}
export function IconLogout(p) {
  return (
    <svg {...svgProps(p)}>
      <path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}
export function IconAlert(p) {
  return (
    <svg {...svgProps(p)}>
      <path d="M12 3 2 21h20z" />
      <path d="M12 10v5" />
      <circle cx="12" cy="18" r="0.6" fill="currentColor" />
    </svg>
  );
}
export function IconCalendar(p) {
  return (
    <svg {...svgProps(p)}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}
export function IconSend(p) {
  return (
    <svg {...svgProps(p)}>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4z" />
    </svg>
  );
}
export function IconCopy(p) {
  return (
    <svg {...svgProps(p)}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}
export function IconMessageSquare(p) {
  return (
    <svg {...svgProps(p)}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
export function IconSettings(p) {
  return (
    <svg {...svgProps(p)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
    </svg>
  );
}

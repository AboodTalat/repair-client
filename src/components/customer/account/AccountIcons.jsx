// Inline single-stroke SVG icons for the `/account` page.
// Inlined rather than referencing the Figma asset URLs — those expire after
// 7 days and would silently break the page.

// Star — exact path from Figma vuesax/linear/star (public/account/icon-star-*.svg).
// `filled` toggles between bold (filled) and linear (outline only) variants.
const STAR_PATH =
  "M11.4416 2.92511L12.9083 5.85845C13.1083 6.26678 13.6416 6.65845 14.0916 6.73345L16.7499 7.17511C18.4499 7.45845 18.8499 8.69178 17.6249 9.90845L15.5583 11.9751C15.2083 12.3251 15.0166 13.0001 15.1249 13.4834L15.7166 16.0418C16.1833 18.0668 15.1083 18.8501 13.3166 17.7918L10.8249 16.3168C10.3749 16.0501 9.63326 16.0501 9.17492 16.3168L6.68326 17.7918C4.89992 18.8501 3.81659 18.0584 4.28326 16.0418L4.87492 13.4834C4.98326 13.0001 4.79159 12.3251 4.44159 11.9751L2.37492 9.90845C1.15826 8.69178 1.54992 7.45845 3.24992 7.17511L5.90826 6.73345C6.34992 6.65845 6.88326 6.26678 7.08326 5.85845L8.54992 2.92511C9.34992 1.33345 10.6499 1.33345 11.4416 2.92511Z";

export function StarIcon({ filled = false, size = 20, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d={STAR_PATH}
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Trash — exact path from Figma vuesax/linear/trash (public/account/icon-trash.svg).
// Stroke is hardcoded to #A50013 (the same red as the DELETE CARD button)
// because the trash icon is the danger affordance in this surface.
export function TrashIcon({ size = 20, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <g stroke="#A50013" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.5 4.98334C14.725 4.70834 11.9333 4.56668 9.15 4.56668C7.5 4.56668 5.85 4.65001 4.2 4.81668L2.5 4.98334" />
        <path d="M7.08333 4.14167L7.26667 3.05C7.4 2.25833 7.5 1.66667 8.90833 1.66667H11.0917C12.5 1.66667 12.6083 2.29167 12.7333 3.05833L12.9167 4.14167" />
        <path d="M15.7083 7.61668L15.1666 16.0083C15.0749 17.3167 14.9999 18.3333 12.6749 18.3333H7.32492C4.99992 18.3333 4.92492 17.3167 4.83325 16.0083L4.29159 7.61668" />
        <path d="M8.6084 13.75H11.3834" />
        <path d="M7.91667 10.4167H12.0833" />
      </g>
    </svg>
  );
}

export function HomeIcon({ size = 20, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M3.7 10.4L12 3.5l8.3 6.9c.45.38.7.94.7 1.53V19a2 2 0 0 1-2 2h-3.5a.5.5 0 0 1-.5-.5V16a1.5 1.5 0 0 0-1.5-1.5h-3A1.5 1.5 0 0 0 9 16v4.5a.5.5 0 0 1-.5.5H5a2 2 0 0 1-2-2v-7.07c0-.59.25-1.15.7-1.53z" />
    </svg>
  );
}

export function LocationIcon({ size = 20, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2a8 8 0 0 0-8 8c0 5.25 6.6 11.2 7.36 11.86a1 1 0 0 0 1.28 0C13.4 21.2 20 15.25 20 10a8 8 0 0 0-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" />
    </svg>
  );
}

export function BuildingIcon({ size = 20, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 3h11a2 2 0 0 1 2 2v15h2a.75.75 0 0 1 0 1.5H3A.75.75 0 0 1 3 20h2V5a2 2 0 0 1 2-2zm2.5 4.25a.75.75 0 0 0 0 1.5h2a.75.75 0 0 0 0-1.5h-2zm4.5 0a.75.75 0 0 0 0 1.5h2a.75.75 0 0 0 0-1.5h-2zM7.5 11a.75.75 0 0 0 0 1.5h2a.75.75 0 0 0 0-1.5h-2zm4.5 0a.75.75 0 0 0 0 1.5h2a.75.75 0 0 0 0-1.5h-2zM10 15a1.5 1.5 0 0 0-1.5 1.5V20h5v-3.5A1.5 1.5 0 0 0 12 15h-2z" />
    </svg>
  );
}

export function PencilIcon({ size = 14, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12.3 2.7a1.4 1.4 0 0 1 2 2L5.4 13.6 2 14l.4-3.4 9.9-7.9z" />
    </svg>
  );
}

export function CalendarIcon({ size = 16, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="3.5" width="12" height="11" rx="1.5" />
      <path d="M2 7h12" />
      <path d="M5.5 2v3M10.5 2v3" />
    </svg>
  );
}

// Danger — exact path from Figma vuesax/linear/danger (public/account/icon-danger.svg).
// Used by the "can't delete default card" error toast, where it sits on the
// red background — stroke is hardcoded white to match.
export function DangerIcon({ size = 20, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <g stroke="#ffffff" strokeWidth="1.08333" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 7.5V11.6667" />
        <path d="M9.99994 17.8417H4.94994C2.05828 17.8417 0.849944 15.775 2.24994 13.25L4.84994 8.56669L7.29994 4.16669C8.78328 1.49169 11.2166 1.49169 12.6999 4.16669L15.1499 8.57502L17.7499 13.2584C19.1499 15.7834 17.9333 17.85 15.0499 17.85H9.99994V17.8417Z" />
        <path d="M9.99552 14.1667H10.003" />
      </g>
    </svg>
  );
}

export function PlusIcon({ size = 12, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 1.5v9M1.5 6h9" />
    </svg>
  );
}

// Brand "logo" glyphs — purely visual stand-ins. Same approach as inlining
// the rest of the icons: the Figma file uses cropped marketing logos at
// signed URLs that would expire in 7 days.
export function BrandTile({ brand }) {
  if (brand === "visa") {
    return (
      <div
        className="flex h-8 w-8 items-center justify-center rounded-[4px] bg-[#f0f0f0]"
        aria-hidden="true"
      >
        <span
          className="font-display text-[8px] font-bold leading-none"
          style={{ color: "#1a1f71", letterSpacing: "0.3px" }}
        >
          VISA
        </span>
      </div>
    );
  }
  if (brand === "mastercard") {
    return (
      <div
        className="relative flex h-8 w-8 items-center justify-center rounded-[4px] bg-[#f0f0f0]"
        aria-hidden="true"
      >
        <span
          className="absolute h-[14px] w-[14px] rounded-full"
          style={{ background: "#eb001b", left: 6, top: 9 }}
        />
        <span
          className="absolute h-[14px] w-[14px] rounded-full"
          style={{ background: "#f79e1b", right: 6, top: 9, mixBlendMode: "multiply" }}
        />
      </div>
    );
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-[4px] bg-[#f0f0f0]" aria-hidden="true" />
  );
}

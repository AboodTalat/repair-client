// Shared "COMING SOON" tag for storefront nav surfaces (sidebar drilldown +
// navbar dropdowns). Coming-soon categories/sub-categories are rendered greyed
// and non-clickable with this label to the right — matching the Figma
// "coming soon" methodology without redesigning the nav itself.
//
// `className` overrides the color/size per surface (e.g. light text on the
// dark landing nav).
export default function ComingSoonTag({ className = "" }) {
  return (
    <span
      className={
        "shrink-0 font-body text-[11px] font-medium uppercase tracking-[1px] text-[#9ca3af] " +
        className
      }
    >
      Coming soon
    </span>
  );
}

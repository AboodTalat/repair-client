"use client";

import { useEffect } from "react";

// Confirmation toast shown after a new payment method is added — Figma 79:3555.
// Dark #11191f full-width slab that drops in below the sticky shop header,
// 12px padding, drop-shadow 0/4/5 rgba(0,0,0,0.25), 14px Zalando Expanded
// Medium white text, left-aligned. Auto-dismisses after 3s — same pattern as
// AddedToCartBanner.

export default function CardAddedBanner({ visible, onDismiss }) {
  useEffect(() => {
    if (!visible) return undefined;
    const t = setTimeout(() => onDismiss?.(), 3000);
    return () => clearTimeout(t);
  }, [visible, onDismiss]);

  if (!visible) return null;

  // `fixed` rather than `sticky` because AccountClient lives inside the
  // page's padded container — sticky would inherit the padding. The toast
  // is meant to overlay the page top (Figma 79:3555 sits at top:110 over
  // the ACCOUNT heading), so overlaying is faithful to the design.
  return (
    <div
      role="status"
      aria-live="polite"
      className="card-added-banner fixed inset-x-0 top-[64px] z-30 flex items-center px-3 py-3 text-white md:top-[80px]"
      style={{
        backgroundColor: "#11191F",
        boxShadow: "0px 4px 5px rgba(0,0,0,0.25)",
      }}
    >
      <span className="font-display text-[14px] font-medium uppercase">
        Card Added Successfully
      </span>
    </div>
  );
}

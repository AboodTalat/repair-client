"use client";

import { useEffect } from "react";

// Confirmation toast shown after an address is removed — mirrors CardDeletedBanner.
// Same dark slab chrome; only the copy differs. Auto-dismisses after 3s.

export default function AddressDeletedBanner({ visible, onDismiss }) {
  useEffect(() => {
    if (!visible) return undefined;
    const t = setTimeout(() => onDismiss?.(), 3000);
    return () => clearTimeout(t);
  }, [visible, onDismiss]);

  if (!visible) return null;

  // Background set inline (Tailwind v4 + Turbopack drops arbitrary `bg-[#hex]`
  // on conditionally-rendered components — see feedback-repair-tailwind-arbitrary-bg).
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
        Address Deleted
      </span>
    </div>
  );
}

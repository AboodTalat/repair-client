"use client";

import { useEffect } from "react";
import { DangerIcon } from "./AccountIcons";

// Error toast shown when the user taps the trash on a default payment method.
// Figma 79:2860. Red #a50013 full-width slab below the shop header, 12px
// padding, drop-shadow 0/4/5 rgba(0,0,0,0.25), 12px gap. White danger icon
// (vuesax/linear/danger) on the left; bold title + medium subtitle stacked.
// Auto-dismisses after 4s — slightly longer than the success toast because
// users need to read two lines of copy.

export default function CannotDeleteDefaultBanner({ visible, onDismiss, kind = "card" }) {
  useEffect(() => {
    if (!visible) return undefined;
    const t = setTimeout(() => onDismiss?.(), 4000);
    return () => clearTimeout(t);
  }, [visible, onDismiss]);

  if (!visible) return null;

  // `fixed` instead of `sticky` for the same reason as CardAddedBanner —
  // AccountClient is nested inside the page's padded container.
  //
  // Background color set inline because Tailwind v4 + Turbopack sometimes
  // drops arbitrary `bg-[#hex]` classes inside conditionally-rendered
  // components (see the gotcha in repair/CLAUDE.md — same reason the DELETE
  // CARD button in DeleteCardDrawer is inline-styled).
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="card-added-banner fixed inset-x-0 top-[64px] z-30 flex items-center gap-3 px-3 py-3 md:top-[80px]"
      style={{
        backgroundColor: "#A50013",
        boxShadow: "0px 4px 5px rgba(0,0,0,0.25)",
      }}
    >
      <DangerIcon size={20} className="shrink-0" />
      <div className="flex flex-col gap-[2px]">
        <span className="font-display text-[10px] font-bold uppercase leading-none text-white">
          You can&apos;t delete your default {kind}
        </span>
        <span
          className="font-display text-[10px] leading-tight text-white"
          style={{ opacity: 0.8, fontWeight: 500 }}
        >
          Add another {kind} to be able to delete the default one
        </span>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";

// Slim banner that drops in below the shop header when an item is added.
// Matches Figma frame 120:7466 ("ITEM ADDED TO CART").

export default function AddedToCartBanner({ visible, onDismiss }) {
  useEffect(() => {
    if (!visible) return undefined;
    const t = setTimeout(() => onDismiss?.(), 3000);
    return () => clearTimeout(t);
  }, [visible, onDismiss]);

  if (!visible) return null;

  return (
    <div className="sticky top-[80px] z-20 flex w-full items-center justify-center border-y border-[#11191f] bg-[#11191f] py-3 text-white">
      <span className="font-display text-[12px] font-medium uppercase tracking-[0.15em]">
        Item Added to Cart
      </span>
    </div>
  );
}

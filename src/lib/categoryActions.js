"use server";

import { revalidateTag } from "next/cache";
import { CATEGORY_CACHE_TAG } from "@/lib/storeNav";

// Server action invoked from the admin Categories page after any category
// mutation (create / update / delete / reorder / visibility / coming-soon).
// It busts the cached storefront category-tree fetch so the change shows up on
// the next storefront refresh instead of waiting out the ISR revalidate window.
// Safe to call best-effort — revalidateTag is idempotent and never throws on a
// cold cache.
export async function revalidateStorefrontCategories() {
  revalidateTag(CATEGORY_CACHE_TAG);
}

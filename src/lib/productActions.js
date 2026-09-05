"use server";

import { revalidateTag } from "next/cache";
import { PRODUCT_CACHE_TAG } from "@/lib/shopCatalog";

// Server action invoked from the admin Products page after any product-affecting
// mutation (product create / update / delete, variant + image sync, material /
// collection / category assignment, visibility toggle).
//
// The storefront's product reads (grid, detail, related, facet options) are ISR
// cached for STOREFRONT_REVALIDATE seconds. Without this bust, an admin who
// saved an edit and reloaded the storefront kept seeing the OLD copy for the
// rest of the window no matter how many times they refreshed — the cache is
// server-side, so a browser reload never reaches past it.
//
// Best-effort: revalidateTag is idempotent and never throws on a cold cache.
export async function revalidateStorefrontProducts() {
  revalidateTag(PRODUCT_CACHE_TAG);
}

import { repairQuery } from "@/lib/repairApi";

// Server-side read of the storefront CMS content map (admin-editable on
// /r3pr-console/storefront via myAppAdminUpdateStorefrontContent). The landing
// page overlays these values onto its built-in defaults, so:
//   - CMS ships EMPTY (no rows) → this returns {} → every section falls back to
//     its current hardcoded value → the landing renders byte-identical to today.
//   - When an admin saves a section, only the fields they set override; the
//     design (layout / styling / markup) is unchanged — only the content moves.
//
// Cached with a short ISR window so admin edits surface within the window
// without hammering the backend on every landing hit (mirrors shopCatalog.js).
// Any failure degrades to {} — the landing never breaks on a CMS outage.
export async function fetchStorefrontContent() {
  try {
    const res = await repairQuery("myAppGetStorefrontContent", {}, { revalidate: 60 });
    return res && typeof res === "object" ? res : {};
  } catch {
    return {};
  }
}

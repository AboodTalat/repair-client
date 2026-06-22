import { repairQuery } from "@/lib/repairApi";

// Server-side read of the storefront CMS content map (admin-editable on
// /r3pr-console/storefront via myAppAdminUpdateStorefrontContent). The landing
// page overlays these values onto its built-in defaults, so:
//   - CMS ships EMPTY (no rows) → this returns {} → every section falls back to
//     its current hardcoded value → the landing renders byte-identical to today.
//   - When an admin saves a section, only the fields they set override; the
//     design (layout / styling / markup) is unchanged — only the content moves.
//
// Uncached (`revalidate: 0`) so a page refresh always reflects the admin's
// latest saved content — no waiting out an ISR window after a Save. The CMS
// changes rarely and the payload is small, so the per-request backend hit is
// cheap. Any failure degrades to {} — the landing never breaks on a CMS outage.
export async function fetchStorefrontContent() {
  try {
    const res = await repairQuery("myAppGetStorefrontContent", {}, { revalidate: 0 });
    return res && typeof res === "object" ? res : {};
  } catch {
    return {};
  }
}

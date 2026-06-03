import { cache } from "react";
import { repairQuery } from "@/lib/repairApi";
import { CATEGORY_CACHE_TAG } from "@/lib/storeNav";
import {
  DEFAULT_CRAFTED_TO_LAST,
  normalizeCraftedToLast,
} from "@/lib/craftedToLast";

// Server-side storefront catalogue reads. This is the live counterpart to the
// mock helpers in `mockShop.js`: it talks to the `repair` sub-server's
// `myAppListProducts` / `myAppGetProductDetail` resolvers and shapes their
// responses into the exact prop shapes the storefront components already
// consume (ProductCard + ProductPageClient), so the UI never changes.
//
// Policy mirrors `storeNav.js`: NO hardcoded fallback catalogue. A failed or
// empty fetch yields [] (grid) / null (detail) rather than inventing products.
// Facet filtering (size / color / material / type / price) is intentionally
// NOT applied here yet — that lands with the filtration phase; for now the grid
// is scoped by category only.

// Used only when a product genuinely has no image yet, so next/image never
// renders a broken box. Real products serve UploadThing URLs.
const PLACEHOLDER_IMAGE = "/shop/model-1.png";

// Wire item (myAppListProducts) → ProductCard prop shape.
//   subtitle  ← products.material (stores the subtitle / composition string)
//   salePrice ← effective_price only when an active discount lowered the price
//   colors    ← distinct variant swatch hexes (added to the list resolver)
function mapListItemToCard(item) {
  const price = Number(item.base_price);
  const effective = Number(item.effective_price);
  const salePrice = Number.isFinite(effective) && effective < price ? effective : null;
  return {
    id: item.id,
    name: item.name,
    subtitle: item.material || "",
    price,
    salePrice,
    currency: "JOD",
    colors: Array.isArray(item.colors) ? item.colors : [],
    // Per-color image lists for the card's swatch picker + swipe carousel.
    // Each entry: { hex, colorId, images: [url] }. Empty for products with no
    // variants — the card then falls back to the single `image` below.
    colorImages: (Array.isArray(item.color_images) ? item.color_images : [])
      .map((c) => ({
        hex: c.hex,
        colorId: c.color_id,
        images: (Array.isArray(c.images) ? c.images : []).filter(Boolean),
      }))
      .filter((c) => c.images.length > 0),
    image: item.primary_image?.url || PLACEHOLDER_IMAGE,
    labels: Array.isArray(item.labels) ? item.labels : [],
  };
}

// Fetch the storefront grid for a category. Pass the numeric ids resolved from
// the already-fetched category tree (so we don't fetch the tree twice). When
// neither id is given (e.g. the coming-soon blur background), returns a general
// slice of the catalogue.
//
// Facet filters are applied SERVER-SIDE (the list resolver accepts them):
//   colorIds / sizeIds / materialIds / subCategoryIds — id arrays resolved from
//   the display values the URL carries (see shop/page.js); minPrice / maxPrice —
//   numbers. The id mapping happens at the page boundary so the URL + the filter
//   drawer keep speaking human-readable values (hex / label / name).
//
// Returns { items, total } — `total` is the full filtered count (the resolver's
// COUNT over the same WHERE, ignoring limit/offset) so the page can paginate.
// `offset` (with `limit`) selects the page slice.
export async function fetchShopProducts({
  majorId,
  subId,
  colorIds,
  sizeIds,
  materialIds,
  subCategoryIds,
  minPrice,
  maxPrice,
  limit = 24,
  offset = 0,
} = {}) {
  try {
    const variables = { limit };
    if (offset) variables.offset = Number(offset);
    if (subId) variables.subCategoryId = Number(subId);
    else if (majorId) variables.majorCategoryId = Number(majorId);
    if (Array.isArray(colorIds) && colorIds.length) variables.colorIds = colorIds;
    if (Array.isArray(sizeIds) && sizeIds.length) variables.sizeIds = sizeIds;
    if (Array.isArray(materialIds) && materialIds.length) variables.materialIds = materialIds;
    if (Array.isArray(subCategoryIds) && subCategoryIds.length) variables.subCategoryIds = subCategoryIds;
    if (minPrice != null) variables.minPrice = Number(minPrice);
    if (maxPrice != null) variables.maxPrice = Number(maxPrice);
    // revalidate: 0 → no ISR data cache. The storefront must reflect admin
    // product edits / stock changes on the very next normal refresh, not after
    // the 5-minute default window. The pages are already dynamic, so this only
    // costs one live backend call per load.
    const res = await repairQuery("myAppListProducts", variables, { revalidate: 0 });
    const items = Array.isArray(res?.items) ? res.items : [];
    const mapped = items.map(mapListItemToCard);
    const total = Number.isFinite(Number(res?.total)) ? Number(res.total) : mapped.length;
    return { items: mapped, total };
  } catch {
    return { items: [], total: 0 };
  }
}

// Storefront filter-drawer facet options: the live colors / sizes / materials
// the catalogue actually uses, plus the catalogue's real price range. These are
// reference data that change rarely, so they're cached more aggressively than
// the product grid (revalidate 300 vs 0) and deduped per-request via React
// cache(). Each falls back to []/null on failure — the drawer then degrades to
// its static mock options for DISPLAY (the page's value→id mapping just yields
// no ids for an un-fetched facet; the price slider falls back to its static
// range when bounds are missing/degenerate).
//   colors     → [{ id, name, hex }]  (only colors that actually carry a hex)
//   sizes      → [{ id, name }]       (sorted by sort_order on the server)
//   materials  → [{ id, name }]
//   priceRange → { min, max } | null  (MIN/MAX base_price across visible products)
export const fetchShopFacets = cache(async () => {
  const [colorsRes, sizesRes, materialsRes, priceRes] = await Promise.all([
    repairQuery("myAppListColors", {}, { revalidate: 300 }).catch(() => null),
    repairQuery("myAppListSizes", {}, { revalidate: 300 }).catch(() => null),
    repairQuery("myAppListMaterials", {}, { revalidate: 300 }).catch(() => null),
    repairQuery("myAppGetPriceRange", {}, { revalidate: 300 }).catch(() => null),
  ]);

  const colors = (Array.isArray(colorsRes?.items) ? colorsRes.items : [])
    .filter((c) => c?.hex_code)
    .map((c) => ({ id: Number(c.id), name: c.name, hex: c.hex_code }));
  const sizes = (Array.isArray(sizesRes?.items) ? sizesRes.items : [])
    .map((s) => ({ id: Number(s.id), name: s.name }));
  const materials = (Array.isArray(materialsRes?.items) ? materialsRes.items : [])
    .map((m) => ({ id: Number(m.id), name: m.name }));

  // Only surface a usable range — a degenerate min>=max (empty catalogue, or a
  // single-price catalogue) is dropped so the drawer keeps its static fallback.
  const pMin = Number(priceRes?.min);
  const pMax = Number(priceRes?.max);
  const priceRange =
    Number.isFinite(pMin) && Number.isFinite(pMax) && pMax > pMin
      ? { min: pMin, max: pMax }
      : null;

  return { colors, sizes, materials, priceRange };
});

// Resolve a sub-category's parent major from the cached category tree. Needed
// for related-product broadening: a sub-primary product carries a NULL
// `major_category_id` (migration 0010), so the only way to widen "Complete Your
// Set" up to the whole major is to look the parent up. Same cached/tagged tree
// fetch the nav uses, so this is a warm-cache hit in practice. Returns null on
// any miss — callers must degrade to whatever the sub query already found.
async function resolveParentMajorId(subId) {
  try {
    const tree = await repairQuery(
      "myAppListCategoriesTree",
      {},
      { tags: [CATEGORY_CACHE_TAG] }
    );
    if (!Array.isArray(tree)) return null;
    for (const major of tree) {
      const subs = Array.isArray(major.sub_categories) ? major.sub_categories : [];
      if (subs.some((s) => Number(s.id) === Number(subId))) return Number(major.id);
    }
  } catch {
    /* tree unreachable — caller keeps the sub-only results */
  }
  return null;
}

// Related products for the product-detail page ("Complete Your Set"), capped at
// 4 and excluding the product itself. Swatches come for free now that the list
// resolver carries `colors`.
//
// Strategy: pull the closest matches first (same primary sub-category), then
// BROADEN to the parent major to fill any remaining slots — so a product whose
// sub-category has few siblings still surfaces complementary pieces from the
// wider category instead of a thin/empty row. A major-primary product
// (migration 0010: sub NULL, major set) skips straight to the major. The major
// pass is purely ADDITIVE — if the parent can't be resolved it's a no-op and we
// keep whatever the sub pass returned.
const RELATED_LIMIT = 4;

async function fetchRelatedProducts(detail) {
  const subId = Number(detail.sub_category_id);
  const majorId = Number(detail.major_category_id);
  const selfId = Number(detail.id);

  const seen = new Set([selfId]);
  const out = [];

  // Pull a list slice, append unseen items (excluding self) up to the cap.
  const collect = async (vars) => {
    if (out.length >= RELATED_LIMIT) return;
    try {
      const res = await repairQuery(
        "myAppListProducts",
        { ...vars, limit: 12 },
        { revalidate: 0 }
      );
      const items = Array.isArray(res?.items) ? res.items : [];
      for (const it of items) {
        const id = Number(it.id);
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(mapListItemToCard(it)); // cards render hex strings directly
        if (out.length >= RELATED_LIMIT) break;
      }
    } catch {
      /* one pass failed — keep whatever the other pass found */
    }
  };

  // 1) Closest: same primary sub-category.
  if (Number.isFinite(subId) && subId > 0) {
    await collect({ subCategoryId: subId });
  }

  // 2) Broaden to the parent major to fill remaining slots.
  if (out.length < RELATED_LIMIT) {
    let resolvedMajorId =
      Number.isFinite(majorId) && majorId > 0 ? majorId : null;
    if (resolvedMajorId == null && Number.isFinite(subId) && subId > 0) {
      resolvedMajorId = await resolveParentMajorId(subId);
    }
    if (resolvedMajorId != null) {
      await collect({ majorCategoryId: resolvedMajorId });
    }
  }

  return out;
}

// Wire blob (myAppGetProductDetail) → ProductPageClient `product` prop shape.
// `lowStockThreshold` is the store-wide setting (commerce settings → inventory)
// and drives the product-page low-stock banner: 0 = banner off.
function mapDetailToProduct(p, related, lowStockThreshold = 0) {
  const price = Number(p.base_price);
  const effective = Number(p.effective_price);
  const salePrice = Number.isFinite(effective) && effective < price ? effective : null;

  const variants = Array.isArray(p.variants) ? p.variants : [];
  const totalStock = variants.reduce((sum, v) => sum + Number(v.quantity || 0), 0);

  // Per-color-per-size remaining stock so the banner can reflect the selected
  // size's variant. Keyed [colorId][sizeName] — the client tracks selectedSize
  // as the size *name*, so we resolve size_id → name from the sizes list while
  // building it. Color id keys are plain-object keys (number/string agnostic).
  const sizeNameById = {};
  (Array.isArray(p.sizes) ? p.sizes : []).forEach((s) => {
    sizeNameById[s.id] = s.name;
  });
  const stockByColorSize = {};
  // Parallel map [colorId][sizeName] → variant id, so the product page can
  // resolve the exact variant a shopper selected — needed by the "Notify when
  // available" stock-alert subscribe, which is keyed per variant on the server.
  const variantIdByColorSize = {};
  variants.forEach((v) => {
    const sizeName = sizeNameById[v.size_id];
    if (sizeName == null) return;
    const cid = v.color_id;
    if (!stockByColorSize[cid]) stockByColorSize[cid] = {};
    stockByColorSize[cid][sizeName] = Number(v.quantity) || 0;
    if (!variantIdByColorSize[cid]) variantIdByColorSize[cid] = {};
    variantIdByColorSize[cid][sizeName] = Number(v.id);
  });

  // Group images by color so the detail gallery can switch with the selected
  // swatch — mirrors the admin's two image methodologies:
  //   • per-color  → each color_id has its own images.
  //   • shared     → all images carry color_id null and live in `sharedImages`.
  // `imagesByColor` is a plain object (keyed by color id) so number / string
  // ids resolve to the same key (Sequelize BIGINT can arrive as a string).
  // `images` keeps the full flat list as the final fallback.
  const rawImages = Array.isArray(p.images) ? p.images : [];
  const imagesByColor = {};
  const sharedImages = [];
  const flatImages = [];
  rawImages.forEach((img) => {
    const url = img?.url;
    if (!url) return;
    flatImages.push(url);
    if (img.color_id == null) {
      sharedImages.push(url);
    } else {
      const cid = img.color_id;
      if (!imagesByColor[cid]) imagesByColor[cid] = [];
      imagesByColor[cid].push(url);
    }
  });

  return {
    id: p.id,
    slug: String(p.id),
    name: p.name,
    subtitle: p.material || "",
    description: (p.description || "").trim(),
    price,
    salePrice,
    currency: "JOD",
    // `outOfStock` stays product-total (drives the Buy Now / Out of Stock CTA).
    outOfStock: totalStock <= 0,
    itemsLeft: totalStock,
    // Store-wide low-stock banner inputs: the threshold (0 = off) + the
    // per-color-per-size remaining stock the banner reflects after a size pick.
    lowStockThreshold: Number(lowStockThreshold) || 0,
    stockByColorSize,
    variantIdByColorSize,
    labels: Array.isArray(p.labels) ? p.labels : [],
    images: flatImages.length ? flatImages : [PLACEHOLDER_IMAGE],
    // Per-color image map + the shared (null-color) set drive the gallery's
    // color-aware switching in ProductPageClient.
    imagesByColor,
    sharedImages,
    colors: (Array.isArray(p.colors) ? p.colors : []).map((c) => ({
      id: c.id,
      name: c.name,
      hex: c.hex_code,
    })),
    sizes: (Array.isArray(p.sizes) ? p.sizes : []).map((s) => s.name),
    // "Crafted to Last" stats — admin-editable per product. The server already
    // defaults a never-edited product to the canonical rows; the local fallback
    // covers the pre-migration window where the field may be absent.
    craftedToLast: (() => {
      const rows = normalizeCraftedToLast(p.crafted_to_last);
      return rows.length ? rows : DEFAULT_CRAFTED_TO_LAST;
    })(),
    relatedProducts: related,
  };
}

// Single product detail. `slug` is the product id (storefront links are
// `/products/<id>`). Wrapped in React `cache()` so the page and its
// generateMetadata share one POST per request instead of two. Returns null for
// a non-numeric slug, a missing/hidden product, or any fetch failure — the page
// renders its inline not-found state off that.
export const fetchProductDetail = cache(async (slug) => {
  const productId = Number(slug);
  if (!Number.isFinite(productId)) return null;
  try {
    // Detail + store-wide settings in parallel — the inventory threshold drives
    // the low-stock banner. Settings failure degrades to 0 (banner off), never
    // blocks the page.
    const [detail, settings] = await Promise.all([
      repairQuery("myAppGetProductDetail", { productId }, { revalidate: 0 }),
      repairQuery("myAppGetCommerceSettings", {}, { revalidate: 0 }).catch(() => null),
    ]);
    if (!detail || detail.id == null) return null;
    const related = await fetchRelatedProducts(detail);
    const lowStockThreshold = Number(settings?.inventory?.low_stock_threshold) || 0;
    return mapDetailToProduct(detail, related, lowStockThreshold);
  } catch {
    return null;
  }
});

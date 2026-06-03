import { fetchShopCategories, findShopCategory, typesFromTree } from "@/lib/storeNav";
import { fetchShopProducts, fetchShopFacets } from "@/lib/shopCatalog";
import CategoryPicker from "@/components/customer/shop/CategoryPicker";
import ShopPageClient from "@/components/customer/shop/ShopPageClient";

// `/shop` route. Query params:
//   ?category=<slug>            required to see products; without it we
//                               render the category picker so the user
//                               always commits to a major category first.
//   ?sub=<slug>                 optional sub-category filter
//   ?sizes,?colors,?materials,?types  comma-separated filter values (the filter
//                               drawer's facets — see parseFilters). Stored as
//                               human-readable values (size label / color hex /
//                               material name / sub-category name); mapped to
//                               backend ids below before the product fetch.
//   ?min,?max                   price band
//   ?empty=1                    debug flag — force the empty state
//   ?comingSoon=1               debug flag — force the coming-soon overlay
//
// Coming-soon overlay (Figma 198:5080) is rendered when:
//   - The major category slug is unknown (cat lookup fails)
//   - The sub-category slug is unknown for the matched major category
//   - The matched sub-category is explicitly hidden (visible === false)
// In any of those cases we still render ShopPageClient with a placeholder
// product list so the blurred grid background looks populated.

// Products per page. 24 fills the grid evenly (4-col desktop = 6 rows, 2-col
// mobile = 12 rows) and stays under the resolver's 100-item limit cap.
const PAGE_SIZE = 24;

export default async function ShopPage({ searchParams }) {
  const sp = await searchParams;
  const category = sp?.category;
  const sub = sp?.sub;

  // Live category tree + filter-drawer facet options from the `repair`
  // sub-server, in parallel. No hardcoded fallback — an empty/unreachable
  // backend yields [] (categories) / empty facet arrays.
  const [categories, facets] = await Promise.all([
    fetchShopCategories(),
    fetchShopFacets(),
  ]);

  if (!category) {
    return <CategoryPicker categories={categories} />;
  }

  const cat = findShopCategory(categories, category);

  // Determine whether to show the coming-soon overlay. It fires when the major
  // category is unknown or INACTIVE, or when the requested sub is unknown or
  // INACTIVE — inactive rows are present in the tree (active:false) precisely
  // so they render as "coming soon" teasers rather than a working grid.
  let comingSoon = Boolean(sp?.comingSoon);
  const displayName = cat?.name ?? slugToLabel(category);
  // Breadcrumb sub-segment — set whenever a ?sub= is present so the path reads
  // HOME / MAJOR / SUB. Falls back to a humanised slug for an unknown/inactive
  // sub so the crumb stays meaningful behind the coming-soon overlay.
  let subDisplayName = null;

  if (!cat || cat.active === false) {
    // Unknown or inactive major category — render the coming-soon overlay.
    comingSoon = true;
  } else if (sub) {
    const subMatch = cat.subs?.find((s) => s.slug === sub);
    if (!subMatch || subMatch.active === false) {
      comingSoon = true;
    }
  }

  if (sub) {
    const subMatch = cat?.subs?.find((s) => s.slug === sub);
    subDisplayName = subMatch?.name ?? slugToLabel(sub);
  }

  // ITEM TYPE filter facet = the live sub-categories across the tree.
  const types = typesFromTree(categories);

  const filters = parseFilters(sp);

  // Resolve the matched sub-category's numeric id (if any) so the product
  // query can scope by it. The category tree is already fetched above, so this
  // is a local lookup — no extra round-trip.
  let subId = null;
  if (sub && cat) {
    const subMatch = cat.subs?.find((s) => s.slug === sub);
    subId = subMatch?.id ?? null;
  }

  // Map the drawer's human-readable filter values to the backend ids the list
  // resolver filters on. Mapping at this boundary keeps the URL + drawer
  // speaking display values (hex / label / name) while the wire stays id-based.
  const filterIds = mapFiltersToIds(filters, facets, categories);

  // Pagination — page lives in ?page= (1-indexed), like every other browse-state
  // param on /shop. A bad/missing value resolves to page 1.
  const page = pageFromParam(sp?.page);

  // Live products from the `repair` sub-server (myAppListProducts). Three cases:
  //   - ?empty=1 debug flag → force the empty state (no fetch).
  //   - coming-soon overlay → fetch a small general slice purely to populate
  //     the blurred grid behind the overlay (capped at 8 — ComingSoonOverlay
  //     shows 8 on desktop / 4 on mobile so the centered overlay stays mid-view).
  //   - normal → scope by the resolved sub-category (preferred) or major id,
  //     plus the mapped facet filters (color/size/material/item-type/price), one
  //     PAGE_SIZE page at a time (offset = (page-1)*PAGE_SIZE). `total` is the
  //     full filtered count so the pagination control knows how many pages exist.
  let products = [];
  let total = 0;
  if (filters.simulateEmpty) {
    products = [];
    total = 0;
  } else if (comingSoon) {
    const res = await fetchShopProducts({ limit: 8 });
    products = res.items.slice(0, 8);
    total = products.length;
  } else {
    const res = await fetchShopProducts({
      majorId: cat?.id,
      subId,
      colorIds: filterIds.colorIds,
      sizeIds: filterIds.sizeIds,
      materialIds: filterIds.materialIds,
      subCategoryIds: filterIds.subCategoryIds,
      minPrice: filters.priceMin,
      maxPrice: filters.priceMax,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });
    products = res.items;
    total = res.total;
  }

  return (
    <ShopPageClient
      categoryName={displayName}
      subCategoryName={subDisplayName}
      products={products}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      filters={filters}
      typeOptions={types}
      colorOptions={facets.colors}
      sizeOptions={facets.sizes.map((s) => s.name)}
      materialOptions={facets.materials.map((m) => m.name)}
      priceRange={facets.priceRange}
      showComingSoon={comingSoon}
    />
  );
}

// Resolve the drawer's display-value selections to backend ids.
//   colors    : selected hexes      → color ids   (hex compared case-insensitively;
//                                      one hex may map to >1 color id)
//   sizes     : selected size labels → size ids
//   materials : selected names       → material ids
//   types     : selected sub names   → sub-category ids. typesFromTree dedupes
//               by name, so one pill ("Shirts" under both Women and Men) can map
//               to several sub ids — hence an array per name. Only ACTIVE subs
//               are mapped, mirroring typesFromTree's exclusion of inactive subs.
// Unknown values (e.g. a stale URL value not in the live facet set) map to
// nothing rather than erroring.
function mapFiltersToIds(filters, facets, categories) {
  const hexToIds = new Map();
  for (const c of facets.colors ?? []) {
    if (!c.hex) continue;
    const key = String(c.hex).toLowerCase();
    const arr = hexToIds.get(key) ?? [];
    arr.push(c.id);
    hexToIds.set(key, arr);
  }
  const sizeNameToId = new Map((facets.sizes ?? []).map((s) => [s.name, s.id]));
  const materialNameToId = new Map((facets.materials ?? []).map((m) => [m.name, m.id]));

  const typeNameToIds = new Map();
  for (const major of categories ?? []) {
    for (const subCat of major.subs ?? []) {
      if (subCat.active === false) continue;
      const arr = typeNameToIds.get(subCat.name) ?? [];
      arr.push(Number(subCat.id));
      typeNameToIds.set(subCat.name, arr);
    }
  }

  return {
    colorIds: dedupe(filters.colors.flatMap((h) => hexToIds.get(String(h).toLowerCase()) ?? [])),
    sizeIds: dedupe(filters.sizes.map((n) => sizeNameToId.get(n)).filter((v) => v != null)),
    materialIds: dedupe(filters.materials.map((n) => materialNameToId.get(n)).filter((v) => v != null)),
    subCategoryIds: dedupe(filters.types.flatMap((n) => typeNameToIds.get(n) ?? [])),
  };
}

function dedupe(arr) {
  return Array.from(new Set(arr));
}

// Parse ?page= into a 1-indexed page number; anything missing/invalid/<1 → 1.
function pageFromParam(raw) {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

function parseFilters(sp) {
  return {
    sizes: csv(sp?.sizes),
    colors: csv(sp?.colors),
    materials: csv(sp?.materials),
    types: csv(sp?.types),
    priceMin: numOrNull(sp?.min),
    priceMax: numOrNull(sp?.max),
    simulateEmpty: Boolean(sp?.empty),
  };
}

function csv(s) {
  if (!s) return [];
  return String(s)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function numOrNull(s) {
  if (s == null || s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// "just-dropped" → "Just Dropped" — used as a breadcrumb fallback when we
// don't have a matching record for an unknown major/sub slug.
function slugToLabel(slug) {
  if (!slug) return "Discover All";
  return String(slug)
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

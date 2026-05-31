import { listProducts } from "@/lib/mockShop";
import { fetchShopCategories, findShopCategory, typesFromTree } from "@/lib/storeNav";
import CategoryPicker from "@/components/customer/shop/CategoryPicker";
import ShopPageClient from "@/components/customer/shop/ShopPageClient";

// `/shop` route. Query params:
//   ?category=<slug>            required to see products; without it we
//                               render the category picker so the user
//                               always commits to a major category first.
//   ?sub=<slug>                 optional sub-category filter
//   ?sizes,?colors,?fits,?types comma-separated filter values
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

export default async function ShopPage({ searchParams }) {
  const sp = await searchParams;
  const category = sp?.category;
  const sub = sp?.sub;

  // Live category tree from the `repair` sub-server (myAppListCategoriesTree,
  // with includeInactive so inactive categories/subs come back flagged). No
  // hardcoded fallback — an empty/unreachable backend yields [].
  const categories = await fetchShopCategories();

  if (!category) {
    return <CategoryPicker categories={categories} />;
  }

  const cat = findShopCategory(categories, category);

  // Determine whether to show the coming-soon overlay. It fires when the major
  // category is unknown or INACTIVE, or when the requested sub is unknown or
  // INACTIVE — inactive rows are present in the tree (active:false) precisely
  // so they render as "coming soon" teasers rather than a working grid.
  let comingSoon = Boolean(sp?.comingSoon);
  let displayName = cat?.name ?? slugToLabel(category);

  if (!cat || cat.active === false) {
    // Unknown or inactive major category — render the coming-soon overlay.
    comingSoon = true;
  } else if (sub) {
    const subMatch = cat.subs?.find((s) => s.slug === sub);
    if (!subMatch || subMatch.active === false) {
      comingSoon = true;
      // Keep the breadcrumb meaningful with the sub's name (or slug label).
      displayName = subMatch?.name ?? slugToLabel(sub);
    }
  }

  // ITEM TYPE filter facet = the live sub-categories across the tree.
  const types = typesFromTree(categories);

  const filters = parseFilters(sp);
  // When the overlay is on we still want a grid behind it. If the real
  // category/sub doesn't have products (because the slug was bogus), fall
  // back to the discover-all pool so the grayscale background looks right.
  // Cap at 8 cards — ComingSoonOverlay shows all 8 on desktop (2 rows x 4
  // cols) and the first 4 on mobile (2 rows x 2 cols), so the centered
  // overlay stays in the visual middle of the viewport at both sizes.
  let products = listProducts({ category, sub, filters });
  if (comingSoon) {
    if (products.length === 0) {
      products = listProducts({ category: "discover-all" });
    }
    products = products.slice(0, 8);
  }

  return (
    <ShopPageClient
      categoryName={displayName}
      products={products}
      filters={filters}
      typeOptions={types}
      showComingSoon={comingSoon}
    />
  );
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

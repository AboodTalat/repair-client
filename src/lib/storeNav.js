import { repairQuery } from "@/lib/repairApi";

// Cache tag for the category-tree fetches. The admin Categories page busts this
// (via the revalidateStorefrontCategories server action) after any category
// mutation so the storefront nav reflects the change on the next refresh
// instead of waiting out the ISR revalidate window.
export const CATEGORY_CACHE_TAG = "repair-categories";

// Centralized navigation + footer data for the storefront.
// Both the customer layout (ShopHeader + ShopFooter) and the landing-page
// Header/Footer pull from here so the nav stays consistent across surfaces.
//
// Categories are fetched once on the server with `myAppListCategoriesTree`.
// We DON'T pass includeInactive: an inactive category (is_visible:false, shown
// in admin as "Active = off") is hidden from the storefront entirely. The
// teaser is now an explicit, separate flag: an ACTIVE category with
// `coming_soon: true` comes back and is mapped to `active: false` here so it
// surfaces as a "coming soon" teaser (the storefront already routes
// `active: false` rows to the coming-soon overlay). There is intentionally NO
// hardcoded fallback: if the backend returns nothing (empty or unreachable)
// the nav shows no categories rather than inventing fake ones.

function slugify(s) {
  return String(s ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// "coming soon" = active but flagged as a teaser. (Treat a missing flag as
// false so existing rows stay shoppable.)
function isComingSoon(row) {
  return row?.coming_soon === true;
}
// Shoppable = visible AND not a coming-soon teaser. A coming-soon category is
// returned but maps to active:false so every consumer that already treats
// active:false as "show a teaser / skip in shoppable lists" does the right
// thing without further changes.
function isShoppable(row) {
  return row?.is_visible !== false && !isComingSoon(row);
}

function shapeTree(tree) {
  return tree.map((major) => {
    const majorSlug = slugify(major.name);
    const subs = Array.isArray(major.sub_categories) ? major.sub_categories : [];
    return {
      id: major.id,
      label: major.name,
      href: `/shop?category=${majorSlug}`,
      active: isShoppable(major),
      comingSoon: isComingSoon(major),
      children: subs.map((sub) => ({
        id: sub.id,
        label: sub.name,
        href: `/shop?category=${majorSlug}&sub=${slugify(sub.name)}`,
        active: isShoppable(sub),
        comingSoon: isComingSoon(sub),
      })),
    };
  });
}

export async function fetchCategories() {
  try {
    // No includeInactive — inactive categories are hidden entirely; coming-soon
    // teasers are active rows flagged with coming_soon.
    const tree = await repairQuery("myAppListCategoriesTree", {}, { tags: [CATEGORY_CACHE_TAG] });
    if (!Array.isArray(tree) || tree.length === 0) return [];
    return shapeTree(tree);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Storefront /shop shaping
// ---------------------------------------------------------------------------
//
// The backend tree carries the *data* (which categories exist, their names,
// sub-categories, ordering, visibility) but not the *presentation* bits the
// shop tiles need — image + tagline. Those live in a slug-keyed decoration map
// here, with a safe default so an admin-added category never renders a broken
// <Image fill> or an empty tagline. Slugs are derived with the SAME `slugify`
// the nav uses, so /shop?category=<slug> links resolve against this shape.
//
// Coming-soon categories/subs (active rows flagged `coming_soon`) carry
// `active: false` so the storefront renders them as "coming soon" teasers —
// the shop page routes those to the coming-soon overlay. Truly inactive
// categories (is_visible:false) are not fetched and don't appear at all.

const CATEGORY_PRESENTATION = {
  "discover-all": { image: "/shop/model-1.png", tagline: "The full lineup, top to bottom." },
  sale: { image: "/shop/model-5.png", tagline: "Limited drops, discounted. Move fast." },
  "just-dropped": { image: "/shop/model-2.png", tagline: "Hot off the press. New every week." },
  women: { image: "/shop/model-3.png", tagline: "Built for movement. Worn for life." },
  men: { image: "/shop/model-4.png", tagline: "Engineered for performance." },
};

const DEFAULT_PRESENTATION = {
  image: "/shop/model-1.png",
  tagline: "Explore the collection.",
};

// Shape the raw tree into what the /shop surfaces (CategoryPicker tiles, the
// breadcrumb, the sub-category resolution) consume. Order is preserved as the
// resolver returns it (sorted by sort_order, id) — do not re-sort.
function shapeShopTree(tree) {
  return tree.map((major) => {
    const slug = slugify(major.name);
    const deco = CATEGORY_PRESENTATION[slug] ?? DEFAULT_PRESENTATION;
    const subs = Array.isArray(major.sub_categories) ? major.sub_categories : [];
    return {
      id: major.id,
      slug,
      name: major.name,
      tagline: deco.tagline,
      image: deco.image,
      active: isShoppable(major),
      comingSoon: isComingSoon(major),
      subs: subs.map((sub) => ({
        id: sub.id,
        slug: slugify(sub.name),
        name: sub.name,
        active: isShoppable(sub),
        comingSoon: isComingSoon(sub),
      })),
    };
  });
}

// Live category tree shaped for the storefront /shop page. Mirrors
// `fetchCategories` (same fetch, same no-fallback policy) so the nav and the
// shop never disagree on which categories exist or how their slugs are spelled.
export async function fetchShopCategories() {
  try {
    // No includeInactive — see fetchCategories.
    const tree = await repairQuery("myAppListCategoriesTree", {}, { tags: [CATEGORY_CACHE_TAG] });
    if (!Array.isArray(tree) || tree.length === 0) return [];
    return shapeShopTree(tree);
  } catch {
    return [];
  }
}

// Resolve a major category from an already-fetched shop tree by slug.
export function findShopCategory(categories, slug) {
  return categories.find((c) => c.slug === slug);
}

// De-duplicated set of sub-category names across all majors, in tree order —
// this is the customer-facing "ITEM TYPE" filter facet (sub-categories ARE the
// type facet on the storefront; there is no separate product-type taxonomy).
// Inactive subs are excluded: the filter narrows shoppable products, and a
// "coming soon" sub has none to narrow to.
export function typesFromTree(categories) {
  const seen = new Set();
  const out = [];
  for (const major of categories) {
    for (const sub of major.subs ?? []) {
      if (sub.active === false) continue;
      if (sub.name && !seen.has(sub.name)) {
        seen.add(sub.name);
        out.push(sub.name);
      }
    }
  }
  return out;
}

// Sidebar static items that bracket the dynamic categories — top items above
// the categories, account/cart items below them.
export const SIDEBAR_TOP = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
];

export const SIDEBAR_BOTTOM = [
  { label: "Orders", href: "/account/orders" },
  { label: "Wishlist", href: "/account/wishlist" },
  { label: "Account", href: "/account" },
  { label: "Cart", href: "/cart" },
];

// Footer Help column — destinations exist as real customer pages.
export const FOOTER_HELP_LINKS = [
  { label: "Shipping & Returns", href: "/contact" },
  { label: "FAQ", href: "/contact" },
  { label: "Size Guide", href: "/contact" },
  { label: "Contact Us", href: "/contact" },
  { label: "Track Order", href: "/account/orders" },
];

// Footer legal links — no dedicated pages yet; kept as hash anchors so the
// markup is consistent and easy to swap when the legal pages land.
export const FOOTER_LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/#privacy" },
  { label: "Terms of Service", href: "/#terms" },
  { label: "Cookies", href: "/#cookies" },
];

// Build the Shop column from the live category tree — active categories only
// (the footer is a shoppable-shortcut list, so coming-soon teasers are skipped).
// No hardcoded fallback: an empty tree yields an empty column rather than fake
// links to categories that don't exist.
export function footerShopLinks(categories) {
  if (!Array.isArray(categories)) return [];
  return categories
    .filter((cat) => cat.active !== false)
    .slice(0, 5)
    .map((cat) => ({ label: cat.label, href: cat.href }));
}

// The bottom items (Orders / Wishlist / Account / Cart) are user-scoped, so
// they only appear when the visitor is signed in. Guests see Home + Shop +
// the category tree only.
export function sidebarItems(categories, isAuthenticated = false) {
  return [
    ...SIDEBAR_TOP,
    ...(categories ?? []),
    ...(isAuthenticated ? SIDEBAR_BOTTOM : []),
  ];
}

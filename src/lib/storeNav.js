import { repairQuery } from "@/lib/repairApi";

// Centralized navigation + footer data for the storefront.
// Both the customer layout (ShopHeader + ShopFooter) and the landing-page
// Header/Footer pull from here so the nav stays consistent across surfaces.
//
// Categories are fetched once on the server with `myAppListCategoriesTree`
// (same as HeaderShell) — when the backend is unreachable, FALLBACK_CATEGORIES
// keeps the nav usable.

function slugify(s) {
  return String(s ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const FALLBACK_CATEGORIES = [
  {
    id: "fallback-women",
    name: "Women",
    sub_categories: [
      { id: "fb-w-tops", name: "Tops" },
      { id: "fb-w-leggings", name: "Leggings" },
      { id: "fb-w-shorts", name: "Shorts" },
      { id: "fb-w-hoodies", name: "Hoodies" },
      { id: "fb-w-bras", name: "Sports Bras" },
    ],
  },
  {
    id: "fallback-men",
    name: "Men",
    sub_categories: [
      { id: "fb-m-tops", name: "Tops" },
      { id: "fb-m-shorts", name: "Shorts" },
      { id: "fb-m-hoodies", name: "Hoodies" },
    ],
  },
  { id: "fallback-sale", name: "Sale", sub_categories: [] },
];

function shapeTree(tree) {
  return tree.map((major) => {
    const majorSlug = slugify(major.name);
    const subs = Array.isArray(major.sub_categories) ? major.sub_categories : [];
    return {
      id: major.id,
      label: major.name,
      href: `/shop?category=${majorSlug}`,
      children: subs.map((sub) => ({
        id: sub.id,
        label: sub.name,
        href: `/shop?category=${majorSlug}&sub=${slugify(sub.name)}`,
      })),
    };
  });
}

export async function fetchCategories() {
  try {
    const tree = await repairQuery("myAppListCategoriesTree", {});
    if (!Array.isArray(tree) || tree.length === 0) return shapeTree(FALLBACK_CATEGORIES);
    return shapeTree(tree);
  } catch {
    return shapeTree(FALLBACK_CATEGORIES);
  }
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

// Build the Shop column from the live category tree, falling back to a small
// curated set when categories haven't loaded.
export function footerShopLinks(categories) {
  if (Array.isArray(categories) && categories.length > 0) {
    return categories.slice(0, 5).map((cat) => ({
      label: cat.label,
      href: cat.href,
    }));
  }
  return [
    { label: "New Arrivals", href: "/shop?category=just-dropped" },
    { label: "Women", href: "/shop?category=women" },
    { label: "Men", href: "/shop?category=men" },
    { label: "Sale", href: "/shop?category=sale" },
    { label: "All Products", href: "/shop" },
  ];
}

export function sidebarItems(categories) {
  return [...SIDEBAR_TOP, ...(categories ?? []), ...SIDEBAR_BOTTOM];
}

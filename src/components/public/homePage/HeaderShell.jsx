import { repairQuery } from "@/lib/repairApi";
import Header from "./Header";

function slugify(s) {
  return String(s ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Dummy fallback so the nav renders even when the backend is unreachable.
// Real data comes from `myAppListCategoriesTree`; this only kicks in when
// the request fails or returns an empty tree.
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
  {
    id: "fallback-sale",
    name: "Sale",
    sub_categories: [],
  },
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

async function fetchCategories() {
  try {
    const tree = await repairQuery("myAppListCategoriesTree", {});
    if (!Array.isArray(tree) || tree.length === 0) return shapeTree(FALLBACK_CATEGORIES);
    return shapeTree(tree);
  } catch {
    return shapeTree(FALLBACK_CATEGORIES);
  }
}

export default async function HeaderShell() {
  const categories = await fetchCategories();
  return <Header categories={categories} />;
}

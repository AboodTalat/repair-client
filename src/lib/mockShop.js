// Mock data for the /shop page (no backend wiring yet).
// Each major category has its own product list; sub-categories filter within.
// Replace with `repairQuery("myAppListProducts", { category, ... })` once
// the storefront resolvers are ready.

const MODEL_IMAGES = [
  "/shop/model-1.png",
  "/shop/model-2.png",
  "/shop/model-3.png",
  "/shop/model-4.png",
  "/shop/model-5.png",
];

const SWATCH_PALETTES = {
  neutral: ["#ede9dd", "#232323", "#12013f", "#3e0000"],
  earth: ["#2d2d2d", "#5c2828", "#9ca3af"],
  bold: ["#1e3a8a", "#11191f", "#7f1d1d"],
  pastel: ["#f472b6", "#11191f", "#fbbf24"],
  mono: ["#11191f"],
  tri: ["#11191f", "#ffffff", "#fbbf24"],
};

function product(id, name, subtitle, price, swatchKey, sub, imageIdx = 0, salePrice = null) {
  return {
    id,
    name,
    subtitle,
    price,
    salePrice,
    currency: "JOD",
    colors: SWATCH_PALETTES[swatchKey] ?? SWATCH_PALETTES.neutral,
    sub,
    image: MODEL_IMAGES[imageIdx % MODEL_IMAGES.length],
  };
}

export const MAJOR_CATEGORIES = [
  {
    slug: "discover-all",
    name: "Discover All",
    tagline: "The full lineup, top to bottom.",
    image: "/shop/model-1.png",
    subs: [
      { slug: "tops", name: "Tops" },
      { slug: "bottoms", name: "Bottoms" },
      { slug: "outerwear", name: "Outerwear" },
      { slug: "accessories", name: "Accessories" },
    ],
  },
  {
    slug: "sale",
    name: "Sale",
    tagline: "Limited drops, discounted. Move fast.",
    image: "/shop/model-5.png",
    subs: [
      { slug: "all", name: "All Sale" },
      { slug: "men", name: "Men" },
      { slug: "women", name: "Women" },
    ],
  },
  {
    slug: "just-dropped",
    name: "Just Dropped",
    tagline: "Hot off the press. New every week.",
    image: "/shop/model-2.png",
    subs: [
      { slug: "weekly", name: "This week" },
      { slug: "monthly", name: "This month" },
    ],
  },
  {
    slug: "women",
    name: "Women",
    tagline: "Built for movement. Worn for life.",
    image: "/shop/model-3.png",
    subs: [
      { slug: "tops", name: "Tops" },
      { slug: "bottoms", name: "Bottoms" },
      { slug: "sets", name: "Sets" },
      { slug: "sports-bras", name: "Sports Bras" },
    ],
  },
  {
    slug: "men",
    name: "Men",
    tagline: "Engineered for performance.",
    image: "/shop/model-4.png",
    subs: [
      { slug: "tops", name: "Tops" },
      { slug: "shorts", name: "Shorts" },
      { slug: "pants", name: "Pants" },
      { slug: "hoodies", name: "Hoodies" },
    ],
  },
];

const ALL_PRODUCTS = [
  product(1, "Sweat Pants", "Soft Cotton", 30, "neutral", "bottoms", 0),
  product(2, "Performance Tank", "Dry Fit", 25, "bold", "tops", 0),
  product(3, "Training Shorts", "Lightweight", 30, "earth", "shorts", 0),
  product(4, "Core Tee", "Breathable", 30, "earth", "tops", 0),
  product(5, "Essential Hoodie", "Fleece Lined", 55, null, "hoodies", 0),
  product(6, "Graphic Tee", "Organic Cotton", 28, "mono", "tops", 0),
  product(7, "Active Tank", "Mesh Back", 22, "tri", "tops", 0),
  product(8, "Yoga Set", "High Stretch", 45, "pastel", "sets", 0),
  product(9, "Compression Tee", "Quick Dry", 32, "bold", "tops", 1),
  product(10, "Joggers", "Tapered Fit", 38, "neutral", "bottoms", 1),
  product(11, "Lightweight Hoodie", "Brushed Inside", 52, "mono", "hoodies", 1),
  product(12, "Run Short", "Stretch Woven", 28, "earth", "shorts", 1),
];

// Sale catalogue (matches Figma frame 7:244 — strikethrough original + blue
// discounted-price chip).
const SALE_PRODUCTS = [
  product(101, "Sweat Pants", "Soft Cotton", 30, "neutral", "men", 0, 15.99),
  product(102, "Sweat Pants", "Soft Cotton", 25, "neutral", "women", 0, 17.99),
  product(103, "Performance Tank", "Dry Fit", 35, "bold", "men", 0, 19.99),
  product(104, "Training Shorts", "Lightweight", 30, "earth", "men", 1, 14.99),
];

const BY_CATEGORY = {
  "discover-all": ALL_PRODUCTS,
  "just-dropped": ALL_PRODUCTS.slice(0, 8),
  women: ALL_PRODUCTS.filter((p) => ["tops", "bottoms", "sets", "sports-bras"].includes(p.sub)),
  men: ALL_PRODUCTS.filter((p) => ["tops", "shorts", "pants", "hoodies"].includes(p.sub)),
  sale: SALE_PRODUCTS,
};

export function getCategory(slug) {
  return MAJOR_CATEGORIES.find((c) => c.slug === slug);
}

export function listProducts({ category, sub, filters } = {}) {
  let pool = BY_CATEGORY[category] ?? [];
  if (sub) pool = pool.filter((p) => p.sub === sub);
  // `filters` is reserved for size/color/fit/type/price application — when
  // the count drops to 0 the page renders the empty state from the Figma.
  if (filters?.simulateEmpty) pool = [];
  return pool;
}

export const ACTIVE_FILTER_COUNT = (filters) => {
  if (!filters || filters.simulateEmpty) return filters?.simulateEmpty ? 4 : 0;
  let n = 0;
  for (const k of ["sizes", "colors", "materials", "types"]) {
    n += filters[k]?.length ?? 0;
  }
  if (filters.priceMin != null || filters.priceMax != null) n += 1;
  return n;
};

export const FILTER_OPTIONS = {
  sizes: ["S", "M", "L", "XL", "XXL"],
  numericSizes: ["36", "38", "40", "42", "44", "46", "48"],
  colors: [
    { name: "Cream",     hex: "#ede9dd" },
    { name: "Black",     hex: "#232323" },
    { name: "Navy",      hex: "#12013f" },
    { name: "Burgundy",  hex: "#3e0000" },
    { name: "Grey",      hex: "#9ca3af" },
    { name: "Lavender",  hex: "#a78bfa" },
    { name: "Orange",    hex: "#f97316" },
    { name: "Sage",      hex: "#9aac9b" },
    { name: "Butter",    hex: "#fbe7a6" },
    { name: "White",     hex: "#ffffff" },
  ],
  materials: ["Cotton", "Polyester", "Nylon", "Spandex"],
  types: ["Leggins", "T-Shirts", "Joggers", "Hoodies", "Sport Bras"],
  priceRange: [0, 200],
};

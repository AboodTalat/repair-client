import ProductPageClient from "@/components/customer/product/ProductPageClient";

const MOCK_PRODUCT = {
  id: "legging-78",
  slug: "legging-78",
  name: "Legging ⅞",
  subtitle: "80% nylon · 20% spandex",
  price: 30,
  salePrice: 15.99,
  // Stock state for the currently-selected variant. When the page is wired to
  // myAppGetProductDetail, derive these from the variants array (each variant
  // returns `quantity` + `low_stock_threshold` from catalog.ts):
  //   outOfStock      ← Number(variant.quantity) <= 0
  //   itemsLeft       ← Number(variant.quantity)
  //   lowStockLimit   ← Number(variant.low_stock_threshold)
  outOfStock: false,
  itemsLeft: 2,
  lowStockLimit: 5,
  currency: "JOD",
  labels: ["Best Seller", "Low Stock"],
  images: [
    "/shop/model-1.png",
    "/shop/model-2.png",
    "/shop/model-3.png",
    "/shop/model-4.png",
  ],
  colors: [
    { name: "White", hex: "#ffffff" },
    { name: "Linen", hex: "#ede9dd" },
    { name: "Charcoal", hex: "#232323" },
    { name: "Navy", hex: "#12013f" },
    { name: "Burgundy", hex: "#3e0000" },
  ],
  sizes: ["36", "38", "40", "42", "44", "46", "48"],
  relatedProducts: [
    {
      id: "sweat-pants-1",
      name: "Sweat Pants",
      subtitle: "Soft Cotton",
      price: 30,
      currency: "JOD",
      image: "/shop/model-4.png",
      colors: ["#ede9dd", "#232323", "#12013f", "#3e0000"],
    },
    {
      id: "sweat-pants-2",
      name: "Sweat Pants",
      subtitle: "Soft Cotton",
      price: 30,
      salePrice: 19.99,
      currency: "JOD",
      image: "/shop/model-5.png",
      colors: ["#ede9dd", "#232323", "#12013f", "#3e0000"],
    },
    {
      id: "sweat-pants-3",
      name: "Training Shorts",
      subtitle: "Lightweight",
      price: 30,
      currency: "JOD",
      image: "/shop/model-4.png",
      colors: ["#9ca3af", "#11191f", "#7f1d1d"],
    },
    {
      id: "sweat-pants-4",
      name: "Core Tee",
      subtitle: "Breathable",
      price: 30,
      currency: "JOD",
      image: "/shop/model-1.png",
      colors: ["#374151", "#11191f", "#991b1b"],
    },
  ],
};

export const metadata = {
  title: "Legging ⅞ | Repair",
  description:
    "80% recycled polyester, 20% elastane. Compression fit with four-way stretch for every workout.",
};

export default function ProductPage() {
  return <ProductPageClient product={MOCK_PRODUCT} />;
}

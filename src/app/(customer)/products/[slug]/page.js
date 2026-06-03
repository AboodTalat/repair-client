import Link from "next/link";
import ProductPageClient from "@/components/customer/product/ProductPageClient";
import { fetchProductDetail } from "@/lib/shopCatalog";

// Product detail route. The `[slug]` segment is the numeric product id
// (storefront links are `/products/<id>`). Data comes live from the `repair`
// sub-server's myAppGetProductDetail resolver, shaped by `fetchProductDetail`
// into the `product` prop ProductPageClient consumes. A non-numeric slug, a
// missing/hidden product, or a fetch failure all resolve to `null` and render
// the inline not-found state below (no crash, no 500).

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = await fetchProductDetail(slug);
  if (!product) return { title: "Product not found | Repair" };
  return {
    title: `${product.name} | Repair`,
    description: product.description
      ? product.description.slice(0, 160)
      : `${product.name} — shop the latest from Repair.`,
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const product = await fetchProductDetail(slug);

  if (!product) {
    return (
      <section className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <h1 className="font-display text-[22px] font-medium text-[#11191f] md:text-[28px]">
          PRODUCT NOT FOUND
        </h1>
        <p className="font-body text-[14px] text-[#666] md:text-[16px]" style={{ fontStretch: "75%" }}>
          This product may have been removed or is no longer available.
        </p>
        <Link
          href="/shop"
          className="mt-2 inline-flex h-11 items-center justify-center bg-[#11191f] px-6 font-display text-[13px] font-bold uppercase tracking-wide text-white"
        >
          Back to Shop
        </Link>
      </section>
    );
  }

  return <ProductPageClient product={product} />;
}

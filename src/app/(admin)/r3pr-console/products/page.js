import { Suspense } from "react";
import PageHeader from "@/components/admin/layout/PageHeader";
import ProductManager from "@/components/admin/products/ProductManager";

// The manager reads `?q=` via useSearchParams (the TopBar global search hands
// off a term). A client component using that hook must sit under a Suspense
// boundary or `next build` fails prerendering this route.
export const metadata = { title: "Products — Repair Console" };

export default function ProductsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Products"
        description="Add and manage every product in the catalog. Per-variant inventory, labels, materials, and visibility live on each row."
      />
      <Suspense fallback={null}>
        <ProductManager />
      </Suspense>
    </>
  );
}

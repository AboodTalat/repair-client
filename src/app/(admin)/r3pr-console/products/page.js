import PageHeader from "@/components/admin/layout/PageHeader";
import ProductManager from "@/components/admin/products/ProductManager";

export const metadata = { title: "Products — Repair Console" };

export default function ProductsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Products"
        description="Add and manage every product in the catalog. Per-variant inventory, labels, materials, and visibility live on each row."
      />
      <ProductManager />
    </>
  );
}

import PageHeader from "@/components/admin/layout/PageHeader";
import CategoryManager from "@/components/admin/categories/CategoryManager";

export const metadata = { title: "Categories — Repair Console" };

export default function CategoriesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Categories"
        description="Organise the storefront. Major categories appear in the top navigation; sub-categories drive filtering on /shop. Visibility toggles hide a row without deleting it."
      />
      <CategoryManager />
    </>
  );
}

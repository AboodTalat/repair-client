import PageHeader from "@/components/admin/layout/PageHeader";
import TaxonomyManager from "@/components/admin/taxonomies/TaxonomyManager";

export default function TaxonomiesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Taxonomies"
        description="Edit the filter facets (Materials + Types) customers see on the shop page."
      />
      <TaxonomyManager />
    </>
  );
}

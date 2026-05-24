import PageHeader from "@/components/admin/layout/PageHeader";
import StorefrontManager from "@/components/admin/storefront/StorefrontManager";

export default function StorefrontPage() {
  return (
    <>
      <PageHeader
        eyebrow="Insight"
        title="Storefront Content"
        description="Edit the hero, colorways, stats, browse tiles, product page sections, coaching cross-sell, and footer shown to customers."
      />
      <StorefrontManager />
    </>
  );
}

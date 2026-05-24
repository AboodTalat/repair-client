import PageHeader from "@/components/admin/layout/PageHeader";
import WishlistInsightsManager from "@/components/admin/wishlist-insights/WishlistInsightsManager";

export default function WishlistInsightsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Insight"
        title="Wishlist Insights"
        description="See which products customers want most. Notify holders when something restocks or goes on sale."
      />
      <WishlistInsightsManager />
    </>
  );
}

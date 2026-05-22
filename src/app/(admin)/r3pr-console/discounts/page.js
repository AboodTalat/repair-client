import PageHeader from "@/components/admin/layout/PageHeader";
import DiscountManager from "@/components/admin/discounts/DiscountManager";

export const metadata = { title: "Discounts — Repair Console" };

export default function DiscountsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Discounts"
        description="Automatic discounts on a product, sub-category, or major category. Each carries its own validity window — no code required at checkout."
      />
      <DiscountManager />
    </>
  );
}

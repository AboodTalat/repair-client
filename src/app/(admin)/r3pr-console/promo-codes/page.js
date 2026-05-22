import PageHeader from "@/components/admin/layout/PageHeader";
import PromoManager from "@/components/admin/promo/PromoManager";

export const metadata = { title: "Promo Codes — Repair Console" };

export default function PromoCodesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Promo Codes"
        description="Single-use or multi-use, fixed or percentage. Configure minimum order, usage limit, and expiry per code."
      />
      <PromoManager />
    </>
  );
}

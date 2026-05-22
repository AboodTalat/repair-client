import PageHeader from "@/components/admin/layout/PageHeader";
import OrderManager from "@/components/admin/orders/OrderManager";

export const metadata = { title: "Orders — Repair Console" };

export default function OrdersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Orders"
        description="Every incoming order lands here. Click any row to view items, update the status, or cancel."
      />
      <OrderManager />
    </>
  );
}

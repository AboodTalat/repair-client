import PageHeader from "@/components/admin/layout/PageHeader";
import DeliveryDashboard from "@/components/delivery/dashboard/DeliveryDashboard";

export default function DispatchDashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Dispatch"
        title="Assigned Orders"
        description="Every order admin handed over to you for delivery. Open one to view drop-off details, contact the customer, and update its status."
      />
      <DeliveryDashboard />
    </>
  );
}

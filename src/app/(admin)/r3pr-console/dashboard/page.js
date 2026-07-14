import PageHeader from "@/components/admin/layout/PageHeader";
import DashboardView from "@/components/admin/dashboard/DashboardView";

export const metadata = { title: "Dashboard — Repair Console" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Today"
        title="Dashboard"
        description="A live snapshot of how the store is performing — sales, orders, inventory, and customers."
      />
      <DashboardView />
    </>
  );
}

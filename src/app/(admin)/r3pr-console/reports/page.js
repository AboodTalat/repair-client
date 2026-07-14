import PageHeader from "@/components/admin/layout/PageHeader";
import ReportsView from "@/components/admin/reports/ReportsView";

export const metadata = { title: "Reports — Repair Console" };

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Insight"
        title="Reports"
        description="Live data across sales, revenue, promos, inventory, customers, delivery, and returns. Filter by date range and export any report as CSV."
      />
      <ReportsView />
    </>
  );
}

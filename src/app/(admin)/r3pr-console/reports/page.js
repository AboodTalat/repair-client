import PageHeader from "@/components/admin/layout/PageHeader";
import ReportsView from "@/components/admin/reports/ReportsView";

export const metadata = { title: "Reports — Repair Console" };

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Insight"
        title="Reports"
        description="Filter by date range, category, or product. Export any report as PDF or CSV."
      />
      <ReportsView />
    </>
  );
}

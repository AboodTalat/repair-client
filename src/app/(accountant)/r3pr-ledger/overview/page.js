import PageHeader from "@/components/admin/layout/PageHeader";
import FinanceOverview from "@/components/accountant/overview/FinanceOverview";

export default function FinanceOverviewPage() {
  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Financial Overview"
        description="Read-only view of revenue, orders, discounts, and category / product / time breakdowns. Pick a date range and export the visible report as PDF or CSV."
      />
      <FinanceOverview />
    </>
  );
}

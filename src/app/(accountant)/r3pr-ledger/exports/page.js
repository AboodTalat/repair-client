import PageHeader from "@/components/admin/layout/PageHeader";
import ExportHistory from "@/components/accountant/exports/ExportHistory";

export default function ExportHistoryPage() {
  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Export history"
        description="Every PDF and CSV report generated from the Financial Overview. Re-download a recent file or audit who exported what."
      />
      <ExportHistory />
    </>
  );
}

import PageHeader from "@/components/admin/layout/PageHeader";
import StockAlertManager from "@/components/admin/stock-alerts/StockAlertManager";

export default function StockAlertsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Stock Alerts"
        description="Customers who requested to be notified when an out-of-stock variant becomes available again."
      />
      <StockAlertManager />
    </>
  );
}

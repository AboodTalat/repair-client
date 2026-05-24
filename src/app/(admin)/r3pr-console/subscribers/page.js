import PageHeader from "@/components/admin/layout/PageHeader";
import SubscribersManager from "@/components/admin/subscribers/SubscribersManager";

export default function SubscribersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Insight"
        title="Newsletter Subscribers"
        description="Customers who opted in through the footer newsletter form or checkout."
      />
      <SubscribersManager />
    </>
  );
}

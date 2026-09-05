import { Suspense } from "react";
import PageHeader from "@/components/admin/layout/PageHeader";
import OrderManager from "@/components/admin/orders/OrderManager";

// The manager reads `?q=` via useSearchParams (the TopBar global search hands
// off a term). A client component using that hook must sit under a Suspense
// boundary or `next build` fails prerendering this route.
export const metadata = { title: "Orders — Repair Console" };

export default function OrdersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Orders"
        description="Every incoming order lands here. Click any row to view items, update the status, or cancel."
      />
      <Suspense fallback={null}>
        <OrderManager />
      </Suspense>
    </>
  );
}

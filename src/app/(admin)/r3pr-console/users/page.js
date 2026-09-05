import { Suspense } from "react";
import PageHeader from "@/components/admin/layout/PageHeader";
import UserManager from "@/components/admin/users/UserManager";

// The manager reads `?q=` via useSearchParams (the TopBar global search hands
// off a term). A client component using that hook must sit under a Suspense
// boundary or `next build` fails prerendering this route.
export const metadata = { title: "Users & Roles — Repair Console" };

export default function UsersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Users & Roles"
        description="Create and manage accounts across all four roles: Customer, Admin, Delivery, and Accounting. Toggle access without deleting the account."
      />
      <Suspense fallback={null}>
        <UserManager />
      </Suspense>
    </>
  );
}

import PageHeader from "@/components/admin/layout/PageHeader";
import UserManager from "@/components/admin/users/UserManager";

export const metadata = { title: "Users & Roles — Repair Console" };

export default function UsersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Users & Roles"
        description="Create and manage accounts across all four roles: Customer, Admin, Delivery, and Accounting. Toggle access without deleting the account."
      />
      <UserManager />
    </>
  );
}

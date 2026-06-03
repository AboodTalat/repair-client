import AdminShell from "@/components/admin/layout/AdminShell";
import RoleGuard from "@/components/auth/RoleGuard";

export const metadata = {
  title: "Repair — Console",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }) {
  return (
    <RoleGuard allow={["admin"]} requireAuth>
      <AdminShell>{children}</AdminShell>
    </RoleGuard>
  );
}

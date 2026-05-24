import AdminShell from "@/components/admin/layout/AdminShell";
import AuthGuard from "@/components/auth/AuthGuard";

export const metadata = {
  title: "Repair — Console",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }) {
  return (
    <AuthGuard>
      <AdminShell>{children}</AdminShell>
    </AuthGuard>
  );
}

import AdminShell from "@/components/admin/layout/AdminShell";

export const metadata = {
  title: "Repair — Console",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }) {
  return <AdminShell>{children}</AdminShell>;
}

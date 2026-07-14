import AdminShell from "@/components/admin/layout/AdminShell";
import RoleGuard from "@/components/auth/RoleGuard";

export const metadata = {
  title: "Repair — Console",
  robots: { index: false, follow: false },
  // Admin console PWA (scope "/r3pr-console/") — separate manifest + icons from
  // the storefront so it installs as its own home-screen app with its own push.
  manifest: "/manifest.admin.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "RE Console" },
  icons: {
    icon: "/icons/admin-192.png",
    apple: "/icons/admin-apple-180.png",
  },
};

export const viewport = {
  themeColor: "#11191f",
};

export default function AdminLayout({ children }) {
  return (
    <RoleGuard allow={["admin"]} requireAuth>
      <AdminShell>{children}</AdminShell>
    </RoleGuard>
  );
}

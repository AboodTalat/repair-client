import AccountantShell from "@/components/accountant/layout/AccountantShell";
import RoleGuard from "@/components/auth/RoleGuard";

export const metadata = {
  title: "Repair — Finance Ledger",
  robots: { index: false, follow: false },
};

export default function AccountantLayout({ children }) {
  return (
    <RoleGuard allow={["accounting"]} requireAuth>
      <AccountantShell>{children}</AccountantShell>
    </RoleGuard>
  );
}

import AccountantShell from "@/components/accountant/layout/AccountantShell";
import AuthGuard from "@/components/auth/AuthGuard";

export const metadata = {
  title: "Repair — Finance Ledger",
  robots: { index: false, follow: false },
};

export default function AccountantLayout({ children }) {
  return (
    <AuthGuard>
      <AccountantShell>{children}</AccountantShell>
    </AuthGuard>
  );
}

import AccountantShell from "@/components/accountant/layout/AccountantShell";

export const metadata = {
  title: "Repair — Finance Ledger",
  robots: { index: false, follow: false },
};

export default function AccountantLayout({ children }) {
  return <AccountantShell>{children}</AccountantShell>;
}

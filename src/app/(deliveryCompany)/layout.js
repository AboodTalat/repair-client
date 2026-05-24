import DeliveryShell from "@/components/delivery/layout/DeliveryShell";
import AuthGuard from "@/components/auth/AuthGuard";

export const metadata = {
  title: "Repair — Dispatch",
  robots: { index: false, follow: false },
};

export default function DeliveryLayout({ children }) {
  return (
    <AuthGuard>
      <DeliveryShell>{children}</DeliveryShell>
    </AuthGuard>
  );
}

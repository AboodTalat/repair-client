import DeliveryShell from "@/components/delivery/layout/DeliveryShell";
import RoleGuard from "@/components/auth/RoleGuard";

export const metadata = {
  title: "Repair — Dispatch",
  robots: { index: false, follow: false },
};

export default function DeliveryLayout({ children }) {
  return (
    <RoleGuard allow={["delivery"]} requireAuth>
      <DeliveryShell>{children}</DeliveryShell>
    </RoleGuard>
  );
}

import RoleGuard from "@/components/auth/RoleGuard";

// /account/* requires a signed-in CUSTOMER. (The parent (customer) layout
// already bounces signed-in stakeholders off every storefront page; this inner
// guard additionally requires authentication so guests are sent to /sign-in.)
export default function AccountLayout({ children }) {
  return (
    <RoleGuard allow={["customer"]} requireAuth>
      {children}
    </RoleGuard>
  );
}

import AuthGuard from "@/components/auth/AuthGuard";

export default function AccountLayout({ children }) {
  return <AuthGuard>{children}</AuthGuard>;
}

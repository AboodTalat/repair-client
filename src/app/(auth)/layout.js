import GuestGuard from "@/components/auth/GuestGuard";

export const metadata = {
  title: "Repair — Account",
};

export default function AuthLayout({ children }) {
  return (
    <GuestGuard>
      <div className="flex min-h-screen w-full items-stretch overflow-x-hidden bg-white text-[#11191f]">
        {children}
      </div>
    </GuestGuard>
  );
}

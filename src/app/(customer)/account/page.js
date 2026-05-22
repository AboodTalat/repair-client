import AccountClient from "@/components/customer/account/AccountClient";
import { PROFILE, PAYMENT_METHODS, ADDRESSES } from "@/lib/mockAccount";

// `/account` — customer account hub. Figma mobile 41:1742 + desktop 119:4965.
// AccountClient owns the toggleable `isDefault` state for payment methods +
// addresses at every breakpoint, and renders its own responsive switch
// internally so only one instance is mounted. Swap mock data for
// repairQuery(...) when the customer-scoped account resolvers land
// (addresses already exist server-side via addresses.ts).

export const metadata = {
  title: "Account — Repair",
};

export default function AccountPage() {
  return (
    <main className="w-full bg-white">
      <div className="mx-auto w-full max-w-[1440px] px-4 pt-4 pb-12 md:px-8 md:pt-6 md:pb-16">
        {/* Mobile heading */}
        <h1 className="pb-4 font-display text-[14px] font-medium text-[#11191f] md:hidden">
          ACCOUNT
        </h1>

        {/* Desktop heading */}
        <div className="hidden border-b border-[#f3f4f6] pb-[25px] md:block md:mb-10">
          <h1
            className="font-display text-[24px] font-bold uppercase leading-8 text-[#11191f]"
            style={{ letterSpacing: "-0.6px" }}
          >
            Account
          </h1>
        </div>

        <AccountClient
          profile={PROFILE}
          methods={PAYMENT_METHODS}
          addresses={ADDRESSES}
        />
      </div>
    </main>
  );
}

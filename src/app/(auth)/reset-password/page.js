import Image from "next/image";
import Link from "next/link";
import HeroPanel from "@/components/auth/HeroPanel";
import AuthHeader from "@/components/auth/AuthHeader";
import PasswordInput from "@/components/auth/PasswordInput";
import AuthButton from "@/components/auth/AuthButton";
import TermsFooter from "@/components/auth/TermsFooter";

export const metadata = { title: "Reset Password — Repair" };

export default function ResetPasswordPage() {
  return (
    <>
      <HeroPanel image="/auth/reset-password-desktop.png" quote="Redefine your limits." overlay="rgba(17,25,31,0.1)" />

      <main className="flex w-full min-w-0 flex-col bg-white md:w-[40%]">
        {/* Mobile: hero pulled to the very top, navbar overlaid (no background) */}
        <div className="relative md:hidden">
          <div className="relative aspect-[393/206] w-full overflow-hidden bg-[#f5f5f5]">
            <Image src="/auth/reset-password-mobile-top.png" alt="" fill priority sizes="100vw" className="object-cover" />
          </div>
          <div className="relative aspect-[393/226] w-full overflow-hidden bg-[#f5f5f5]">
            <Image src="/auth/reset-password-mobile-bottom.png" alt="" fill priority sizes="100vw" className="object-cover" />
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center px-4 py-5">
            <Link
              href="/sign-in"
              className="pointer-events-auto absolute left-4 top-1/2 -translate-y-1/2 font-display text-[10px] font-bold uppercase leading-[14px] tracking-[0.5px] text-[#11191f]"
            >
              Sign In / Sign Up
            </Link>
            <Link href="/" aria-label="Repair home" className="pointer-events-auto block">
              <Image
                src="/auth/blackLogo.png"
                alt="Repair"
                width={32}
                height={23}
                className="h-[23px] w-8 object-contain"
                priority
              />
            </Link>
          </div>
        </div>

        <AuthHeader
          mobileMode="none"
          desktopLinkText="Back to Login"
          desktopLinkHref="/sign-in"
        />

        <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 md:px-8 lg:px-16 xl:px-24">
          <div className="flex w-full max-w-[384px] flex-col gap-4">
            <h1 className="font-display text-[18px] font-bold uppercase leading-[36px] tracking-[0.75px] text-[#11191f]/50 md:text-[#11191f]">
              Reset Password
            </h1>

            <form className="flex w-full flex-col gap-5">
              <PasswordInput label="New Password" name="newPassword" autoComplete="new-password" required />
              <PasswordInput
                label="Confirm New Password"
                name="confirmNewPassword"
                autoComplete="new-password"
                required
              />
              <AuthButton>Reset Password</AuthButton>
            </form>

            <div className="flex items-center justify-center gap-1 pt-2">
              <span className="font-display text-[12px] font-semibold uppercase leading-[16px] tracking-[0.3px] text-[#11191f]">
                Didn&apos;t receive link?
              </span>
              <Link
                href="/email-sent"
                className="font-display text-[12px] font-semibold uppercase leading-[16px] tracking-[0.3px] text-[#11191f] underline"
              >
                Resend Link
              </Link>
            </div>
          </div>
        </div>

        <div className="hidden md:block">
          <TermsFooter>Secure password reset powered by RE Auth.</TermsFooter>
        </div>
      </main>
    </>
  );
}

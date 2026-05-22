import Link from "next/link";
import HeroPanel from "@/components/auth/HeroPanel";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthInput from "@/components/auth/AuthInput";
import PasswordInput from "@/components/auth/PasswordInput";
import PhoneInput from "@/components/auth/PhoneInput";
import AuthButton from "@/components/auth/AuthButton";
import GoogleButton from "@/components/auth/GoogleButton";
import Divider from "@/components/auth/Divider";
import TermsFooter from "@/components/auth/TermsFooter";

export const metadata = { title: "Sign Up — Repair" };

export default function SignUpPage() {
  return (
    <>
      <HeroPanel image="/auth/reset-password-desktop.png" quote="Define your movement." overlay="rgba(17,25,31,0.1)" />

      <main className="flex w-full min-w-0 flex-col bg-white md:w-[40%]">
        <AuthHeader
          mobileLinkText="Sign In"
          mobileLinkHref="/sign-in"
          desktopPromptText="Already have an account?"
          desktopLinkText="Sign In"
          desktopLinkHref="/sign-in"
        />

        <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 md:px-8 lg:px-16 xl:px-24">
          <div className="flex w-full max-w-[384px] flex-col">
            <div className="pb-8 md:pb-10">
              <h1 className="font-display text-[22px] font-bold uppercase leading-[28px] tracking-[-0.5px] md:text-[32px] md:leading-[48px] md:tracking-[-1.2px]">
                <span className="block">
                  <span className="text-[#11191f]/50">Step Into</span>
                  <span className="text-[#11191f]"> Energy</span>
                </span>
                <span className="block">
                  <span className="text-[#11191f]/50">Step Into</span>
                  <span className="text-[#11191f]"> Luxury</span>
                </span>
              </h1>
            </div>

            <div className="pb-8">
              <GoogleButton>Sign up with Google</GoogleButton>
            </div>

            <div className="pb-8">
              <Divider />
            </div>

            <form className="flex w-full flex-col gap-5">
              <AuthInput label="Email Address" type="email" name="email" autoComplete="email" required />
              <PhoneInput name="phone" required />
              <PasswordInput label="Password" name="password" autoComplete="new-password" required />
              <PasswordInput label="Confirm Password" name="confirmPassword" autoComplete="new-password" required />
              <AuthButton>Sign Up</AuthButton>
            </form>
          </div>
        </div>

        <div className="hidden md:block">
          <TermsFooter>
            By signing up, you agree to our{" "}
            <Link href="#" className="underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="#" className="underline">
              Privacy Policy
            </Link>
            .
          </TermsFooter>
        </div>
      </main>
    </>
  );
}
